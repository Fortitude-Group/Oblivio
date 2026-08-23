/**
 * Read-only observation guard (FR-031). The Observatory never writes to a
 * repository, opens issues/PRs, or contacts maintainers. This fails the build if
 * the ingestion layer makes any mutating request to a repo host. The one allowed
 * write is minting a GitHub App installation token (auth, not a repo mutation).
 */
import { walk } from "./_walk";
import { readFileSync } from "node:fs";

const WRITE_METHOD = /method:\s*["'](POST|PUT|PATCH|DELETE)["']/g;

const files = walk("packages/ingestion/src", [".ts"]);
const violations: string[] = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);
  lines.forEach((line, i) => {
    let m: RegExpExecArray | null;
    WRITE_METHOD.lastIndex = 0;
    while ((m = WRITE_METHOD.exec(line)) !== null) {
      const method = m[1]!.toUpperCase();
      const allowed =
        method === "POST" &&
        file.replace(/\\/g, "/").endsWith("github/auth.ts");
      if (!allowed) {
        violations.push(`${file}:${i + 1}  ${method}  ${line.trim()}`);
      }
    }
  });
}

if (violations.length > 0) {
  console.error("Read-only guard FAILED (FR-031). Mutating repo-host calls:");
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log(
  `Read-only guard passed (${files.length} ingestion files; only the App token mint writes).`,
);
