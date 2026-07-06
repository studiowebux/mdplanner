/**
 * Unit tests for src/utils/tree.ts — collectFieldValues over hierarchical data.
 */

import { assertEquals } from "@std/assert";
import { collectFieldValues } from "../../src/utils/tree.ts";

type Node = { tags: string[]; children?: Node[] };

Deno.test("collectFieldValues — flat list, sorted unique", () => {
  const nodes: Node[] = [
    { tags: ["b", "a"] },
    { tags: ["a", "c"] },
  ];
  assertEquals(collectFieldValues(nodes, (n) => n.tags), ["a", "b", "c"]);
});

Deno.test("collectFieldValues — descends into nested children", () => {
  const nodes: Node[] = [
    {
      tags: ["root"],
      children: [
        { tags: ["child1"] },
        {
          tags: ["child2"],
          children: [{ tags: ["grandchild"] }],
        },
      ],
    },
  ];
  assertEquals(collectFieldValues(nodes, (n) => n.tags), [
    "child1",
    "child2",
    "grandchild",
    "root",
  ]);
});

Deno.test("collectFieldValues — de-duplicates across the tree", () => {
  const nodes: Node[] = [
    { tags: ["shared"], children: [{ tags: ["shared", "unique"] }] },
    { tags: ["shared"] },
  ];
  assertEquals(collectFieldValues(nodes, (n) => n.tags), ["shared", "unique"]);
});

Deno.test("collectFieldValues — empty extracts and empty input", () => {
  assertEquals(collectFieldValues([] as Node[], (n) => n.tags), []);
  const emptyTagged: Node[] = [{ tags: [] }, { tags: [] }];
  assertEquals(collectFieldValues(emptyTagged, (n) => n.tags), []);
});
