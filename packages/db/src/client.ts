import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDb>["db"];

export const DEFAULT_DEV_URL =
  "postgres://observatory:observatory@localhost:5432/observatory";

/**
 * Create a database handle.
 *
 * Uses postgres.js. For a scale-to-zero serverless production target (Neon on
 * Azure, keeping cost near zero until there is traffic), swap this driver for
 * `drizzle-orm/neon-http` + `@neondatabase/serverless`; the schema, queries, and
 * repositories are unchanged. Keeping the pool small suits a serverless backend.
 */
export function createDb(url: string | undefined = process.env.DATABASE_URL) {
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set (dev default: " + DEFAULT_DEV_URL + ")",
    );
  }
  const sql = postgres(url, { max: Number(process.env.DB_POOL_MAX ?? 5) });
  const db = drizzle(sql, { schema });
  return { db, sql };
}
