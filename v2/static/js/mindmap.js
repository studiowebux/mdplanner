// mindmap.js — pure SVG mindmap renderer.
// Layout: root centered, children split left/right, orthogonal bracket connectors.
// Colors: CSS classes mm-branch-N per top-level branch (currentColor throughout).
// All presentation lives in mindmaps.css — JS sets structural attrs + classes only.
// Zoom: wheel toward cursor. Pan: drag background. Collapse: click node text.

(function () {
  "use strict";

  // ── Config ──────────────────────────────────────────────────────────────────
  const COL_W = 240; // horizontal space per depth level (px)
  const NODE_H = 28; // vertical space allocated per leaf node
  const V_GAP = 6; // extra gap between sibling groups
  const JUNCTION_OFFSET = 48; // how far the bracket junction sits from parent text edge
  const TEXT_MARGIN = 10; // gap between text edge and junction line
  const MAX_TEXT_W = 180; // truncate text beyond this width
  // Font sizes must mirror --mm-font-{root,branch,leaf} in variables.css
  const ROOT_FONT = 20;
  const BRANCH_FONT = 14;
  const CHILD_FONT = 13;
  const BRANCH_COUNT = 8; // matches mm-branch-0 … mm-branch-7 in CSS
  // Text background geometry (mirrors --mm-text-bg-* in variables.css for SVG attrs)
  const TEXT_BG_PAD_X = 6;
  const TEXT_BG_PAD_Y = 3;
  const TEXT_BG_RADIUS = 4;
  // Collapse badge geometry. Badge center sits TEXT_MARGIN + BADGE_INSET past
  // the text edge in the children direction. Outgoing connector lines start
  // past the badge (BADGE_LINE_CLEARANCE) so they never overlap it.
  const BADGE_R = 9;
  const BADGE_INSET = 14;
  const BADGE_LINE_CLEARANCE = TEXT_MARGIN + BADGE_INSET + BADGE_R + 4;
  // Wheel-zoom sensitivity — Math.exp(-deltaY * coef). Trackpad-friendly.
  const WHEEL_ZOOM_COEF = 0.0015;

  // ── Text measurement ────────────────────────────────────────────────────────
  // Canvas `font` does NOT accept `var(--…)` — silently falls back to default.
  // Resolve --font-sans against the document root once, then pass the literal
  // family string so measureText matches the actually-rendered SVG font.
  let _ctx = null;
  let _fontFamily = null;
  function resolveFontFamily() {
    if (_fontFamily) return _fontFamily;
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue("--font-sans").trim();
    _fontFamily = v || "system-ui, sans-serif";
    return _fontFamily;
  }
  function measure(text, size) {
    if (!_ctx) {
      _ctx = document.createElement("canvas").getContext("2d");
    }
    _ctx.font = `${size}px ${resolveFontFamily()}`;
    return _ctx.measureText(text).width;
  }

  function truncate(text, maxW, size) {
    if (measure(text, size) <= maxW) return text;
    let t = text;
    while (t.length > 1 && measure(t + "…", size) > maxW) t = t.slice(0, -1);
    return t + "…";
  }

  // ── Node prep ───────────────────────────────────────────────────────────────
  let _uid = 0;
  function prep(node, depth) {
    node._id = ++_uid;
    node._depth = depth;
    node._collapsed = false;
    const size = depth === 0
      ? ROOT_FONT
      : depth === 1
      ? BRANCH_FONT
      : CHILD_FONT;
    node._label = truncate(node.text, MAX_TEXT_W, size);
    node._tw = measure(node._label, size);
    node._fontSize = size;
    (node.children || []).forEach((c) => prep(c, depth + 1));
  }

  // ── Leaf count ──────────────────────────────────────────────────────────────
  function leaves(node) {
    if (node._collapsed || !node.children || !node.children.length) return 1;
    return node.children.reduce((s, c) => s + leaves(c), 0);
  }

  // ── Layout ──────────────────────────────────────────────────────────────────
  // dir: 1 = right, -1 = left. Returns next available y.
  function layoutBranch(node, depth, dir, y0) {
    const l = leaves(node);
    const totalH = l * NODE_H + (l - 1) * V_GAP;
    node._y = y0 + totalH / 2;
    node._x = dir * depth * COL_W;
    node._dir = dir;

    if (!node._collapsed && node.children && node.children.length) {
      let cy = y0;
      for (const child of node.children) {
        cy = layoutBranch(child, depth + 1, dir, cy);
      }
    }
    return y0 + totalH + V_GAP * 2;
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
    const rH = rLeaves * NODE_H + (rLeaves - 1) * V_GAP;
    let ry = -rH / 2;
    for (const c of right) ry = layoutBranch(c, 1, 1, ry);

    // Left side — centered vertically
    const lLeaves = left.reduce((s, c) => s + leaves(c), 0);
    const lH = lLeaves * NODE_H + (lLeaves - 1) * V_GAP;
    let ly = -lH / 2;
    for (const c of left) ly = layoutBranch(c, 1, -1, ly);
  }

  // ── SVG helpers ─────────────────────────────────────────────────────────────
  const NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    return e;
  }

  // ── Draw bracket connector ──────────────────────────────────────────────────
  // Parent node P → array of children nodes. dir = 1 (right) or -1 (left).
  // P always has a badge here (drawBracket is only called when P has rendered
  // children), so pEdge clears the badge; jx stays at the original junction
  // distance from text so layout doesn't shift.
  function drawBracket(P, children, g) {
    if (!children || !children.length) return;
    const dir = P._dir === 0 ? (children[0]._dir || 1) : P._dir;
    const pEdge = P._x + dir * (P._tw / 2 + BADGE_LINE_CLEARANCE);
    const jx = P._x + dir * (P._tw / 2 + TEXT_MARGIN + JUNCTION_OFFSET);

    // Line from parent edge to junction
    g.appendChild(el("line", {
      x1: pEdge,
      y1: P._y,
      x2: jx,
      y2: P._y,
      class: "mm-line mm-line--child",
    }));

    if (children.length === 1) {
      // Single child — extend directly
      const c = children[0];
      const cEdge = c._x - dir * (c._tw / 2 + TEXT_MARGIN);
      g.appendChild(el("line", {
        x1: jx,
        y1: c._y,
        x2: cEdge,
        y2: c._y,
        class: "mm-line mm-line--child",
      }));
      return;
    }

    // Vertical bar spanning all children
    const topY = children[0]._y;
    const botY = children[children.length - 1]._y;
    g.appendChild(el("line", {
      x1: jx,
      y1: topY,
      x2: jx,
      y2: botY,
      class: "mm-line mm-line--child",
    }));

    // Horizontal line from junction to each child
    for (const c of children) {
      const cEdge = c._x - dir * (c._tw / 2 + TEXT_MARGIN);
      g.appendChild(el("line", {
        x1: jx,
        y1: c._y,
        x2: cEdge,
        y2: c._y,
        class: "mm-line mm-line--child",
      }));
    }
  }

  // ── Draw a node (text + collapse badge) ─────────────────────────────────────
  // Opaque background rect (canvas bg fill) sits behind the text so any line
  // crossing the label's bbox is fully masked — text-glyph paint-order alone
  // leaves the line visible through letter gaps.
  function drawNode(node, g, isRoot) {
    const textCls = isRoot
      ? "mm-text mm-text--root"
      : node._depth === 1
      ? "mm-text mm-text--branch"
      : "mm-text mm-text--leaf";

    const bgW = node._tw + 2 * TEXT_BG_PAD_X;
    const bgH = node._fontSize + 2 * TEXT_BG_PAD_Y;
    g.appendChild(el("rect", {
      x: node._x - bgW / 2,
      y: node._y - bgH / 2,
      width: bgW,
      height: bgH,
      rx: TEXT_BG_RADIUS,
      ry: TEXT_BG_RADIUS,
      class: "mm-text-bg",
    }));

    const t = el("text", {
      x: node._x,
      y: node._y,
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      class: textCls,
      "data-id": node._id,
    });
    t.textContent = node._label;
    g.appendChild(t);

    // Collapse badge — shown only when node has children
    const kids = node.children || [];
    if (kids.length > 0) {
      const dir = node._dir || 1;
      const bx = node._x + dir * (node._tw / 2 + TEXT_MARGIN + BADGE_INSET);
      const badge = el("g", {
        class: "mm-badge",
        "data-id": node._id,
      });
      // Opaque backplate so the connector line doesn't bleed through the
      // semi-transparent disc (--mm-badge-disc-opacity: 0.15).
      badge.appendChild(el("circle", {
        cx: bx,
        cy: node._y,
        r: BADGE_R,
        class: "mm-badge__bg",
      }));
      badge.appendChild(el("circle", {
        cx: bx,
        cy: node._y,
        r: BADGE_R,
        class: "mm-badge__disc",
      }));
      const count = el("text", {
        x: bx,
        y: node._y,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        class: "mm-badge__count",
      });
      count.textContent = node._collapsed ? "+" : String(kids.length);
      badge.appendChild(count);
      g.appendChild(badge);
    }
  }

  // ── Render a branch recursively ─────────────────────────────────────────────
  function renderBranch(node, linesG, nodesG) {
    drawNode(node, nodesG, false);

    if (!node._collapsed && node.children && node.children.length) {
      drawBracket(node, node.children, linesG);
      for (const child of node.children) renderBranch(child, linesG, nodesG);
    }
  }

  // ── Full redraw ─────────────────────────────────────────────────────────────
  // Stage split into two top-level groups so all lines paint before all text.
  // SVG paint order between siblings is document order — `paint-order: stroke`
  // only reorders fill vs stroke within one element, not across siblings.
  function redraw(root, stage) {
    while (stage.firstChild) stage.removeChild(stage.firstChild);
    layout(root);

    const linesG = el("g", { class: "mm-stage-lines" });
    const nodesG = el("g", { class: "mm-stage-nodes" });
    stage.appendChild(linesG);
    stage.appendChild(nodesG);

    // Root text — uncolored, goes in nodesG so it paints over all lines
    const rootG = el("g", { class: "mm-root" });
    drawNode(root, rootG, true);
    nodesG.appendChild(rootG);

    const children = root.children || [];
    const rightCount = Math.ceil(children.length / 2);
    const rightKids = children.slice(0, rightCount);
    const leftKids = children.slice(rightCount);

    function appendBranch(child, colorIdx, dirSign) {
      const branchClass = `mm-branch mm-branch-${colorIdx}`;
      const branchLinesG = el("g", { class: branchClass });
      const branchNodesG = el("g", { class: branchClass });
      linesG.appendChild(branchLinesG);
      nodesG.appendChild(branchNodesG);

      const pEdge = root._x + dirSign * (root._tw / 2 + BADGE_LINE_CLEARANCE);
      const jx = root._x +
        dirSign * (root._tw / 2 + TEXT_MARGIN + JUNCTION_OFFSET);
      branchLinesG.appendChild(el("line", {
        x1: pEdge,
        y1: root._y,
        x2: jx,
        y2: root._y,
        class: "mm-line mm-line--root",
      }));
      branchLinesG.appendChild(el("line", {
        x1: jx,
        y1: root._y,
        x2: jx,
        y2: child._y,
        class: "mm-line mm-line--root",
      }));
      branchLinesG.appendChild(el("line", {
        x1: jx,
        y1: child._y,
        x2: child._x - dirSign * (child._tw / 2 + TEXT_MARGIN),
        y2: child._y,
        class: "mm-line mm-line--root",
      }));
      renderBranch(child, branchLinesG, branchNodesG);
    }

    for (let i = 0; i < rightKids.length; i++) {
      appendBranch(rightKids[i], i % BRANCH_COUNT, 1);
    }
    for (let i = 0; i < leftKids.length; i++) {
      appendBranch(leftKids[i], (rightCount + i) % BRANCH_COUNT, -1);
    }
  }

  // ── Find node by _id ────────────────────────────────────────────────────────
  function findById(node, id) {
    if (node._id === id) return node;
    for (const c of node.children || []) {
      const r = findById(c, id);
      if (r) return r;
    }
    return null;
  }

  // ── Init ────────────────────────────────────────────────────────────────────
  // Dedupe via dataset flag — htmx:afterSettle fires on every swap and a stale
  // re-entry on the same DOM node would double-render. New nodes (outerHTML
  // swap) arrive without the flag and init runs cleanly.
  async function init() {
    const container = document.getElementById("mindmap-container");
    if (!container) return;
    if (container.dataset.mindmapInitialized === "true") return;
    container.dataset.mindmapInitialized = "true";
    const id = container.dataset.mindmapId;
    if (!id) return;

    let root;
    try {
      const res = await fetch(`/api/v1/mindmaps/${encodeURIComponent(id)}`, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) return;
      const item = await res.json();
      root = { text: item.title, children: item.nodes };
    } catch {
      return;
    }

    _uid = 0;
    prep(root, 0);

    const svgEl = el("svg", {
      width: "100%",
      height: "100%",
      class: "mindmap-svg",
    });
    const stage = el("g", { class: "mindmap-stage" });
    svgEl.appendChild(stage);
    container.appendChild(svgEl);

    let scale = 1, tx = 0, ty = 0;

    function applyTransform() {
      stage.setAttribute(
        "transform",
        `translate(${tx},${ty}) scale(${scale})`,
      );
    }

    function fit() {
      const cbox = container.getBoundingClientRect();
      // Reset transform before measuring so getBBox reflects content extents,
      // not the currently-zoomed visual rect.
      stage.setAttribute("transform", "translate(0,0) scale(1)");
      const sbox = stage.getBBox();
      if (!sbox.width || !sbox.height) {
        scale = 1;
        tx = cbox.width / 2;
        ty = cbox.height / 2;
        applyTransform();
        return;
      }
      const padding = 0.9;
      const sx = (cbox.width / sbox.width) * padding;
      const sy = (cbox.height / sbox.height) * padding;
      scale = Math.min(sx, sy, 1);
      tx = cbox.width / 2 - (sbox.x + sbox.width / 2) * scale;
      ty = cbox.height / 2 - (sbox.y + sbox.height / 2) * scale;
      applyTransform();
    }

    redraw(root, stage);
    // Wait for layout to settle then fit
    requestAnimationFrame(fit);

    // Wheel zoom toward cursor — proportional to deltaY so trackpad small-delta
    // events accumulate smoothly instead of lurching like a fixed 1.12/0.9 step.
    container.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_COEF);
        const ns = Math.max(0.15, Math.min(6, scale * factor));
        tx = mx - (mx - tx) * (ns / scale);
        ty = my - (my - ty) * (ns / scale);
        scale = ns;
        applyTransform();
      },
      { passive: false },
    );

    // Pan — drag on background
    let dragging = false, dx = 0, dy = 0;
    svgEl.addEventListener("mousedown", (e) => {
      if (e.target.closest(".mm-text") || e.target.closest(".mm-badge")) return;
      e.preventDefault();
      dragging = true;
      dx = e.clientX - tx;
      dy = e.clientY - ty;
      svgEl.style.cursor = "grabbing";
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      tx = e.clientX - dx;
      ty = e.clientY - dy;
      applyTransform();
    });
    window.addEventListener("mouseup", () => {
      dragging = false;
      svgEl.style.cursor = "";
    });

    // Touch pan + pinch zoom
    let lastTouchDist = 0, touchPanning = false;
    container.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length === 2) {
          lastTouchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY,
          );
        } else {
          touchPanning = true;
          dx = e.touches[0].clientX - tx;
          dy = e.touches[0].clientY - ty;
        }
      },
      { passive: true },
    );
    container.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        if (e.touches.length === 2) {
          const d = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY,
          );
          scale = Math.max(0.15, Math.min(6, scale * (d / lastTouchDist)));
          lastTouchDist = d;
          applyTransform();
        } else if (touchPanning) {
          tx = e.touches[0].clientX - dx;
          ty = e.touches[0].clientY - dy;
          applyTransform();
        }
      },
      { passive: false },
    );
    container.addEventListener("touchend", () => {
      touchPanning = false;
    });

    // Click node text or badge → collapse/expand
    stage.addEventListener("click", (e) => {
      const target = e.target.closest("[data-id]");
      if (!target) return;
      const id = parseInt(target.getAttribute("data-id"), 10);
      const node = findById(root, id);
      if (!node || !node.children || !node.children.length) return;
      node._collapsed = !node._collapsed;
      redraw(root, stage);
      applyTransform();
    });

    // Control buttons
    const fitBtn = document.getElementById("mindmap-fit");
    const zoomIn = document.getElementById("mindmap-zoom-in");
    const zoomOut = document.getElementById("mindmap-zoom-out");
    if (fitBtn) fitBtn.addEventListener("click", fit);
    if (zoomIn) {
      zoomIn.addEventListener("click", () => {
        const rect = container.getBoundingClientRect();
        const cx = rect.width / 2, cy = rect.height / 2;
        const ns = Math.min(6, scale * 1.25);
        tx = cx - (cx - tx) * (ns / scale);
        ty = cy - (cy - ty) * (ns / scale);
        scale = ns;
        applyTransform();
      });
    }
    if (zoomOut) {
      zoomOut.addEventListener("click", () => {
        const rect = container.getBoundingClientRect();
        const cx = rect.width / 2, cy = rect.height / 2;
        const ns = Math.max(0.15, scale / 1.25);
        tx = cx - (cx - tx) * (ns / scale);
        ty = cy - (cy - ty) * (ns / scale);
        scale = ns;
        applyTransform();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  // htmx swaps (POST save response, SSE refresh) replace #mindmap-container
  // with a fresh DOM node — re-init when that happens.
  document.addEventListener("htmx:afterSettle", init);
})();
