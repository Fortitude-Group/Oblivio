export function compact(n: number | null | undefined): string {
  if (n === null || n === undefined) return "n/a";
  return new Intl.NumberFormat("en-GB", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function relativeTime(input: string | Date | null): string {
  if (!input) return "unknown";
  const d = typeof input === "string" ? new Date(input) : input;
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  const rem = Math.floor((days % 365) / 30);
  return rem >= 6
    ? `${years}.5 years ago`
    : `${years} year${years === 1 ? "" : "s"} ago`;
}

// Some registries dump the entire licence text into the declared-licence field
// (e.g. pandas ships the full BSD 3-Clause text). This stat wants a short label,
// so take the first meaningful line and cap it.
export function shortLicense(input: string | null | undefined): string {
  if (!input) return "n/a";
  const firstLine = input
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return "n/a";
  return firstLine.length > 40 ? `${firstLine.slice(0, 39).trimEnd()}…` : firstLine;
}

export function fullDate(input: string | Date | null): string {
  if (!input) return "n/a";
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
