// mindmap-layout.js — pure mindmap geometry (no DOM, no SVG).
// Computes _x / _y for every node so the renderer (mindmap.js) only draws.
// Exposed as globalThis.MindmapLayout so it works both as a classic browser
// script (loaded before mindmap.js) and as a Deno import in tests.
//
// Single source of truth for vertical spacing: every leaf occupies one row of
// ROW_PITCH, and every subtree span / sibling advance is derived from it. Using
// one constant (not separate leaf-span and child-advance formulas) keeps parent
// centers and child bands exactly consistent — otherwise siblings overlap once
// a node has 4+ children.

(function (root) {
  "use strict";

  // ── Config ──────────────────────────────────────────────────────────────────
  const COL_W = 240; // horizontal space per depth level (px)
  const NODE_H = 28; // vertical space allocated per leaf node
  const V_GAP = 6; // gap between adjacent leaf rows
  const ROW_PITCH = NODE_H + V_GAP; // per-leaf vertical pitch (px)

  // ── Leaf count ──────────────────────────────────────────────────────────────
  function leaves(node) {
    if (node._collapsed || !node.children || !node.children.length) return 1;
    return node.children.reduce((s, c) => s + leaves(c), 0);
  }

  // ── Layout ──────────────────────────────────────────────────────────────────
  // dir: 1 = right, -1 = left. y0 is the top of this subtree's band. Returns the
  // bottom of the band (= next available y), which equals exactly the vertical
  // extent the subtree consumed, so the caller never under-reserves.
  function layoutBranch(node, depth, dir, y0) {
    const l = leaves(node);
    const band = l * ROW_PITCH;
    node._y = y0 + band / 2;
    node._x = dir * depth * COL_W;
    node._dir = dir;

    if (!node._collapsed && node.children && node.children.length) {
      let cy = y0;
      for (const child of node.children) {
        cy = layoutBranch(child, depth + 1, dir, cy);
      }
    }
    // Children's leaves sum to `l`, so sequential placement consumes exactly
    // `band` — returning it guarantees the caller never under-reserves.
    return y0 + band;
  }

  function layout(root) {
    root._x = 0;
    root._y = 0;
    root._dir = 0;

    const ch = (root.children || []).filter((c) => !c._hidden);
    if (!ch.length) return;

    const rightCount = Math.ceil(ch.length / 2);
    const right = ch.slice(0, rightCount);
    const left = ch.slice(rightCount);

    // Right side — centered vertically
    const rLeaves = right.reduce((s, c) => s + leaves(c), 0);
    const rH = rLeaves * ROW_PITCH;
    let ry = -rH / 2;
    for (const c of right) ry = layoutBranch(c, 1, 1, ry);

    // Left side — centered vertically
    const lLeaves = left.reduce((s, c) => s + leaves(c), 0);
    const lH = lLeaves * ROW_PITCH;
    let ly = -lH / 2;
    for (const c of left) ly = layoutBranch(c, 1, -1, ly);
  }

  root.MindmapLayout = {
    COL_W,
    NODE_H,
    V_GAP,
    ROW_PITCH,
    leaves,
    layoutBranch,
    layout,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
