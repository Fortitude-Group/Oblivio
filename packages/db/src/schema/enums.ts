import { pgEnum } from "drizzle-orm/pg-core";

/** Fixed vocabularies, mirrored from @observatory/core and data-model.md. */

export const verdictEnum = pgEnum("verdict", [
  "actively_maintained",
  "stable_low_activity",
  "slowing_down",
  "at_risk",
  "archived",
  "insufficient_data",
]);

export const confidenceEnum = pgEnum("confidence", [
  "high",
  "medium",
  "insufficient_data",
]);

export const trendEnum = pgEnum("trend_direction", [
  "improving",
  "stable",
  "declining",
]);

export const repoHostEnum = pgEnum("repo_host", ["github", "gitlab"]);

export const repoAccessEnum = pgEnum("repo_access_state", [
  "ok",
  "rate_limited",
  "private",
  "not_found",
  "error",
]);

export const edgeKindEnum = pgEnum("edge_kind", ["runtime", "dev", "optional"]);

export const validationLabelEnum = pgEnum("validation_label", [
  "abandoned",
  "active",
  "finished_healthy",
]);
