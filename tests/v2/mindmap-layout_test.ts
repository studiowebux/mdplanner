/**
 * Unit tests for the pure mindmap layout geometry (src/static/js/mindmap-layout.js).
 *
 * Regression guard for the "siblings overlap at 4+ children" bug
 * (task_1780374041715_6sxn): the old renderer used two disagreeing vertical
 * formulas — a leaf-span of `n*NODE_H + (n-1)*V_GAP` for centering vs a
 * child-advance of `+V_GAP*2` per node — so a parent reserved less height than
 * its children consumed. The shortfall `(n-1)*V_GAP` was masked by NODE_H slack
 * at n<=3 and overlapped at n>=4.
 *
 * The fix is a single per-leaf pitch (ROW_PITCH = NODE_H + V_GAP) from which
 * every span and advance is derived. These tests pin the two invariants that
 * guarantee no overlap and aligned connectors:
 *   1. layoutBranch's return value == the vertical extent its subtree consumed.
 *   2. a node's _y == the exact center of its occupied band.
 *
 * The module is a classic browser script that assigns globalThis.MindmapLayout;
 * importing it for side effects runs the IIFE so the test can read it.
 */

import { assert, assertEquals } from "@std/assert";
import "../../src/static/js/mindmap-layout.js";

type MmNode = {
  text?: string;
  children?: MmNode[];
  _collapsed?: boolean;
  _hidden?: boolean;
  _x?: number;
  _y?: number;
  _dir?: number;
};

type LayoutApi = {
  COL_W: number;
  NODE_H: number;
  V_GAP: number;
  ROW_PITCH: number;
  leaves: (n: MmNode) => number;
  layoutBranch: (n: MmNode, depth: number, dir: number, y0: number) => number;
  layout: (root: MmNode) => void;
};

const ML = (globalThis as unknown as { MindmapLayout: LayoutApi })
  .MindmapLayout;

const { NODE_H, V_GAP, ROW_PITCH, leaves, layoutBranch, layout } = ML;

/** n leaf children. */
function kids(n: number): MmNode[] {
  return Array.from({ length: n }, (_, i) => ({ text: `c${i}` }));
}

/** Collect leaf-node _y centers in top-to-bottom order. */
function leafCenters(node: MmNode, out: number[] = []): number[] {
  if (node._collapsed || !node.children || !node.children.length) {
    out.push(node._y as number);
  } else {
    for (const c of node.children) leafCenters(c, out);
  }
  return out;
}

Deno.test("ROW_PITCH is the single source of truth (NODE_H + V_GAP)", () => {
  assertEquals(ROW_PITCH, NODE_H + V_GAP);
});

Deno.test("leaves() counts leaf descendants, collapsed/leaf = 1", () => {
  assertEquals(leaves({ text: "leaf" }), 1);
  assertEquals(leaves({ text: "p", children: kids(4) }), 4);
  assertEquals(
    leaves({
      text: "p",
      children: [{ text: "a", children: kids(3) }, { text: "b" }],
    }),
    4,
  );
  assertEquals(
    leaves({ text: "p", _collapsed: true, children: kids(9) }),
    1,
    "collapsed subtree reserves a single row",
  );
});

Deno.test("layoutBranch return value equals the extent the subtree consumed", () => {
  // This is the exact invariant the old code violated: a parent must reserve
  // precisely what its children occupy, so the next sibling never starts early.
  for (const n of [1, 2, 3, 4, 8]) {
    const parent: MmNode = { text: "p", children: kids(n) };
    const end = layoutBranch(parent, 1, 1, 0);
    assertEquals(end, n * ROW_PITCH, `parent x${n}: reserved extent`);

    // ...and that extent equals where the last child's band actually ends.
    const last = parent.children![n - 1];
    const lastBandBottom = (last._y as number) + ROW_PITCH / 2;
    assertEquals(end, lastBandBottom, `parent x${n}: no shortfall vs children`);
  }
});

Deno.test("a node _y is the exact center of its occupied band", () => {
  // Guarantees the bracket connector (junction spans first..last child _y and
  // meets the parent at parent._y) stays aligned for any child count.
  const y0 = 17; // arbitrary non-zero origin
  for (const n of [1, 2, 3, 4, 8]) {
    const parent: MmNode = { text: "p", children: kids(n) };
    layoutBranch(parent, 1, 1, y0);
    assertEquals(parent._y, y0 + (n * ROW_PITCH) / 2, `parent x${n}: centered`);
    // Parent center must sit between first and last child centers.
    const first = parent.children![0]._y as number;
    const last = parent.children![n - 1]._y as number;
    assert(
      (parent._y as number) >= first && (parent._y as number) <= last,
      `parent x${n}: center within children span`,
    );
  }
});

Deno.test("no sibling overlap at any child count (4+ regression)", () => {
  const cases: Array<[string, MmNode]> = [
    ["x1", { text: "p", children: kids(1) }],
    ["x2", { text: "p", children: kids(2) }],
    ["x3", { text: "p", children: kids(3) }],
    ["x4", { text: "p", children: kids(4) }],
    ["x8", { text: "p", children: kids(8) }],
    ["nested 4-in-4", {
      text: "p",
      children: [
        { text: "a" },
        { text: "b", children: kids(4) },
        { text: "c" },
        { text: "d", children: kids(4) },
      ],
    }],
  ];
  for (const [label, root] of cases) {
    layoutBranch(root, 1, 1, 0);
    const ys = leafCenters(root).sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i++) {
      const gap = ys[i] - ys[i - 1];
      assertEquals(gap, ROW_PITCH, `${label}: adjacent leaf pitch`);
      assert(gap >= NODE_H, `${label}: leaves do not overlap`);
    }
  }
});

Deno.test("layout() splits children left/right, each side centered on 0", () => {
  // 4 children -> 2 right, 2 left; every node placed; both halves symmetric
  // about y=0 so the root connector (root._y = 0) meets each side cleanly.
  const root: MmNode = { text: "root", children: kids(4) };
  layout(root);
  assertEquals(root._y, 0);
  assertEquals(root._x, 0);

  const [r0, r1, l0, l1] = root.children!;
  assertEquals(r0._dir, 1, "first half lays out right");
  assertEquals(l0._dir, -1, "second half lays out left");
  // Right side centered on 0: two single-leaf branches span 2*ROW_PITCH.
  assertEquals(r0._y, -ROW_PITCH / 2);
  assertEquals(r1._y, ROW_PITCH / 2);
  assertEquals(l0._y, -ROW_PITCH / 2);
  assertEquals(l1._y, ROW_PITCH / 2);
  // Children sit one column out on their respective sides.
  assertEquals(r0._x, ML.COL_W);
  assertEquals(l0._x, -ML.COL_W);
});

Deno.test("hidden root children are excluded from layout", () => {
  const root: MmNode = {
    text: "root",
    children: [{ text: "a" }, { text: "hidden", _hidden: true }, { text: "b" }],
  };
  layout(root);
  // Only a + b are placed; the hidden node keeps no coordinates.
  assertEquals(root.children![1]._y, undefined);
  assertEquals(typeof root.children![0]._y, "number");
  assertEquals(typeof root.children![2]._y, "number");
});
