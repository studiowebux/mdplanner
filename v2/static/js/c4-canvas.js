// C4 Architecture canvas — force-directed layout, pan, zoom, drag, minimap.
// CSSOM only — no inline styles (CSP-safe). No external dependencies.

(function () {
  "use strict";

  // ── Constants ───────────────────────────────────────────────────────────────

  var BOX_W = 224; // must match --c4-box-w
  var BOX_H = 128; // must match --c4-box-h
  var BOX_GAP = 60; // min gap between boxes

  var ZOOM_MIN = 0.15;
  var ZOOM_MAX = 3.0;
  var ZOOM_STEP = 0.2;

  // Force simulation tuning
  var SIM_TICKS = 400;
  var SIM_ALPHA_DECAY = 0.012;
  var SIM_REPULSION = 18000;
  var SIM_SPRING_LEN = 360;
  var SIM_SPRING_K = 0.04;
  var SIM_CENTER_K = 0.012;
  var SIM_COLLISION_ITER = 3;

  // Level colours for minimap (match variables.css)
  var LEVEL_COLOURS = {
    context: "#e3f2fd",
    container: "#e8f5e9",
    component: "#fff3e0",
    code: "#f3e5f5",
  };
  var LEVEL_BORDER = {
    context: "#90caf9",
    container: "#66bb6a",
    component: "#ffa726",
    code: "#ce93d8",
  };

  // ── State ───────────────────────────────────────────────────────────────────

  var state = {
    scale: 1,
    tx: 0,
    ty: 0,
    nodes: [], // { id, x, y, vx, vy, el }
    edges: [], // { s, t } node indices
    dragging: null, // { node, startMouseX, startMouseY, startNodeX, startNodeY }
    panning: false,
    panStart: null, // { mx, my, tx, ty }
    lastDragAt: 0, // timestamp of last local drag — suppresses SSE position reset
    initialized: false, // true after init() has run — prevents double-init
  };

  var DRAG_SUPPRESS_MS = 2000; // ms to ignore server positions after a local drag

  // ── DOM helpers ─────────────────────────────────────────────────────────────

  function elId(id) {
    return document.getElementById(id);
  }
  function root() {
    return elId("c4Root");
  }
  function wrapper() {
    return elId("c4Wrapper");
  }
  function canvas() {
    return elId("c4Canvas");
  }
  function isOnCanvas() {
    return !!root();
  }

  // ── Force simulation ────────────────────────────────────────────────────────

  function buildGraph() {
    var boxes = document.querySelectorAll(".c4-box[data-id]");
    var nodes = [];
    var idxById = {};

    boxes.forEach(function (box, i) {
      var x = parseFloat(box.getAttribute("data-x")) || 0;
      var y = parseFloat(box.getAttribute("data-y")) || 0;
      // Scatter boxes that share the same position so simulation can separate them
      var duplicate = nodes.some(function (n) {
        return Math.abs(n.x - x) < 10 && Math.abs(n.y - y) < 10;
      });
      if (duplicate || (x === 0 && y === 0)) {
        var angle = (i / Math.max(boxes.length, 1)) * 2 * Math.PI;
        var r = 200 + i * 40;
        x = 600 + Math.cos(angle) * r;
        y = 400 + Math.sin(angle) * r;
      }
      idxById[box.getAttribute("data-id")] = i;
      nodes.push({
        id: box.getAttribute("data-id"),
        x: x,
        y: y,
        vx: 0,
        vy: 0,
        el: box,
      });
    });

    // Read connections from data-connections attr on each box (comma-separated target IDs)
    var edges = [];
    boxes.forEach(function (box, si) {
      var conns = box.getAttribute("data-connections");
      if (!conns) return;
      conns.split(",").forEach(function (targetId) {
        targetId = targetId.trim();
        if (targetId && idxById[targetId] !== undefined) {
          edges.push({ s: si, t: idxById[targetId] });
        }
      });
    });

    state.nodes = nodes;
    state.edges = edges;
  }

  function simulateTick(alpha) {
    var nodes = state.nodes;
    var n = nodes.length;

    // Repulsion between all pairs (Coulomb)
    for (var i = 0; i < n; i++) {
      for (var j = i + 1; j < n; j++) {
        var dx = nodes[j].x - nodes[i].x;
        var dy = nodes[j].y - nodes[i].y;
        var dist2 = dx * dx + dy * dy;
        if (dist2 < 1) {
          dx = 1;
          dy = 0;
          dist2 = 1;
        }
        var dist = Math.sqrt(dist2);
        var force = (SIM_REPULSION / dist2) * alpha;
        var fx = (dx / dist) * force;
        var fy = (dy / dist) * force;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Spring attraction along edges
    state.edges.forEach(function (e) {
      var a = nodes[e.s];
      var b = nodes[e.t];
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var dist = Math.sqrt(dx * dx + dy * dy) || 1;
      var stretch = dist - SIM_SPRING_LEN;
      var fx = (dx / dist) * stretch * SIM_SPRING_K * alpha;
      var fy = (dy / dist) * stretch * SIM_SPRING_K * alpha;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    });

    // Center gravity (gentle pull toward 600,400)
    nodes.forEach(function (node) {
      node.vx += (600 - node.x) * SIM_CENTER_K * alpha;
      node.vy += (400 - node.y) * SIM_CENTER_K * alpha;
    });

    // Integrate + damping
    nodes.forEach(function (node) {
      node.vx *= 0.6;
      node.vy *= 0.6;
      node.x += node.vx;
      node.y += node.vy;
    });

    // Collision resolution — boxes cannot overlap
    for (var iter = 0; iter < SIM_COLLISION_ITER; iter++) {
      for (var i = 0; i < n; i++) {
        for (var j = i + 1; j < n; j++) {
          var a = nodes[i], b = nodes[j];
          var minSepX = BOX_W + BOX_GAP;
          var minSepY = BOX_H + BOX_GAP;
          var dx = b.x - a.x;
          var dy = b.y - a.y;
          var overlapX = minSepX - Math.abs(dx);
          var overlapY = minSepY - Math.abs(dy);
          if (overlapX > 0 && overlapY > 0) {
            var push;
            if (overlapX < overlapY) {
              push = overlapX / 2 + 1;
              if (dx >= 0) {
                a.x -= push;
                b.x += push;
              } else {
                a.x += push;
                b.x -= push;
              }
            } else {
              push = overlapY / 2 + 1;
              if (dy >= 0) {
                a.y -= push;
                b.y += push;
              } else {
                a.y += push;
                b.y -= push;
              }
            }
          }
        }
      }
    }
  }

  function runSimulation() {
    var alpha = 1.0;
    for (var tick = 0; tick < SIM_TICKS; tick++) {
      alpha *= 1 - SIM_ALPHA_DECAY;
      simulateTick(alpha);
    }
  }

  // ── Apply positions ─────────────────────────────────────────────────────────

  function applyPositions() {
    state.nodes.forEach(function (node) {
      var x = Math.round(node.x);
      var y = Math.round(node.y);
      node.el.style.setProperty("left", x + "px");
      node.el.style.setProperty("top", y + "px");
      node.el.setAttribute("data-x", x);
      node.el.setAttribute("data-y", y);
    });
  }

  // ── Transform ───────────────────────────────────────────────────────────────

  function applyTransform() {
    var c = canvas();
    if (!c) return;
    c.style.setProperty(
      "transform",
      "translate(" + state.tx + "px," + state.ty + "px) scale(" + state.scale +
        ")",
    );
  }

  function clampZoom(z) {
    return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
  }

  function zoomAround(newScale, mx, my) {
    newScale = clampZoom(newScale);
    var ratio = newScale / state.scale;
    state.tx = mx - ratio * (mx - state.tx);
    state.ty = my - ratio * (my - state.ty);
    state.scale = newScale;
    applyTransform();
    drawMinimap();
  }

  // ── Fit to screen ───────────────────────────────────────────────────────────

  function fitToScreen() {
    var nodes = state.nodes;
    if (!nodes.length) return;
    var w = wrapper();
    if (!w) return;
    var vw = w.clientWidth;
    var vh = w.clientHeight;
    var pad = 80;

    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(function (node) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + BOX_W);
      maxY = Math.max(maxY, node.y + BOX_H);
    });

    var contentW = maxX - minX + pad * 2;
    var contentH = maxY - minY + pad * 2;
    var scale = clampZoom(Math.min(vw / contentW, vh / contentH, 1));
    state.scale = scale;
    state.tx = (vw - (maxX + minX) * scale) / 2;
    state.ty = (vh - (maxY + minY) * scale) / 2;
    applyTransform();
    drawMinimap();
  }

  // ── Pan ─────────────────────────────────────────────────────────────────────

  function onWrapperMousedown(e) {
    if (!isOnCanvas()) return;
    if (e.target.closest(".c4-box")) return;
    if (!e.target.closest("#c4Wrapper")) return;
    e.preventDefault();
    state.panning = true;
    state.panStart = {
      mx: e.clientX,
      my: e.clientY,
      tx: state.tx,
      ty: state.ty,
    };
    var w = wrapper();
    if (w) w.style.setProperty("cursor", "grabbing");
  }

  function onMousemove(e) {
    if (state.panning && state.panStart) {
      state.tx = state.panStart.tx + (e.clientX - state.panStart.mx);
      state.ty = state.panStart.ty + (e.clientY - state.panStart.my);
      applyTransform();
      drawMinimap();
      return;
    }

    if (state.dragging) {
      var d = state.dragging;
      var dx = (e.clientX - d.startMouseX) / state.scale;
      var dy = (e.clientY - d.startMouseY) / state.scale;
      var newX = Math.round(d.startNodeX + dx);
      var newY = Math.round(d.startNodeY + dy);
      d.node.x = newX;
      d.node.y = newY;
      d.node.el.style.setProperty("left", newX + "px");
      d.node.el.style.setProperty("top", newY + "px");
      d.node.el.setAttribute("data-x", newX);
      d.node.el.setAttribute("data-y", newY);
      updateArrows();
      drawMinimap();
    }
  }

  function onMouseup() {
    if (state.panning) {
      state.panning = false;
      state.panStart = null;
      var w = wrapper();
      if (w) w.style.setProperty("cursor", "grab");
    }
    if (state.dragging) {
      var d = state.dragging;
      d.node.el.classList.remove("is-dragging");
      var movedX = Math.abs(d.node.x - d.startNodeX);
      var movedY = Math.abs(d.node.y - d.startNodeY);
      if (movedX > 5 || movedY > 5) {
        patchPosition(d.node.id, d.node.x, d.node.y);
      }
      state.dragging = null;
    }
  }

  // ── Box drag ─────────────────────────────────────────────────────────────────

  function onBoxMousedown(e) {
    // Allow buttons (sidenav open) and links to handle their own click
    if (e.target.tagName === "BUTTON" || e.target.tagName === "A") return;
    e.preventDefault();
    e.stopPropagation();
    var box = e.currentTarget;
    var id = box.getAttribute("data-id");
    var node = null;
    for (var i = 0; i < state.nodes.length; i++) {
      if (state.nodes[i].id === id) {
        node = state.nodes[i];
        break;
      }
    }
    if (!node) return;
    box.classList.add("is-dragging");
    // Mark drag start immediately so any SSE refresh during drag preserves positions
    state.lastDragAt = Date.now();
    state.dragging = {
      node: node,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startNodeX: node.x,
      startNodeY: node.y,
    };
  }

  function wireBoxDrag() {
    document.querySelectorAll(".c4-box[data-id]").forEach(function (box) {
      // Remove old listener before re-adding (avoids duplicates on SSE refresh)
      box.removeEventListener("mousedown", onBoxMousedown);
      box.addEventListener("mousedown", onBoxMousedown);
    });
  }

  // ── Wheel zoom ───────────────────────────────────────────────────────────────

  function onWheel(e) {
    if (!isOnCanvas()) return;
    if (!e.target.closest("#c4Wrapper")) return;
    e.preventDefault();
    var w = wrapper();
    if (!w) return;
    var rect = w.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;
    var delta = e.deltaY < 0 ? 1.1 : (1 / 1.1);
    zoomAround(state.scale * delta, mx, my);
  }

  // ── PATCH position ───────────────────────────────────────────────────────────

  function patchPosition(id, x, y) {
    state.lastDragAt = Date.now(); // suppress SSE position reset on this client
    fetch("/api/v1/c4/" + encodeURIComponent(id) + "/position", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x: x, y: y }),
    }).catch(function () {});
  }

  // ── SVG arrows ───────────────────────────────────────────────────────────────

  function updateArrows() {
    var svg = elId("c4Connections");
    if (!svg) return;
    var byId = {};
    state.nodes.forEach(function (n) {
      byId[n.id] = n;
    });

    svg.querySelectorAll(".c4-arrow[data-src][data-tgt]").forEach(function (g) {
      var line = g.querySelector("line");
      if (!line) return;
      var src = byId[g.getAttribute("data-src")];
      var tgt = byId[g.getAttribute("data-tgt")];
      if (!src || !tgt) return;
      var x1 = src.x + BOX_W / 2;
      var y1 = src.y + BOX_H / 2;
      var x2 = tgt.x + BOX_W / 2;
      var y2 = tgt.y + BOX_H / 2;
      line.setAttribute("x1", x1);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
      var label = g.querySelector("text");
      if (label) {
        label.setAttribute("x", (x1 + x2) / 2);
        label.setAttribute("y", (y1 + y2) / 2 - 6);
      }
    });
  }

  // ── Minimap ───────────────────────────────────────────────────────────────────

  function drawMinimap() {
    var minimap = elId("c4Minimap");
    var cv = elId("c4MinimapCanvas");
    if (!minimap || !cv) return;
    var nodes = state.nodes;
    if (!nodes.length) return;

    var mw = minimap.clientWidth || 176;
    var mh = minimap.clientHeight || 112;
    cv.width = mw;
    cv.height = mh;

    var ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, mw, mh);

    // Bounding box of all nodes
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(function (n) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + BOX_W);
      maxY = Math.max(maxY, n.y + BOX_H);
    });
    var pad = 20;
    var contentW = maxX - minX + pad * 2;
    var contentH = maxY - minY + pad * 2;
    var mmScale = Math.min(mw / contentW, mh / contentH);
    var offX = (mw - contentW * mmScale) / 2 - (minX - pad) * mmScale;
    var offY = (mh - contentH * mmScale) / 2 - (minY - pad) * mmScale;

    // Draw edges
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 1;
    state.edges.forEach(function (e) {
      var a = nodes[e.s], b = nodes[e.t];
      ctx.beginPath();
      ctx.moveTo(
        a.x * mmScale + offX + (BOX_W / 2) * mmScale,
        a.y * mmScale + offY + (BOX_H / 2) * mmScale,
      );
      ctx.lineTo(
        b.x * mmScale + offX + (BOX_W / 2) * mmScale,
        b.y * mmScale + offY + (BOX_H / 2) * mmScale,
      );
      ctx.stroke();
    });

    // Draw boxes
    nodes.forEach(function (node) {
      var level = node.el.getAttribute("data-level") || "context";
      var bx = node.x * mmScale + offX;
      var by = node.y * mmScale + offY;
      var bw = BOX_W * mmScale;
      var bh = BOX_H * mmScale;
      ctx.fillStyle = LEVEL_COLOURS[level] || "#e0e0e0";
      ctx.strokeStyle = LEVEL_BORDER[level] || "#999";
      ctx.lineWidth = 1;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 3);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeRect(bx, by, bw, bh);
      }
    });

    // Viewport indicator
    var w = wrapper();
    if (!w) return;
    var vw = w.clientWidth;
    var vh = w.clientHeight;
    var vtlX = -state.tx / state.scale;
    var vtlY = -state.ty / state.scale;
    var vwC = vw / state.scale;
    var vhC = vh / state.scale;
    ctx.strokeStyle = "rgba(0,100,255,0.7)";
    ctx.lineWidth = 1.5;
    ctx.fillStyle = "rgba(0,100,255,0.08)";
    var rx = vtlX * mmScale + offX;
    var ry = vtlY * mmScale + offY;
    var rw = vwC * mmScale;
    var rh = vhC * mmScale;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeRect(rx, ry, rw, rh);
  }

  function wireMinimapClick() {
    var cv = elId("c4MinimapCanvas");
    if (!cv) return;
    cv.addEventListener("click", function (e) {
      var minimap = elId("c4Minimap");
      var nodes = state.nodes;
      if (!minimap || !nodes.length) return;
      var mw = minimap.clientWidth || 176;
      var mh = minimap.clientHeight || 112;
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach(function (n) {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + BOX_W);
        maxY = Math.max(maxY, n.y + BOX_H);
      });
      var pad = 20;
      var contentW = maxX - minX + pad * 2;
      var contentH = maxY - minY + pad * 2;
      var mmScale = Math.min(mw / contentW, mh / contentH);
      var offX = (mw - contentW * mmScale) / 2 - (minX - pad) * mmScale;
      var offY = (mh - contentH * mmScale) / 2 - (minY - pad) * mmScale;
      var rect = cv.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var my = e.clientY - rect.top;
      var cx = (mx - offX) / mmScale;
      var cy = (my - offY) / mmScale;
      var w = wrapper();
      if (!w) return;
      state.tx = w.clientWidth / 2 - cx * state.scale;
      state.ty = w.clientHeight / 2 - cy * state.scale;
      applyTransform();
      drawMinimap();
    });
  }

  // ── Canvas height ─────────────────────────────────────────────────────────────

  function sizeCanvas() {
    var r = root();
    if (!r) return;
    var top = r.getBoundingClientRect().top;
    var h = window.innerHeight - top;
    document.documentElement.style.setProperty("--c4-canvas-height", h + "px");
  }

  // ── Zoom buttons ───────────────────────────────────────────────────────────────

  function wireZoomButtons() {
    var zoomIn = elId("c4ZoomIn");
    var zoomOut = elId("c4ZoomOut");
    var fit = elId("c4FitScreen");
    var w = wrapper();

    if (zoomIn) {
      zoomIn.disabled = false;
      zoomIn.addEventListener("click", function () {
        var cx = w ? w.clientWidth / 2 : 400;
        var cy = w ? w.clientHeight / 2 : 300;
        zoomAround(state.scale * (1 + ZOOM_STEP), cx, cy);
      });
    }
    if (zoomOut) {
      zoomOut.disabled = false;
      zoomOut.addEventListener("click", function () {
        var cx = w ? w.clientWidth / 2 : 400;
        var cy = w ? w.clientHeight / 2 : 300;
        zoomAround(state.scale * (1 - ZOOM_STEP), cx, cy);
      });
    }
    if (fit) {
      fit.disabled = false;
      fit.addEventListener("click", fitToScreen);
    }
  }

  // ── Edit toggle ────────────────────────────────────────────────────────────────

  function wireEditToggle() {
    var btn = elId("c4ToggleEdit");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var r = root();
      if (!r) return;
      var isEdit = r.classList.toggle("c4-edit-mode");
      btn.textContent = isEdit ? "View" : "Edit";
      btn.setAttribute("aria-pressed", isEdit ? "true" : "false");
      btn.classList.toggle("is-active", isEdit);
    });
  }

  // ── SSE refresh ────────────────────────────────────────────────────────────────

  // ── Init ───────────────────────────────────────────────────────────────────────

  function init() {
    if (!isOnCanvas() || state.initialized) return;
    state.initialized = true;

    sizeCanvas();
    buildGraph();
    runSimulation();
    applyPositions();
    fitToScreen();
    updateArrows();

    wireBoxDrag();
    wireEditToggle();
    wireZoomButtons();
    wireMinimapClick();
    drawMinimap();

    // mousedown/wheel on document so they survive SSE DOM replacement
    document.addEventListener("mousedown", onWrapperMousedown);
    document.addEventListener("mousemove", onMousemove);
    document.addEventListener("mouseup", onMouseup);
    document.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", function () {
      sizeCanvas();
      fitToScreen();
    });
  }

  // ── Top-level htmx:afterSettle — handles both SSE refresh and htmx navigation ──
  // Runs on every settle. If canvas just appeared (htmx nav), init it.
  // If canvas was already initialized, handle SSE data refresh only.

  document.addEventListener("htmx:afterSettle", function () {
    if (!isOnCanvas()) {
      // Left the canvas page — reset so re-entering re-inits cleanly
      state.initialized = false;
      return;
    }

    if (!state.initialized) {
      // htmx navigation brought us to the canvas — run full init
      init();
      return;
    }

    // Skip SSE rebuild while a drag is active — node objects would be replaced
    // mid-drag, making state.dragging.node stale and causing position flashing.
    if (state.dragging) return;

    // SSE data refresh — rebuild graph but preserve positions if we just dragged
    var preservePositions = (Date.now() - state.lastDragAt) < DRAG_SUPPRESS_MS;
    var prevById = {};
    state.nodes.forEach(function (n) {
      prevById[n.id] = n;
    });

    var prevCount = state.nodes.length;
    buildGraph();
    wireBoxDrag();

    if (preservePositions) {
      // Keep in-memory positions for existing nodes; only reset new ones
      state.nodes.forEach(function (node) {
        var prev = prevById[node.id];
        if (prev) {
          node.x = prev.x;
          node.y = prev.y;
        }
      });
    }

    if (state.nodes.length !== prevCount && !preservePositions) {
      runSimulation();
      fitToScreen();
    }

    applyPositions();
    updateArrows();
    drawMinimap();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
