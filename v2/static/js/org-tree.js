// Org chart drag-and-drop — delegated on document, survives htmx swaps.
// After a drop, PUT updates reportsTo via API. The API publishes an SSE
// event (person.updated) which the main element auto-refreshes from.

(function () {
  "use strict";

  var draggedId = null;
  var currentDropTargetId = null;

  // ── Zoom / Pan state ──────────────────────────────────────────────

  var zoom = 1;
  var panX = 0;
  var panY = 0;
  var isPanning = false;
  var panStartX = 0;
  var panStartY = 0;
  var panOriginX = 0;
  var panOriginY = 0;

  function applyTransform() {
    var vp = document.getElementById("orgchartViewport");
    if (vp) {
      vp.style.transform = "translate(" + panX + "px, " + panY + "px) scale(" +
        zoom + ")";
    }
  }

  function updateZoomLabel() {
    var label = document.getElementById("orgchartZoomLabel");
    if (label) label.textContent = Math.round(zoom * 100) + "%";
    var slider = document.getElementById("orgchartZoom");
    if (slider) slider.value = String(zoom);
  }

  function fitToViewport() {
    var container = document.getElementById("orgchartContainer");
    var vp = document.getElementById("orgchartViewport");
    if (!container || !vp) return;

    // Reset transform to measure natural positions
    vp.style.transform = "translate(0px, 0px) scale(1)";
    void vp.offsetHeight; // force reflow

    // Compute true bounding box from all rendered nodes
    var nodes = vp.querySelectorAll(".orgchart-node");
    if (nodes.length === 0) return;

    var vpRect = vp.getBoundingClientRect();
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(function (node) {
      var r = node.getBoundingClientRect();
      var left = r.left - vpRect.left;
      var top = r.top - vpRect.top;
      if (left < minX) minX = left;
      if (top < minY) minY = top;
      if (left + r.width > maxX) maxX = left + r.width;
      if (top + r.height > maxY) maxY = top + r.height;
    });

    // Add padding around content (tree has internal padding + connectors need space)
    var pad = parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--space-xl",
          ),
        ) * 16 || 32;
    var contentW = maxX - minX + pad * 2;
    var contentH = maxY - minY + pad * 2;
    minX -= pad;
    minY -= pad;
    if (contentW === 0 || contentH === 0) return;

    // Available space — use container's actual dimensions
    var controls = container.querySelector(".orgchart-controls");
    var controlsH = controls ? controls.offsetHeight : 0;
    var availW = container.clientWidth;
    var availH = container.clientHeight - controlsH;

    // Scale to fit — cap at 1
    var scaleX = availW / contentW;
    var scaleY = availH / contentH;
    zoom = Math.min(scaleX, scaleY, 1);
    zoom = Math.max(zoom, 0.1);

    // Center: offset so the content bounding box is centered
    var scaledW = contentW * zoom;
    var scaledH = contentH * zoom;
    panX = (availW - scaledW) / 2 - minX * zoom;
    panY = (availH - scaledH) / 2 - minY * zoom;

    applyTransform();
    updateZoomLabel();
  }

  // ── Zoom slider ───────────────────────────────────────────────────

  document.addEventListener("input", function (e) {
    if (e.target.id !== "orgchartZoom") return;
    zoom = parseFloat(e.target.value);
    applyTransform();
    updateZoomLabel();
  });

  // ── Fit button ────────────────────────────────────────────────────

  document.addEventListener("click", function (e) {
    if (e.target.id !== "orgchartFit" && !e.target.closest("#orgchartFit")) {
      return;
    }
    fitToViewport();
  });

  // ── Pan (mousedown on empty container space) ──────────────────────

  document.addEventListener("mousedown", function (e) {
    if (draggedId) return;
    var container = e.target.closest("#orgchartContainer");
    if (!container) return;
    if (e.target.closest(".orgchart-node")) return;
    if (e.target.closest(".orgchart-controls")) return;
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panOriginX = panX;
    panOriginY = panY;
    container.style.cursor = "grabbing";
    e.preventDefault();
  });

  document.addEventListener("mousemove", function (e) {
    if (!isPanning) return;
    panX = panOriginX + (e.clientX - panStartX);
    panY = panOriginY + (e.clientY - panStartY);
    applyTransform();
  });

  document.addEventListener("mouseup", function () {
    if (!isPanning) return;
    isPanning = false;
    var container = document.getElementById("orgchartContainer");
    if (container) container.style.cursor = "";
  });

  // ── Wheel zoom ────────────────────────────────────────────────────

  document.addEventListener("wheel", function (e) {
    var container = e.target.closest("#orgchartContainer");
    if (!container) return;
    if (e.target.closest(".orgchart-controls")) return;
    e.preventDefault();

    var oldZoom = zoom;
    // Multiplicative zoom — smooth and proportional to scroll speed
    var factor = 1 - e.deltaY * 0.001;
    zoom = Math.min(2, Math.max(0.25, zoom * factor));

    // Zoom towards cursor: keep the point under the mouse fixed
    var rect = container.getBoundingClientRect();
    var mouseX = e.clientX - rect.left;
    var mouseY = e.clientY - rect.top;
    panX = mouseX - (mouseX - panX) * (zoom / oldZoom);
    panY = mouseY - (mouseY - panY) * (zoom / oldZoom);

    applyTransform();
    updateZoomLabel();
  }, { passive: false });

  /** Check if event target is inside the org chart area. */
  function inOrgChart(e) {
    return !!(
      e.target.closest("#orgchartContainer") ||
      e.target.closest("#orgchartUnlinkZone")
    );
  }

  function isDescendantOf(sourceId, targetId) {
    var sourceWrapper = document.querySelector(
      '.orgchart-node[data-member-id="' + sourceId + '"]',
    );
    if (!sourceWrapper) return false;
    sourceWrapper = sourceWrapper.closest(".orgchart-node-wrapper");
    if (!sourceWrapper) return false;
    return !!sourceWrapper.querySelector(
      '.orgchart-node[data-member-id="' + targetId + '"]',
    );
  }

  function clearDropStates() {
    document
      .querySelectorAll(".orgchart-drop-target, .orgchart-drop-invalid")
      .forEach(function (el) {
        el.classList.remove("orgchart-drop-target", "orgchart-drop-invalid");
      });
  }

  function updateReportsTo(personId, newManagerId) {
    // API expects JSON body. SSE person.updated event auto-refreshes the view.
    fetch("/api/v1/people/" + personId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportsTo: newManagerId != null ? newManagerId : "",
      }),
    }).then(function (res) {
      if (res.ok && window.toast) {
        window.toast({
          type: "success",
          message: newManagerId
            ? "Reporting structure updated"
            : "Manager removed",
        });
      }
    });
  }

  // ── Drop target tracking — update visuals only when target changes ──

  function setDropTarget(id) {
    if (id === currentDropTargetId) return;
    clearDropStates();
    currentDropTargetId = id;
    if (!id) return;
    var node = document.querySelector(
      '.orgchart-node[data-member-id="' + id + '"]',
    );
    if (!node) return;
    if (isDescendantOf(draggedId, id)) {
      node.classList.add("orgchart-drop-invalid");
    } else {
      node.classList.add("orgchart-drop-target");
    }
  }

  // ── dragstart ─────────────────────────────────────────────────────

  document.addEventListener("dragstart", function (e) {
    var node = e.target.closest(".orgchart-node[data-member-id]");
    if (!node) return;
    draggedId = node.dataset.memberId;
    currentDropTargetId = null;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", draggedId);

    // Custom ghost — clone at current zoom scale outside the transformed viewport
    document.documentElement.style.setProperty("--orgchart-current-zoom", zoom);
    var ghost = node.cloneNode(true);
    var ghostW = Math.round(node.offsetWidth * zoom);
    var ghostH = Math.round(node.offsetHeight * zoom);
    ghost.classList.add("orgchart-drag-ghost");
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, ghostW / 2, ghostH / 2);
    setTimeout(function () {
      document.body.removeChild(ghost);
    }, 0);

    // Delay visual change so ghost captures clean state
    setTimeout(function () {
      node.classList.add("orgchart-dragging");
      var tree = document.querySelector(".orgchart-tree");
      if (tree) tree.classList.add("orgchart-is-dragging");
      var zone = document.getElementById("orgchartUnlinkZone");
      if (zone) zone.classList.add("active");
    }, 0);
  });

  // ── dragend — cleanup ─────────────────────────────────────────────

  document.addEventListener("dragend", function (e) {
    if (!draggedId) return;
    var node = e.target.closest(".orgchart-node[data-member-id]");
    if (node) node.classList.remove("orgchart-dragging");
    var tree = document.querySelector(".orgchart-tree");
    if (tree) tree.classList.remove("orgchart-is-dragging");
    draggedId = null;
    setDropTarget(null);
    var zone = document.getElementById("orgchartUnlinkZone");
    if (zone) zone.classList.remove("active", "drag-over");
  });

  // ── dragover — preventDefault + track target via ID ───────────────

  document.addEventListener("dragover", function (e) {
    if (!draggedId || !inOrgChart(e)) return;

    var zone = e.target.closest("#orgchartUnlinkZone");
    if (zone) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDropTarget(null);
      zone.classList.add("drag-over");
      return;
    }

    var node = e.target.closest(".orgchart-node[data-member-id]");
    if (!node || node.dataset.memberId === draggedId) {
      setDropTarget(null);
      return;
    }

    e.preventDefault();
    var targetId = node.dataset.memberId;
    e.dataTransfer.dropEffect = isDescendantOf(draggedId, targetId)
      ? "none"
      : "move";
    setDropTarget(targetId);
  });

  // ── dragleave — only for unlink zone ──────────────────────────────

  document.addEventListener("dragleave", function (e) {
    if (!draggedId) return;
    var zone = e.target.closest("#orgchartUnlinkZone");
    if (zone && !zone.contains(e.relatedTarget)) {
      zone.classList.remove("drag-over");
    }
  });

  // ── drop — reparent or unlink ─────────────────────────────────────

  document.addEventListener("drop", function (e) {
    if (!draggedId || !inOrgChart(e)) return;

    var zone = e.target.closest("#orgchartUnlinkZone");
    if (zone) {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove("drag-over");
      updateReportsTo(draggedId, null);
      return;
    }

    var node = e.target.closest(".orgchart-node[data-member-id]");
    if (!node || node.dataset.memberId === draggedId) return;
    e.preventDefault();
    e.stopPropagation();
    var targetId = node.dataset.memberId;
    if (isDescendantOf(draggedId, targetId)) return;
    updateReportsTo(draggedId, targetId);
  });

  // ── Canvas lifecycle — single entry point ───────────────────────

  var isOrgActive = false;
  var canvasSized = false;

  /**
   * Single function handles all org chart states:
   * - First entry: calculate canvas height, set CSS var on :root, fit content
   * - Already active (filter/SSE): refit content (height persists via :root var)
   * - No org container: clean up
   */
  function syncOrgView() {
    var container = document.getElementById("orgchartContainer");

    if (!container) {
      if (isOrgActive) {
        isOrgActive = false;
        canvasSized = false;
        document.documentElement.style.removeProperty(
          "--orgchart-canvas-height",
        );
      }
      return;
    }

    // Calculate and set canvas height once on :root — survives htmx swaps
    if (!canvasSized) {
      var top = container.getBoundingClientRect().top;
      var cs = getComputedStyle(container);
      var borderV = parseFloat(cs.borderTopWidth) +
        parseFloat(cs.borderBottomWidth);
      var page = container.closest(".domain-page");
      var padB = page ? parseFloat(getComputedStyle(page).paddingBottom) : 0;
      var h = window.innerHeight - top - borderV - padB;
      document.documentElement.style.setProperty(
        "--orgchart-canvas-height",
        h + "px",
      );
      canvasSized = true;
    }

    isOrgActive = true;
    fitToViewport();
  }

  document.addEventListener("DOMContentLoaded", syncOrgView);
  document.addEventListener("htmx:afterSettle", syncOrgView);
})();
