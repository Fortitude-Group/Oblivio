import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { DEFAULT_DEV_URL } from "./client";

const url = process.env.DATABASE_URL ?? DEFAULT_DEV_URL;
const here = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(here, "..", "migrations");

const sql = postgres(url, { max: 1 });
await migrate(drizzle(sql), { migrationsFolder });
await sql.end();
console.log("Migrations applied from", migrationsFolder);
