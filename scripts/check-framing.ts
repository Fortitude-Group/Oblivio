/**
 * No-blame framing guard (FR-030). Abandonment is never a maintainer's moral
 * failing. This fails the build if user-facing copy shames or blames the people
 * behind a package. It scans the web copy and the verdict/methodology wording.
 */
import { walk, scan } from "./_walk";

const BLAME =
  /\b(lazy|negligent|incompetent|deadbeat|irresponsible|useless maintainers?|the maintainers?'? fault|shame on|slacking|couldn'?t be bothered|neglectful)\b/i;

const files = [
  ...walk("apps/web/app", [".ts", ".tsx"]),
  ...walk("apps/web/lib", [".ts"]),
  ...walk("apps/web/components", [".tsx"]),
].filter((f) => !f.includes("api/CHANGELOG"));

const hits = scan(files, BLAME);
if (hits.length > 0) {
  console.error("No-blame framing check FAILED (FR-030). Blaming language:");
  for (const h of hits) console.error(`  ${h.file}:${h.line}  ${h.text}`);
  process.exit(1);
}
console.log(`No-blame framing check passed (${files.length} files scanned).`);
