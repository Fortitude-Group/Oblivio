/**
 * Fleet/vehicle-telematics exclusion (FR-034). Hand-picked examples and copy
 * must not use fleet or vehicle-telematics packages. Scans code and seed lists
 * (not the design docs, which legitimately state this very rule).
 */
import { walk, scan } from "./_walk";

const BANNED =
  /\b(fleet management|fleet tracking|fleet telematics|vehicle telematics|vehicle tracking|gps fleet|telematics)\b/i;

const files = [
  ...walk("apps/web", [".ts", ".tsx"]),
  ...walk("packages", [".ts"]),
  ...walk("services", [".ts"]),
  ...walk("scripts", [".ts"]),
].filter((f) => !/scripts[\\/]check-/.test(f)); // the guards name the terms

const hits = scan(files, BANNED);
if (hits.length > 0) {
  console.error("Telematics-exclusion check FAILED (FR-034):");
  for (const h of hits) console.error(`  ${h.file}:${h.line}  ${h.text}`);
  process.exit(1);
}
console.log(`Telematics-exclusion check passed (${files.length} files scanned).`);
