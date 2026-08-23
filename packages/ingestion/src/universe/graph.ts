export interface Edge {
  /** The dependent package. */
  from: string;
  /** The dependency it relies on. */
  to: string;
}

/**
 * Count the transitive dependents of every node: how many other packages, directly
 * or indirectly, depend on it (FR-003). This is reverse reachability over the
 * dependency edges, computed within the given node set. Cycles are handled by the
 * visited set; a node never counts itself.
 */
export function transitiveDependentsCounts(
  nodes: string[],
  edges: Edge[],
): Map<string, number> {
  const reverse = new Map<string, string[]>();
  for (const n of nodes) reverse.set(n, []);
  for (const e of edges) {
    if (reverse.has(e.to) && reverse.has(e.from))
      reverse.get(e.to)!.push(e.from);
  }

  const counts = new Map<string, number>();
  for (const target of nodes) {
    const seen = new Set<string>();
    const stack = [...(reverse.get(target) ?? [])];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const parent of reverse.get(cur) ?? []) {
        if (!seen.has(parent)) stack.push(parent);
      }
    }
    seen.delete(target); // a package is never its own dependent (cycles)
    counts.set(target, seen.size);
  }
  return counts;
}
