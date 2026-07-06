// Unit tests for the pure C4 force-directed layout (src/static/js/c4-layout.js).
// Importing the classic-script file runs its IIFE and populates
// globalThis.C4Layout (same pattern as mindmap-layout_test.ts). The physics is
// DOM-free, so we can assert repulsion / spring / collision / gravity directly.

import { assertEquals } from "@std/assert";
import "../../src/static/js/c4-layout.js";

type SimNode = { x: number; y: number; vx: number; vy: number };
type SimEdge = { s: number; t: number };
interface C4LayoutApi {
  SIM_TICKS: number;
  simulateTick: (
    nodes: SimNode[],
    edges: SimEdge[],
    alpha: number,
    boxW: number,
    boxH: number,
  ) => void;
  simulate: (
    nodes: SimNode[],
    edges: SimEdge[],
    opts?: { boxW?: number; boxH?: number },
  ) => void;
}

const C4Layout = (globalThis as unknown as { C4Layout: C4LayoutApi }).C4Layout;

function node(x: number, y: number) {
  return { x, y, vx: 0, vy: 0 };
}
function dist(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

Deno.test("c4-layout — constants + API exposed", () => {
  assertEquals(C4Layout.SIM_TICKS, 400);
  assertEquals(typeof C4Layout.simulate, "function");
  assertEquals(typeof C4Layout.simulateTick, "function");
});

Deno.test("c4-layout — one tick separates overlapping nodes", () => {
  const nodes = [node(0, 0), node(10, 0)];
  C4Layout.simulateTick(nodes, [], 1, 224, 128);
  // Repulsion + collision both push them apart along x.
  assertEquals(nodes[1].x - nodes[0].x > 10, true);
});

Deno.test("c4-layout — spring pulls far-apart connected nodes together", () => {
  const nodes = [node(0, 0), node(2000, 0)];
  C4Layout.simulate(nodes, [{ s: 0, t: 1 }]);
  const d = dist(nodes[0], nodes[1]);
  // Started 2000 apart; spring (len 360) + center gravity pull them well in.
  assertEquals(d < 1000, true);
  assertEquals(d > 50, true);
});

Deno.test("c4-layout — collision prevents coincident nodes overlapping", () => {
  const nodes = [node(100, 100), node(100, 100)];
  C4Layout.simulate(nodes, []);
  // After the sim the two boxes must be separated (no longer coincident).
  assertEquals(dist(nodes[0], nodes[1]) > 100, true);
});

Deno.test("c4-layout — center gravity pulls a lone node toward 600,400", () => {
  const n = node(0, 0);
  C4Layout.simulate([n], []);
  assertEquals(n.x > 0, true);
  assertEquals(n.y > 0, true);
});
