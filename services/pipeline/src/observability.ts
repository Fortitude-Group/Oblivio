/**
 * Structured logging (Principle IV). One JSON object per line, so a run and a
 * package can be traced through the pipeline. Also carries the rate-limited /
 * last-known-value fallback state that the repo adapters report (FR-013).
 */
export function log(event: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...fields }));
}
