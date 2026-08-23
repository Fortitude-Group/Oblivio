import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  ".git",
  "coverage",
  "migrations",
]);

/** Recursively collect files under `dir` with one of the given extensions. */
export function walk(dir: string, exts: string[], out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, exts, out);
    else if (exts.some((x) => p.endsWith(x))) out.push(p);
  }
  return out;
}

export interface Hit {
  file: string;
  line: number;
  text: string;
}

export function scan(files: string[], re: RegExp): Hit[] {
  const hits: Hit[] = [];
  for (const file of files) {
    const content = readFile(file);
    content.split(/\r?\n/).forEach((text, i) => {
      if (re.test(text)) hits.push({ file, line: i + 1, text: text.trim() });
    });
  }
  return hits;
}

import { readFileSync } from "node:fs";
function readFile(f: string): string {
  try {
    return readFileSync(f, "utf8");
  } catch {
    return "";
  }
}
