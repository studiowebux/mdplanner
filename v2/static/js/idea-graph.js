// Idea graph — force-directed canvas visualization of idea nodes and links.
// Drag nodes, pan background, zoom with wheel or slider.

(function () {
  "use strict";

  var canvas, ctx, ideas, edges;
  var nodes = [];
  var zoom = 1, panX = 0, panY = 0;
  var draggingNode = null, hoveredNode = null, panningBg = false;
  var mouseStartX = 0, mouseStartY = 0;
  var panOriginX = 0, panOriginY = 0;
  var animFrame = null;
  var alpha = 1; // simulation heat — decays toward 0

  // ── CSS var resolution ────────────────────────────────────────────────────

  var cs;
  function cssVar(name) {
    if (!cs) cs = getComputedStyle(document.documentElement);
    return cs.getPropertyValue(name).trim();
  }

  var C; // color cache, rebuilt on init
  function buildColors() {
    cs = getComputedStyle(document.documentElement);
    C = {
      nodeFill: cssVar("--color-bg-secondary"),
      nodeStroke: cssVar("--color-border-strong"),
      nodeHover: cssVar("--color-accent-subtle"),
      nodeAccent: cssVar("--color-accent"),
      edgeStroke: cssVar("--color-border-default"),
      edgeHighlight: cssVar("--color-accent"),
      labelFill: cssVar("--color-text-primary"),
      labelMuted: cssVar("--color-text-muted"),
      bgFill: cssVar("--color-bg-primary"),
      fontFamily: cssVar("--font-sans") || "system-ui, sans-serif",
      // status fills — one per idea status
      statusNew: cssVar("--color-bg-secondary"),
      statusConsidering: cssVar("--color-info-subtle"),
      statusPlanned: cssVar("--color-accent-subtle"),
      statusApproved: cssVar("--color-success-subtle"),
      statusRejected: cssVar("--color-error-subtle"),
      statusImplemented: cssVar("--color-success"),
      statusCancelled: cssVar("--color-border-default"),
    };
  }

  function statusFill(status) {
    var map = {
      new: C.statusNew,
      considering: C.statusConsidering,
      planned: C.statusPlanned,
      approved: C.statusApproved,
      rejected: C.statusRejected,
      implemented: C.statusImplemented,
      cancelled: C.statusCancelled,
    };
    return map[status] || C.nodeFill;
  }

  var NODE_R = 28;
  var FONT_SIZE = 11;
  var MAX_LABEL_WIDTH = 160; // screen px — labels wrap to a 2nd line beyond this
  var LINE_HEIGHT_FACTOR = 1.15;
  var MAX_LABEL_LINES = 2;
  var K_REPULSE = 4000;
  var K_SPRING = 0.04;
  var REST_LEN = 120;
  var K_CENTER = 0.005;
  var DAMPING = 0.82;

  // ── init ──────────────────────────────────────────────────────────────────

  function init() {
    canvas = document.getElementById("idea-graph-canvas");
    if (!canvas) return;

    // Guard: if parent has no dimensions yet, retry next frame
    var rect = canvas.parentElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      requestAnimationFrame(init);
      return;
    }

    ideas = JSON.parse(canvas.dataset.ideas || "[]");
    if (ideas.length === 0) return;

    buildColors();
    resize();

    // Build node list with random initial positions
    var cx = canvas.width / (2 * devicePixelRatio);
    var cy = canvas.height / (2 * devicePixelRatio);
    nodes = ideas.map(function (idea, i) {
      var angle = (i / ideas.length) * Math.PI * 2;
      var r = Math.min(cx, cy) * 0.5;
      return {
        id: idea.id,
        title: idea.title,
        status: idea.status || "new",
        links: idea.links || [],
        x: cx + Math.cos(angle) * r * (0.5 + Math.random() * 0.5),
        y: cy + Math.sin(angle) * r * (0.5 + Math.random() * 0.5),
        vx: 0,
        vy: 0,
        fixed: false,
      };
    });

    // Build edge list (deduplicated)
    var edgeSet = {};
    edges = [];
    nodes.forEach(function (n) {
      n.links.forEach(function (targetId) {
        var key = [n.id, targetId].sort().join("|");
        if (!edgeSet[key]) {
          edgeSet[key] = true;
          var target = nodes.find(function (m) {
            return m.id === targetId;
          });
          if (target) edges.push({ a: n, b: target });
        }
      });
    });

    zoom = 1;
    panX = 0;
    panY = 0;
    alpha = 1;

    bindEvents();
    bindControls();
    tick();
  }

  // ── simulation ────────────────────────────────────────────────────────────

  function tick() {
    if (!canvas) return;
    if (alpha > 0.001) simulate();
    render();
    animFrame = requestAnimationFrame(tick);
  }

  function simulate() {
    var cx = canvas.width / (2 * devicePixelRatio);
    var cy = canvas.height / (2 * devicePixelRatio);

    // Repulsion between all pairs
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var a = nodes[i], b = nodes[j];
        var dx = b.x - a.x, dy = b.y - a.y;
        var d2 = dx * dx + dy * dy || 1;
        var d = Math.sqrt(d2);
        var f = K_REPULSE / d2;
        var fx = (dx / d) * f, fy = (dy / d) * f;
        if (!a.fixed) {
          a.vx -= fx;
          a.vy -= fy;
        }
        if (!b.fixed) {
          b.vx += fx;
          b.vy += fy;
        }
      }
    }

    // Spring attraction along edges
    edges.forEach(function (e) {
      var dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var f = K_SPRING * (d - REST_LEN);
      var fx = (dx / d) * f, fy = (dy / d) * f;
      if (!e.a.fixed) {
        e.a.vx += fx;
        e.a.vy += fy;
      }
      if (!e.b.fixed) {
        e.b.vx -= fx;
        e.b.vy -= fy;
      }
    });

    // Centering force
    nodes.forEach(function (n) {
      if (n.fixed) return;
      n.vx += (cx - n.x) * K_CENTER;
      n.vy += (cy - n.y) * K_CENTER;
    });

    // Integrate + dampen
    nodes.forEach(function (n) {
      if (n.fixed) return;
      n.vx *= DAMPING;
      n.vy *= DAMPING;
      n.x += n.vx * alpha;
      n.y += n.vy * alpha;
    });

    alpha *= 0.995;
  }

  // ── render ────────────────────────────────────────────────────────────────

  // Greedy word-wrap up to MAX_LABEL_LINES. Caller must set ctx.font first.
  // Returns 1..MAX_LABEL_LINES strings; final line is ellipsized if overflow remains.
  function wrapLabel(text, maxWidth) {
    var words = String(text || "").split(/\s+/).filter(Boolean);
    if (words.length === 0) return [String(text || "")];

    var lines = [];
    var idx = 0;
    while (idx < words.length && lines.length < MAX_LABEL_LINES) {
      var lineText = "";
      while (idx < words.length) {
        var cand = lineText ? lineText + " " + words[idx] : words[idx];
        if (ctx.measureText(cand).width <= maxWidth) {
          lineText = cand;
          idx++;
        } else {
          break;
        }
      }
      if (!lineText) {
        // Current word alone overflows — force-fit by ellipsis on this line.
        lines.push(ellipsize(words[idx], maxWidth));
        idx++;
      } else {
        lines.push(lineText);
      }
    }

    // Words still remain — ellipsize the last accepted line with leftover hint.
    if (idx < words.length) {
      var tail = lines[lines.length - 1] + " " + words.slice(idx).join(" ");
      lines[lines.length - 1] = ellipsize(tail, maxWidth);
    }
    return lines;
  }

  // Strip trailing chars until `text + "…"` fits maxWidth. Caller must set ctx.font.
  function ellipsize(text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    var s = text;
    while (s.length > 1 && ctx.measureText(s + "…").width > maxWidth) {
      s = s.slice(0, -1);
    }
    return s.replace(/\s+$/, "") + "…";
  }

  function neighborSet(node) {
    var s = {};
    if (!node) return s;
    s[node.id] = true;
    edges.forEach(function (e) {
      if (e.a === node) s[e.b.id] = true;
      if (e.b === node) s[e.a.id] = true;
    });
    return s;
  }

  function render() {
    var dpr = devicePixelRatio || 1;
    var w = canvas.width / dpr;
    var h = canvas.height / dpr;

    var neighbors = hoveredNode ? neighborSet(hoveredNode) : null;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = C.bgFill;
    ctx.fillRect(0, 0, w, h);

    // Apply pan + zoom
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // Pass 1: edges — highlight connected, dim others on hover
    edges.forEach(function (e) {
      var isConnected = neighbors && (neighbors[e.a.id] && neighbors[e.b.id]);
      ctx.beginPath();
      ctx.moveTo(e.a.x, e.a.y);
      ctx.lineTo(e.b.x, e.b.y);
      if (neighbors) {
        if (isConnected) {
          ctx.strokeStyle = C.edgeHighlight;
          ctx.lineWidth = 2.5 / zoom;
          ctx.globalAlpha = 1;
        } else {
          ctx.strokeStyle = C.edgeStroke;
          ctx.lineWidth = 1 / zoom;
          ctx.globalAlpha = 0.15;
        }
      } else {
        ctx.strokeStyle = C.edgeStroke;
        ctx.lineWidth = 1 / zoom;
        ctx.globalAlpha = 1;
      }
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // Pass 2: node backgrounds + borders
    nodes.forEach(function (n) {
      var isDragging = n === draggingNode;
      var isHovered = n === hoveredNode;
      var isNeighbor = neighbors && neighbors[n.id];
      var dimmed = neighbors && !isNeighbor;

      ctx.globalAlpha = dimmed ? 0.25 : 1;
      ctx.beginPath();
      ctx.arc(n.x, n.y, NODE_R, 0, Math.PI * 2);
      ctx.fillStyle = isDragging || isHovered
        ? C.nodeHover
        : statusFill(n.status);
      ctx.fill();
      ctx.strokeStyle = isDragging || isHovered ? C.nodeAccent : C.nodeStroke;
      ctx.lineWidth = (isDragging || isHovered ? 2.5 : 1) / zoom;
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // Pass 3: labels — word-wrap up to MAX_LABEL_LINES, background rect masks
    // edges through letter gaps (Brain Memory: text glyphs aren't opaque to SVG/canvas siblings).
    ctx.font = FONT_SIZE / zoom + "px " + C.fontFamily;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var glyphH = FONT_SIZE / zoom;
    var lineH = glyphH * LINE_HEIGHT_FACTOR;
    var maxLabelW = MAX_LABEL_WIDTH / zoom;
    nodes.forEach(function (n) {
      var isDragging = n === draggingNode;
      var isHovered = n === hoveredNode;
      var isNeighbor = neighbors && neighbors[n.id];
      var dimmed = neighbors && !isNeighbor;

      ctx.globalAlpha = dimmed ? 0.25 : 1;
      var lines = wrapLabel(n.title, maxLabelW);
      var maxLineW = 0;
      for (var i = 0; i < lines.length; i++) {
        var lw = ctx.measureText(lines[i]).width;
        if (lw > maxLineW) maxLineW = lw;
      }
      var pad = 3 / zoom;
      var rectH = lineH * (lines.length - 1) + glyphH;
      ctx.fillStyle = isDragging || isHovered
        ? C.nodeHover
        : statusFill(n.status);
      ctx.fillRect(
        n.x - maxLineW / 2 - pad,
        n.y - rectH / 2 - pad,
        maxLineW + pad * 2,
        rectH + pad * 2,
      );
      ctx.fillStyle = dimmed ? C.labelMuted : C.labelFill;
      var firstY = n.y - (lineH * (lines.length - 1)) / 2;
      for (var k = 0; k < lines.length; k++) {
        ctx.fillText(lines[k], n.x, firstY + k * lineH);
      }
    });
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // ── resize ────────────────────────────────────────────────────────────────

  function resize() {
    var dpr = devicePixelRatio || 1;
    var rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    ctx = canvas.getContext("2d");
  }

  // ── hit test ──────────────────────────────────────────────────────────────

  function nodeAt(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var x = (clientX - rect.left - panX) / zoom;
    var y = (clientY - rect.top - panY) / zoom;
    for (var i = nodes.length - 1; i >= 0; i--) {
      var n = nodes[i];
      var dx = x - n.x, dy = y - n.y;
      if (dx * dx + dy * dy <= NODE_R * NODE_R) return n;
    }
    return null;
  }

  // ── events ────────────────────────────────────────────────────────────────

  function bindEvents() {
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);
  }

  function onMouseDown(e) {
    var n = nodeAt(e.clientX, e.clientY);
    if (n) {
      draggingNode = n;
      n.fixed = true;
      alpha = Math.max(alpha, 0.3);
    } else {
      panningBg = true;
      mouseStartX = e.clientX;
      mouseStartY = e.clientY;
      panOriginX = panX;
      panOriginY = panY;
    }
  }

  function onMouseMove(e) {
    if (draggingNode) {
      var rect = canvas.getBoundingClientRect();
      draggingNode.x = (e.clientX - rect.left - panX) / zoom;
      draggingNode.y = (e.clientY - rect.top - panY) / zoom;
    } else if (panningBg) {
      panX = panOriginX + (e.clientX - mouseStartX);
      panY = panOriginY + (e.clientY - mouseStartY);
      updateZoomLabel();
    } else {
      hoveredNode = nodeAt(e.clientX, e.clientY);
      canvas.style.cursor = hoveredNode ? "pointer" : "grab";
    }
  }

  function onMouseLeave() {
    hoveredNode = null;
    canvas.style.cursor = "grab";
  }

  function onMouseUp() {
    if (draggingNode) draggingNode.fixed = false;
    draggingNode = null;
    panningBg = false;
  }

  function onClick(e) {
    var n = nodeAt(e.clientX, e.clientY);
    if (n && !panningBg) {
      window.location.href = "/ideas/" + n.id;
    }
  }

  function onWheel(e) {
    e.preventDefault();
    var factor = e.deltaY < 0 ? 1.1 : 0.9;
    var rect = canvas.getBoundingClientRect();
    var mouseX = e.clientX - rect.left;
    var mouseY = e.clientY - rect.top;
    var oldZoom = zoom;
    zoom = Math.min(2, Math.max(0.1, zoom * factor));
    panX = mouseX - (mouseX - panX) * (zoom / oldZoom);
    panY = mouseY - (mouseY - panY) * (zoom / oldZoom);
    updateZoomLabel();
  }

  function onResize() {
    resize();
    render();
  }

  // ── controls ──────────────────────────────────────────────────────────────

  function updateZoomLabel() {
    var label = document.querySelector("[data-idea-graph-zoom]");
    var slider = document.querySelector("[data-idea-graph-slider]");
    if (label) label.textContent = Math.round(zoom * 100) + "%";
    if (slider) slider.value = String(zoom);
  }

  function resetView() {
    zoom = 1;
    panX = 0;
    panY = 0;
    updateZoomLabel();
  }

  function bindControls() {
    var resetBtn = document.querySelector("[data-idea-graph-reset]");
    var slider = document.querySelector("[data-idea-graph-slider]");
    if (resetBtn) resetBtn.addEventListener("click", resetView);
    if (slider) {
      slider.addEventListener("input", function (e) {
        zoom = parseFloat(e.target.value);
        updateZoomLabel();
      });
    }
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────

  function teardown() {
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
    if (canvas) {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
    }
    nodes = [];
    edges = [];
    canvas = null;
    ctx = null;
    hoveredNode = null;
    draggingNode = null;
  }

  function boot() {
    teardown();
    // rAF ensures CSS layout is complete before reading dimensions
    if (document.getElementById("idea-graph-canvas")) {
      requestAnimationFrame(init);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  document.addEventListener("htmx:afterSettle", boot);
})();
