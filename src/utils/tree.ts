// Tree traversal utilities — reusable across domains with hierarchical data.

/** Collect all unique values of a string-array field from a tree. */
export function collectFieldValues<
  T extends { children?: T[] },
>(
  nodes: T[],
  extract: (node: T) => string[],
): string[] {
  const values = new Set<string>();
  const walk = (list: T[]) => {
    for (const n of list) {
      for (const v of extract(n)) values.add(v);
      if (n.children) walk(n.children);
    }
  };
  walk(nodes);
  return [...values].sort();
}
