// c4-layout.js — pure force-directed layout for the C4 canvas (no DOM, no SVG).
// Operates on plain node/edge arrays so the physics is unit-testable. Exposed
// as globalThis.C4Layout so it works both as a classic browser script (loaded
// BEFORE c4-canvas.js) and as a Deno import in tests.
//
//   node = { x, y, vx, vy, ... }   (mutated in place)
//   edge = { s, t }                (indices into nodes)
//
// Box dimensions (boxW/boxH) are passed in by the caller so they stay a single
// source of truth in c4-canvas.js (matching the --c4-box-w/h CSS vars); BOX_GAP
// and the SIM_* tuning constants are owned here.

(function (root) {
  "use strict";

  // Force simulation tuning.
  var SIM_TICKS = 400;
  var SIM_ALPHA_DECAY = 0.012;
  var SIM_REPULSION = 18000;
  var SIM_SPRING_LEN = 360;
  var SIM_SPRING_K = 0.04;
  var SIM_CENTER_K = 0.012;
  var SIM_COLLISION_ITER = 3;
  var BOX_GAP = 60; // min gap between boxes (collision separation)
  var DEFAULT_BOX_W = 224;
  var DEFAULT_BOX_H = 128;

  // One physics tick at the given alpha. Mutates node.x/y/vx/vy in place.
  function simulateTick(nodes, edges, alpha, boxW, boxH) {
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
    edges.forEach(function (e) {
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
          var minSepX = boxW + BOX_GAP;
          var minSepY = boxH + BOX_GAP;
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

  // Run the full simulation (SIM_TICKS ticks with decaying alpha). Mutates node
  // positions in place. opts.boxW/boxH default to the C4 box dimensions.
  function simulate(nodes, edges, opts) {
    opts = opts || {};
    var boxW = opts.boxW != null ? opts.boxW : DEFAULT_BOX_W;
    var boxH = opts.boxH != null ? opts.boxH : DEFAULT_BOX_H;
    var alpha = 1.0;
    for (var tick = 0; tick < SIM_TICKS; tick++) {
      alpha *= 1 - SIM_ALPHA_DECAY;
      simulateTick(nodes, edges, alpha, boxW, boxH);
    }
  }

  root.C4Layout = {
    SIM_TICKS: SIM_TICKS,
    SIM_ALPHA_DECAY: SIM_ALPHA_DECAY,
    SIM_REPULSION: SIM_REPULSION,
    SIM_SPRING_LEN: SIM_SPRING_LEN,
    SIM_SPRING_K: SIM_SPRING_K,
    SIM_CENTER_K: SIM_CENTER_K,
    SIM_COLLISION_ITER: SIM_COLLISION_ITER,
    BOX_GAP: BOX_GAP,
    simulateTick: simulateTick,
    simulate: simulate,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
