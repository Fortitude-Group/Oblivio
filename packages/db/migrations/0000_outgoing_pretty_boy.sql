CREATE TYPE "public"."confidence" AS ENUM('high', 'medium', 'insufficient_data');--> statement-breakpoint
CREATE TYPE "public"."edge_kind" AS ENUM('runtime', 'dev', 'optional');--> statement-breakpoint
CREATE TYPE "public"."repo_access_state" AS ENUM('ok', 'rate_limited', 'private', 'not_found', 'error');--> statement-breakpoint
CREATE TYPE "public"."repo_host" AS ENUM('github', 'gitlab');--> statement-breakpoint
CREATE TYPE "public"."trend_direction" AS ENUM('improving', 'stable', 'declining');--> statement-breakpoint
CREATE TYPE "public"."validation_label" AS ENUM('abandoned', 'active', 'finished_healthy');--> statement-breakpoint
CREATE TYPE "public"."verdict" AS ENUM('actively_maintained', 'stable_low_activity', 'slowing_down', 'at_risk', 'archived', 'insufficient_data');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ecosystems" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"homepage_url" text,
	"enabled" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ecosystem_id" text NOT NULL,
	"name" text NOT NULL,
	"declared_repo_url" text,
	"resolved_repo_id" uuid,
	"declared_license" text,
	"latest_version" text,
	"latest_release_at" timestamp with time zone,
	"download_count" bigint DEFAULT 0 NOT NULL,
	"direct_dependents_count" integer DEFAULT 0 NOT NULL,
	"transitive_dependents_count" integer DEFAULT 0 NOT NULL,
	"is_deprecated" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"in_universe" boolean DEFAULT false NOT NULL,
	"universe_rank" integer,
	"last_ingested_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host" "repo_host" NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"default_branch" text,
	"created_at" timestamp with time zone,
	"pushed_at" timestamp with time zone,
	"last_commit_at" timestamp with time zone,
	"open_issues" integer,
	"median_issue_response_hours" double precision,
	"open_prs" integer,
	"median_pr_merge_hours" double precision,
	"contributor_count" integer,
	"bus_factor" integer,
	"top_contributor_share" double precision,
	"last_active_maintainer_at" timestamp with time zone,
	"looking_for_maintainer" boolean DEFAULT false NOT NULL,
	"etag" text,
	"last_conditional_fetch_at" timestamp with time zone,
	"access_state" "repo_access_state" DEFAULT 'ok' NOT NULL,
	"last_error_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dependency_edges" (
	"ecosystem_id" text NOT NULL,
	"from_package_id" uuid NOT NULL,
	"to_package_id" uuid NOT NULL,
	"edge_kind" "edge_kind" NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "score_daily" (
	"package_id" uuid NOT NULL,
	"day" date NOT NULL,
	"overall_score" double precision,
	"verdict" "verdict" NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "score_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"computed_at" timestamp with time zone NOT NULL,
	"ingest_run_id" text NOT NULL,
	"verdict" "verdict" NOT NULL,
	"overall_score" double precision,
	"confidence" "confidence" NOT NULL,
	"signal_breakdown" jsonb NOT NULL,
	"trend_direction" "trend_direction"
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leaderboards" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"query_definition" jsonb NOT NULL,
	"inclusion_note" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "validation_labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_ref" text NOT NULL,
	"label" "validation_label" NOT NULL,
	"rationale" text NOT NULL,
	"source_snapshot_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "working_universes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"built_at" timestamp with time zone NOT NULL,
	"ingest_run_id" text NOT NULL,
	"ecosystem_id" text NOT NULL,
	"criteria_version" text NOT NULL,
	"members" jsonb NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "packages" ADD CONSTRAINT "packages_ecosystem_id_ecosystems_id_fk" FOREIGN KEY ("ecosystem_id") REFERENCES "public"."ecosystems"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "packages" ADD CONSTRAINT "packages_resolved_repo_id_repositories_id_fk" FOREIGN KEY ("resolved_repo_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dependency_edges" ADD CONSTRAINT "dependency_edges_ecosystem_id_ecosystems_id_fk" FOREIGN KEY ("ecosystem_id") REFERENCES "public"."ecosystems"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dependency_edges" ADD CONSTRAINT "dependency_edges_from_package_id_packages_id_fk" FOREIGN KEY ("from_package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dependency_edges" ADD CONSTRAINT "dependency_edges_to_package_id_packages_id_fk" FOREIGN KEY ("to_package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "score_daily" ADD CONSTRAINT "score_daily_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "score_snapshots" ADD CONSTRAINT "score_snapshots_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "working_universes" ADD CONSTRAINT "working_universes_ecosystem_id_ecosystems_id_fk" FOREIGN KEY ("ecosystem_id") REFERENCES "public"."ecosystems"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "packages_ecosystem_name" ON "packages" USING btree ("ecosystem_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "packages_in_universe" ON "packages" USING btree ("in_universe","universe_rank");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "repositories_host_owner_name" ON "repositories" USING btree ("host","owner","name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dependency_edges_unique" ON "dependency_edges" USING btree ("from_package_id","to_package_id","edge_kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dependency_edges_to" ON "dependency_edges" USING btree ("to_package_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "score_daily_package_day" ON "score_daily" USING btree ("package_id","day");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "score_snapshots_package_time" ON "score_snapshots" USING btree ("package_id","computed_at" DESC NULLS LAST);