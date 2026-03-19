// Org chart drag-and-drop — delegated on document, survives htmx swaps.
// After a drop, PUT updates reportsTo via API. The API publishes an SSE
// event (person.updated) which the main element auto-refreshes from.

(function () {
  "use strict";

  var draggedId = null;

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
    });
  }

  // ── dragstart — only on orgchart nodes ────────────────────────────

  document.addEventListener("dragstart", function (e) {
    var node = e.target.closest(".orgchart-node[data-member-id]");
    if (!node) return;
    draggedId = node.dataset.memberId;
    node.classList.add("orgchart-dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", draggedId);
    var zone = document.getElementById("orgchartUnlinkZone");
    if (zone) zone.classList.add("active");
  });

  // ── dragend — cleanup ─────────────────────────────────────────────

  document.addEventListener("dragend", function (e) {
    if (!draggedId) return;
    var node = e.target.closest(".orgchart-node[data-member-id]");
    if (node) node.classList.remove("orgchart-dragging");
    draggedId = null;
    clearDropStates();
    var zone = document.getElementById("orgchartUnlinkZone");
    if (zone) zone.classList.remove("active", "drag-over");
  });

  // ── dragover — prevent default only inside org chart ──────────────

  document.addEventListener("dragover", function (e) {
    if (!draggedId || !inOrgChart(e)) return;

    var zone = e.target.closest("#orgchartUnlinkZone");
    if (zone) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      return;
    }

    var node = e.target.closest(".orgchart-node[data-member-id]");
    if (!node || node.dataset.memberId === draggedId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = isDescendantOf(
      draggedId,
      node.dataset.memberId,
    )
      ? "none"
      : "move";
  });

  // ── dragenter — visual feedback ───────────────────────────────────

  document.addEventListener("dragenter", function (e) {
    if (!draggedId || !inOrgChart(e)) return;

    var zone = e.target.closest("#orgchartUnlinkZone");
    if (zone) {
      e.preventDefault();
      zone.classList.add("drag-over");
      return;
    }

    var node = e.target.closest(".orgchart-node[data-member-id]");
    if (!node || node.dataset.memberId === draggedId) return;
    e.preventDefault();
    clearDropStates();
    if (isDescendantOf(draggedId, node.dataset.memberId)) {
      node.classList.add("orgchart-drop-invalid");
    } else {
      node.classList.add("orgchart-drop-target");
    }
  });

  // ── dragleave — clear visual feedback ─────────────────────────────

  document.addEventListener("dragleave", function (e) {
    if (!draggedId) return;

    var zone = e.target.closest("#orgchartUnlinkZone");
    if (zone && !zone.contains(e.relatedTarget)) {
      zone.classList.remove("drag-over");
      return;
    }

    var node = e.target.closest(".orgchart-node[data-member-id]");
    if (!node) return;
    if (e.relatedTarget && node.contains(e.relatedTarget)) return;
    node.classList.remove("orgchart-drop-target", "orgchart-drop-invalid");
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
})();
