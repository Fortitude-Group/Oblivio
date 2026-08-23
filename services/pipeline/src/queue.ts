import { Queue } from "bullmq";
import IORedis from "ioredis";

export const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6380";

export const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const REFRESH_QUEUE = "observatory-refresh";

export interface RefreshJob {
  ecosystem: "npm" | "pypi";
  name: string;
}

export const refreshQueue = new Queue<RefreshJob>(REFRESH_QUEUE, { connection });
