// The pipeline service. The scheduler + worker live in `worker.ts` (run with
// `pnpm --filter @observatory/pipeline worker`, needs Redis + Postgres + a
// GitHub App credential). Library exports below are used by the worker and tests.
export {
  scoreAndPersist,
  computeTrend,
  type ScoreAndPersistParams,
} from "./score";
export { refreshPackage } from "./refresh";
export { revalidatePaths } from "./revalidate";
export { log } from "./observability";
export { CADENCE, cadenceFits, DAY, WEEK } from "./schedule/cadence";
