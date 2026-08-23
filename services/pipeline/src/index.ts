// The pipeline service. The score-and-persist spine (below) is implemented and
// tested; the BullMQ scheduler and the ingest/refresh jobs (T030, and the
// registry/repo halves of T031) are pending and need Redis + live registry/repo
// APIs. See specs/001-abandoned-package-observatory/tasks.md.
export {
  scoreAndPersist,
  computeTrend,
  type ScoreAndPersistParams,
} from "./score";
