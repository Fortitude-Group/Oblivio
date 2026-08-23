import type { RepoActivity, HarmSignals } from "@observatory/scoring-engine";
import type { RepoRef } from "../resolve";

export type RepoAccessState =
  "ok" | "rate_limited" | "private" | "not_found" | "error";

export interface RepoFetchResult {
  activity: RepoActivity | null;
  accessState: RepoAccessState;
  /** Mined harm signals, or null when a host does not mine them. */
  harm?: HarmSignals | null;
}

export interface RepoHostAdapter {
  host: "github" | "gitlab";
  fetchActivity(ref: RepoRef, asOf: string): Promise<RepoFetchResult>;
}

export type { RepoRef };
