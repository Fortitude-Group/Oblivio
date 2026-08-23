import { createDb, type Database } from "@observatory/db";

// Reuse one pooled connection across requests / HMR reloads in dev.
const globalForDb = globalThis as unknown as {
  __obsDb?: ReturnType<typeof createDb>;
};

export function getDb(): Database {
  if (!globalForDb.__obsDb) globalForDb.__obsDb = createDb();
  return globalForDb.__obsDb.db;
}
