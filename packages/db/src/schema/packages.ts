import {
  pgTable,
  text,
  boolean,
  integer,
  bigint,
  timestamp,
  doublePrecision,
  uuid,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { repoHostEnum, repoAccessEnum } from "./enums";

/** A registry universe: npm, pypi, ... (data-model: Ecosystem). */
export const ecosystems = pgTable("ecosystems", {
  id: text("id").primaryKey(), // "npm" | "pypi" | ...
  displayName: text("display_name").notNull(),
  homepageUrl: text("homepage_url"),
  enabled: boolean("enabled").notNull().default(false),
});

/** A resolved source repository carrying activity signals (data-model: Repository). */
export const repositories = pgTable(
  "repositories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    host: repoHostEnum("host").notNull(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    isArchived: boolean("is_archived").notNull().default(false),
    defaultBranch: text("default_branch"),
    createdAt: timestamp("created_at", { withTimezone: true }),
    pushedAt: timestamp("pushed_at", { withTimezone: true }),
    // Activity aggregates (refreshed on the repo cadence).
    lastCommitAt: timestamp("last_commit_at", { withTimezone: true }),
    openIssues: integer("open_issues"),
    medianIssueResponseHours: doublePrecision("median_issue_response_hours"),
    openPrs: integer("open_prs"),
    medianPrMergeHours: doublePrecision("median_pr_merge_hours"),
    contributorCount: integer("contributor_count"),
    busFactor: integer("bus_factor"),
    topContributorShare: doublePrecision("top_contributor_share"),
    lastActiveMaintainerAt: timestamp("last_active_maintainer_at", {
      withTimezone: true,
    }),
    lookingForMaintainer: boolean("looking_for_maintainer")
      .notNull()
      .default(false),
    // Conditional-request caching + access state (research item 2, FR-013).
    etag: text("etag"),
    lastConditionalFetchAt: timestamp("last_conditional_fetch_at", {
      withTimezone: true,
    }),
    accessState: repoAccessEnum("access_state").notNull().default("ok"),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("repositories_host_owner_name").on(t.host, t.owner, t.name),
  ],
);

/** A single library within an ecosystem (data-model: Package). */
export const packages = pgTable(
  "packages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ecosystemId: text("ecosystem_id")
      .notNull()
      .references(() => ecosystems.id),
    name: text("name").notNull(),
    declaredRepoUrl: text("declared_repo_url"),
    resolvedRepoId: uuid("resolved_repo_id").references(() => repositories.id),
    declaredLicense: text("declared_license"),
    latestVersion: text("latest_version"),
    latestReleaseAt: timestamp("latest_release_at", { withTimezone: true }),
    downloadCount: bigint("download_count", { mode: "number" })
      .notNull()
      .default(0),
    directDependentsCount: integer("direct_dependents_count")
      .notNull()
      .default(0),
    transitiveDependentsCount: integer("transitive_dependents_count")
      .notNull()
      .default(0),
    isDeprecated: boolean("is_deprecated").notNull().default(false),
    isArchived: boolean("is_archived").notNull().default(false),
    inUniverse: boolean("in_universe").notNull().default(false),
    universeRank: integer("universe_rank"),
    lastIngestedAt: timestamp("last_ingested_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("packages_ecosystem_name").on(t.ecosystemId, t.name),
    index("packages_in_universe").on(t.inUniverse, t.universeRank),
  ],
);
