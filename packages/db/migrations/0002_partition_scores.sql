-- Convert score_snapshots to monthly RANGE partitioning on computed_at, so
-- inserts and queries stay flat as history grows to tens of thousands of
-- packages, and whole old months can be dropped in one operation.
--
-- On a fresh database there is no data to migrate. The append-only guard
-- (forbid_mutation, migration 0001) is re-applied to the partitioned parent.

DROP TRIGGER IF EXISTS score_snapshots_append_only ON score_snapshots;
DROP TABLE IF EXISTS score_snapshots CASCADE;

CREATE TABLE score_snapshots (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  package_id uuid NOT NULL REFERENCES packages(id),
  computed_at timestamptz NOT NULL,
  ingest_run_id text NOT NULL,
  verdict verdict NOT NULL,
  overall_score double precision,
  confidence confidence NOT NULL,
  signal_breakdown jsonb NOT NULL,
  trend_direction trend_direction,
  PRIMARY KEY (id, computed_at)
) PARTITION BY RANGE (computed_at);

CREATE INDEX score_snapshots_package_time
  ON score_snapshots (package_id, computed_at DESC);

CREATE TRIGGER score_snapshots_append_only
  BEFORE UPDATE OR DELETE ON score_snapshots
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- Ensure the monthly partition covering a given day exists. Idempotent, so the
-- pipeline can call it before every insert without cost after the first.
CREATE OR REPLACE FUNCTION ensure_month_partition(p_day date) RETURNS void AS $$
DECLARE
  start_date date := date_trunc('month', p_day)::date;
  end_date date := (date_trunc('month', p_day) + interval '1 month')::date;
  part_name text := 'score_snapshots_' || to_char(start_date, 'YYYYMM');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = part_name) THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF score_snapshots FOR VALUES FROM (%L) TO (%L)',
      part_name, start_date, end_date
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Retention: drop raw-snapshot partitions older than keep_months. The daily
-- rollup (score_daily) is kept forever, so trends survive the pruning. DROP of a
-- partition is DDL, not a row DELETE, so the append-only trigger does not block
-- it. Run this from a scheduled job.
CREATE OR REPLACE FUNCTION prune_snapshot_partitions(keep_months int)
  RETURNS int AS $$
DECLARE
  cutoff date := (date_trunc('month', CURRENT_DATE) - (keep_months || ' months')::interval)::date;
  cutoff_name text := 'score_snapshots_' || to_char(cutoff, 'YYYYMM');
  r record;
  dropped int := 0;
BEGIN
  FOR r IN
    SELECT relname FROM pg_class
    WHERE relname ~ '^score_snapshots_[0-9]{6}$' AND relname < cutoff_name
  LOOP
    EXECUTE format('DROP TABLE %I', r.relname);
    dropped := dropped + 1;
  END LOOP;
  RETURN dropped;
END;
$$ LANGUAGE plpgsql;

-- Create the partitions for this month and the next two, so inserts land
-- immediately on a fresh install.
SELECT ensure_month_partition(CURRENT_DATE);
SELECT ensure_month_partition((CURRENT_DATE + interval '1 month')::date);
SELECT ensure_month_partition((CURRENT_DATE + interval '2 months')::date);
