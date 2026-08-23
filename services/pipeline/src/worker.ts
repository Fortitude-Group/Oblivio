import { Worker } from "bullmq";
import type { Ecosystem } from "@observatory/core";
import { createDb, listInUniverse } from "@observatory/db";
import { connection, refreshQueue, REFRESH_QUEUE, type RefreshJob } from "./queue";
import { refreshPackage } from "./refresh";
import { revalidatePaths } from "./revalidate";
import { CADENCE } from "./schedule/cadence";
import { log } from "./observability";

const { db } = createDb();

/**
 * The refresh worker: for each queued package, run the ingest → score → persist
 * sequence, then revalidate the pages it affects. Concurrency is bounded to stay
 * a good API citizen (research item 2).
 */
const worker = new Worker<RefreshJob>(
  REFRESH_QUEUE,
  async (job) => {
    const { ecosystem, name } = job.data;
    // The repeatable heartbeat re-enqueues the whole universe on its cadence.
    if (name === "__heartbeat__") {
      await enqueueUniverse();
      return "reenqueued";
    }
    const out = await refreshPackage(db, ecosystem, name);
    if (out) {
      await revalidatePaths([`/${ecosystem}/${name}`, `/${ecosystem}`, "/"]);
      return out.result.verdict;
    }
    return "skipped";
  },
  { connection, concurrency: 4 },
);

worker.on("completed", (job, res) =>
  log("job.completed", { id: job.id, name: job.data.name, verdict: res }),
);
worker.on("failed", (job, err) =>
  log("job.failed", { id: job?.id, name: job?.data.name, error: err.message }),
);

/** Enqueue a refresh for every package currently in the working universe. */
async function enqueueUniverse(limit?: number): Promise<number> {
  const pkgs = await listInUniverse(db);
  const slice = limit ? pkgs.slice(0, limit) : pkgs;
  for (const p of slice) {
    await refreshQueue.add(
      "refresh",
      { ecosystem: p.ecosystemId as Ecosystem, name: p.name },
      { removeOnComplete: true, removeOnFail: 100 },
    );
  }
  log("scheduler.enqueued", { count: slice.length });
  return slice.length;
}

async function main() {
  // A repeatable heartbeat re-enqueues the universe on the deep-repo cadence.
  await refreshQueue.upsertJobScheduler(
    "universe-refresh",
    { every: CADENCE.deepRepo },
    { name: "heartbeat", data: { ecosystem: "npm", name: "__heartbeat__" } },
  );

  // Enqueue immediately on start so the worker has work. A LIMIT env keeps
  // demo/dev runs short.
  const limit = process.env.REFRESH_LIMIT ? Number(process.env.REFRESH_LIMIT) : undefined;
  await enqueueUniverse(limit);
  log("worker.ready", { redis: process.env.REDIS_URL ?? "redis://localhost:6380" });
}

main().catch((e) => {
  log("worker.fatal", { error: String(e) });
  process.exit(1);
});
