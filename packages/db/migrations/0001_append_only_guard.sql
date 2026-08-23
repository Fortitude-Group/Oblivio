-- Append-only guard for score history (FR-011, constitution Principle X).
-- Score snapshots are the irreversible record of a package's health over time.
-- Block UPDATE and DELETE at the database so a wrong query cannot rewrite or
-- erase history; new runs may only INSERT. (TRUNCATE/DROP remain guarded at the
-- privilege/infrastructure level, not here, so test setup can reset the table.)

CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'score_snapshots is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER score_snapshots_append_only
BEFORE UPDATE OR DELETE ON score_snapshots
FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
