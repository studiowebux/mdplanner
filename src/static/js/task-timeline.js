// Task timeline — reads data attributes and applies CSS custom properties
// for bar/marker/chart positioning. CSSOM setProperty() is not blocked by CSP.

function applyTimelinePositions() {
  var inner = document.querySelector(".task-timeline__chart-inner");
  if (inner) {
    inner.style.setProperty("min-width", inner.dataset.minWidth + "px");
  }

  document.querySelectorAll("[data-left]").forEach(function (el) {
    el.style.setProperty("left", el.dataset.left);
  });

  document.querySelectorAll("[data-width]").forEach(function (el) {
    el.style.setProperty("width", el.dataset.width);
  });

  drawDependencyLines(document, true);
}

// ---------------------------------------------------------------------------
// Dependency lines — SVG paths from blocker bar end to blocked bar start
// Accepts a root (document or iframe doc) and optional hover binding flag.
// Exposed globally as window.drawDependencyLines for use by export script.
// ---------------------------------------------------------------------------

var SVG_NS = "http://www.w3.org/2000/svg";
var DEP_ARROW_SIZE_DEFAULT = 5;

// Map of taskId -> array of SVG elements (paths + arrows) connected to that task
var depElements = {};

function drawDependencyLines(root, withHover) {
  var svg = root.querySelector(".task-timeline__deps");
  if (!svg) return;

  // Clear previous lines and hover state
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  if (withHover) {
    depElements = {};
    unbindDepHover();
  }

  var inner = svg.closest(".task-timeline__chart-inner");
  if (!inner) return;
  var innerRect = inner.getBoundingClientRect();

  // Size SVG to match the chart inner container
  svg.setAttribute("width", innerRect.width);
  svg.setAttribute("height", innerRect.height);

  var arrowSize = DEP_ARROW_SIZE_DEFAULT;
  try {
    var v = parseFloat(
      getComputedStyle(root.documentElement)
        .getPropertyValue("--task-dep-arrow-size"),
    );
    if (v > 0) arrowSize = v;
  } catch (e) {
    console.debug("[task-timeline] CSS var read failed:", e);
  }

  var rows = inner.querySelectorAll(".task-timeline__row[data-blocked-by]");
  rows.forEach(function (row) {
    var blockedId = row.dataset.taskId;
    var blockerIds = row.dataset.blockedBy.split(",");
    var blockedBar = row.querySelector(".task-timeline__bar");
    if (!blockedBar) return;
    var blockedRect = blockedBar.getBoundingClientRect();

    blockerIds.forEach(function (blockerId) {
      var blockerRow = inner.querySelector(
        '.task-timeline__row[data-task-id="' + blockerId + '"]',
      );
      if (!blockerRow) return;
      var blockerBar = blockerRow.querySelector(".task-timeline__bar");
      if (!blockerBar) return;
      var blockerRect = blockerBar.getBoundingClientRect();

      // Compute positions relative to chart inner container
      var x1 = blockerRect.right - innerRect.left;
      var y1 = blockerRect.top + blockerRect.height / 2 - innerRect.top;
      var x2 = blockedRect.left - innerRect.left;
      var y2 = blockedRect.top + blockedRect.height / 2 - innerRect.top;

      // Horizontal offset for the bezier control points
      var dx = Math.abs(x2 - x1) * 0.4;
      // If bars overlap horizontally, route the line down/up with more curve
      if (x2 < x1) dx = Math.max(30, Math.abs(y2 - y1) * 0.5);

      var path = root.createElementNS
        ? root.createElementNS(SVG_NS, "path")
        : document.createElementNS(SVG_NS, "path");
      path.setAttribute(
        "d",
        "M" + x1 + "," + y1 +
          " C" + (x1 + dx) + "," + y1 +
          " " + (x2 - dx) + "," + y2 +
          " " + x2 + "," + y2,
      );
      path.setAttribute("class", "task-timeline__dep-line");
      svg.appendChild(path);

      // Small arrowhead at the end point
      var arrow = root.createElementNS
        ? root.createElementNS(SVG_NS, "polygon")
        : document.createElementNS(SVG_NS, "polygon");
      arrow.setAttribute(
        "points",
        (x2 - arrowSize) + "," + (y2 - arrowSize / 2) + " " +
          x2 + "," + y2 + " " +
          (x2 - arrowSize) + "," + (y2 + arrowSize / 2),
      );
      arrow.setAttribute("class", "task-timeline__dep-arrow");
      svg.appendChild(arrow);

      if (withHover) {
        // Track which SVG elements belong to each task for hover
        var pair = [path, arrow];
        if (!depElements[blockedId]) depElements[blockedId] = [];
        depElements[blockedId].push(pair);
        if (!depElements[blockerId]) depElements[blockerId] = [];
        depElements[blockerId].push(pair);
      }
    });
  });

  if (withHover) bindDepHover(inner);
}

// Expose for use by export script (namespaced to avoid global pollution)
window.__mdp = window.__mdp || {};
window.__mdp.drawDependencyLines = drawDependencyLines;

// ---------------------------------------------------------------------------
// Hover highlight — bold connected lines on row mouseenter
// ---------------------------------------------------------------------------

var boundRows = [];

function onRowEnter() {
  var taskId = this.dataset.taskId;
  var els = depElements[taskId];
  if (!els) return;
  for (var i = 0; i < els.length; i++) {
    for (var j = 0; j < els[i].length; j++) {
      els[i][j].classList.add("task-timeline__dep--active");
    }
  }
}

function onRowLeave() {
  var taskId = this.dataset.taskId;
  var els = depElements[taskId];
  if (!els) return;
  for (var i = 0; i < els.length; i++) {
    for (var j = 0; j < els[i].length; j++) {
      els[i][j].classList.remove("task-timeline__dep--active");
    }
  }
}

function bindDepHover(inner) {
  var rows = inner.querySelectorAll(".task-timeline__row[data-task-id]");
  rows.forEach(function (row) {
    if (!depElements[row.dataset.taskId]) return;
    row.addEventListener("mouseenter", onRowEnter);
    row.addEventListener("mouseleave", onRowLeave);
    boundRows.push(row);
  });
}

function unbindDepHover() {
  boundRows.forEach(function (row) {
    row.removeEventListener("mouseenter", onRowEnter);
    row.removeEventListener("mouseleave", onRowLeave);
  });
  boundRows = [];
}

document.addEventListener("DOMContentLoaded", applyTimelinePositions);
document.addEventListener("htmx:afterSettle", applyTimelinePositions);
