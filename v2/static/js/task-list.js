// Task list drag-and-drop — drag rows to section headers or bottom drop zones.
// Auto-scrolls near the top edge of the viewport during drag.

(function () {
  var SCROLL_ZONE = 60; // px from top edge to trigger auto-scroll
  var SCROLL_SPEED = 8;
  var DRAG_CLASS = "task-list--dragging";
  var OVER_CLASS = "task-list__drop-zone--over";
  var HEADER_OVER_CLASS = "task-list__section-header--drag-over";
  var scrollContainer = null;
  var scrollInterval = null;
  var dragTaskId = null;

  function getScrollContainer() {
    if (!scrollContainer) {
      scrollContainer = document.querySelector(".app-shell__content");
    }
    return scrollContainer;
  }

  // --- Drag start ---
  document.addEventListener("dragstart", function (e) {
    var row = e.target.closest(".task-list__row[data-task-id]");
    if (!row) return;
    dragTaskId = row.getAttribute("data-task-id");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dragTaskId);
    row.classList.add("task-list__row--dragging");
    // Show drop strip
    var list = row.closest(".task-list");
    if (list) list.classList.add(DRAG_CLASS);
  });

  // --- Drag end (cleanup) ---
  document.addEventListener("dragend", function (e) {
    var row = e.target.closest(".task-list__row");
    if (row) row.classList.remove("task-list__row--dragging");
    // Hide drop strip
    var lists = document.querySelectorAll("." + DRAG_CLASS);
    for (var i = 0; i < lists.length; i++) {
      lists[i].classList.remove(DRAG_CLASS);
    }
    // Clear all highlights
    clearAllHighlights();
    stopAutoScroll();
    dragTaskId = null;
  });

  // --- Drag over (allow drop + auto-scroll) ---
  document.addEventListener("dragover", function (e) {
    if (!dragTaskId) return;
    var zone = e.target.closest("[data-drop-section]");
    var header = e.target.closest(".task-list__section-header");
    if (zone || header) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
    // Auto-scroll near top edge only (bottom reserved for drop strip)
    var sc = getScrollContainer();
    if (sc) {
      var rect = sc.getBoundingClientRect();
      var mouseY = e.clientY - rect.top;
      if (mouseY < SCROLL_ZONE && mouseY >= 0) {
        startAutoScroll(-SCROLL_SPEED, sc);
      } else {
        stopAutoScroll();
      }
    }
  });

  // --- Drag enter/leave for visual highlights ---
  document.addEventListener("dragenter", function (e) {
    if (!dragTaskId) return;
    var zone = e.target.closest("[data-drop-section]");
    if (zone) {
      clearAllHighlights();
      zone.classList.add(OVER_CLASS);
      return;
    }
    var header = e.target.closest(".task-list__section-header");
    if (header) {
      clearAllHighlights();
      header.classList.add(HEADER_OVER_CLASS);
    }
  });

  document.addEventListener("dragleave", function (e) {
    var zone = e.target.closest("[data-drop-section]");
    if (zone && !zone.contains(e.relatedTarget)) {
      zone.classList.remove(OVER_CLASS);
    }
    var header = e.target.closest(".task-list__section-header");
    if (header && !header.contains(e.relatedTarget)) {
      header.classList.remove(HEADER_OVER_CLASS);
    }
  });

  // --- Drop ---
  document.addEventListener("drop", function (e) {
    if (!dragTaskId) return;
    e.preventDefault();
    var section = null;
    var zone = e.target.closest("[data-drop-section]");
    if (zone) {
      section = zone.getAttribute("data-drop-section");
    } else {
      var header = e.target.closest(".task-list__section-header");
      if (header) {
        var title = header.querySelector(".task-list__section-title");
        section = title ? title.textContent.trim() : null;
      }
    }
    if (!section) return;
    clearAllHighlights();
    moveTask(dragTaskId, section);
  });

  // --- Move task via fetch + refresh ---
  function moveTask(taskId, section) {
    var body = new FormData();
    body.append("section", section);
    fetch("/tasks/" + taskId + "/move", { method: "POST", body: body })
      .then(function (res) {
        if (!res.ok) throw new Error("Move failed (" + res.status + ")");
        // Trigger htmx refresh of the task view
        var view = document.getElementById("tasks-view");
        if (view) htmx.trigger(view, "refresh");
      })
      .catch(function (err) {
        if (window.toast) {
          window.toast({ type: "error", message: "Failed to move task." });
        }
        console.debug("[task-list] move failed:", err);
      });
  }

  // --- Auto-scroll helpers ---
  function startAutoScroll(speed, container) {
    if (scrollInterval) return;
    scrollInterval = setInterval(function () {
      container.scrollTop += speed;
    }, 16);
  }

  function stopAutoScroll() {
    if (scrollInterval) {
      clearInterval(scrollInterval);
      scrollInterval = null;
    }
  }

  function clearAllHighlights() {
    var zones = document.querySelectorAll("." + OVER_CLASS);
    for (var i = 0; i < zones.length; i++) {
      zones[i].classList.remove(OVER_CLASS);
    }
    var headers = document.querySelectorAll("." + HEADER_OVER_CLASS);
    for (var j = 0; j < headers.length; j++) {
      headers[j].classList.remove(HEADER_OVER_CLASS);
    }
  }
})();

// ---------------------------------------------------------------------------
// Bulk task selection
// ---------------------------------------------------------------------------

(function () {
  var selected = new Set();

  var bar = document.getElementById("task-bulk-bar");
  var countEl = document.getElementById("task-bulk-count");
  var sectionSelect = document.getElementById("task-bulk-section");
  var moveBtn = document.getElementById("task-bulk-move");
  var deleteBtn = document.getElementById("task-bulk-delete");
  var clearBtn = document.getElementById("task-bulk-clear");

  if (
    !bar || !countEl || !sectionSelect || !moveBtn || !deleteBtn || !clearBtn
  ) {
    return;
  }

  // -- Render -----------------------------------------------------------------

  function updateBar() {
    var n = selected.size;
    countEl.textContent = n + " selected";
    if (n > 0) {
      bar.classList.remove("is-hidden");
    } else {
      bar.classList.add("is-hidden");
    }
    // Sync select-all checkbox state
    var allBoxes = document.querySelectorAll(
      ".task-list__select:not(.task-list__select-all)",
    );
    var selectAll = document.querySelector(".task-list__select-all");
    if (selectAll) {
      if (n === 0) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
      } else if (n === allBoxes.length) {
        selectAll.checked = true;
        selectAll.indeterminate = false;
      } else {
        selectAll.checked = false;
        selectAll.indeterminate = true;
      }
    }
  }

  function setRowSelected(taskId, on) {
    var row = document.querySelector(
      ".task-list__row[data-task-id='" + taskId + "']",
    );
    if (!row) return;
    var cb = row.querySelector(".task-list__select");
    if (on) {
      selected.add(taskId);
      row.classList.add("task-list__row--selected");
      if (cb) cb.checked = true;
    } else {
      selected.delete(taskId);
      row.classList.remove("task-list__row--selected");
      if (cb) cb.checked = false;
    }
  }

  function clearSelection() {
    var ids = Array.from(selected);
    for (var i = 0; i < ids.length; i++) {
      setRowSelected(ids[i], false);
    }
    updateBar();
  }

  // -- Checkbox events --------------------------------------------------------

  document.addEventListener("change", function (e) {
    var cb = e.target.closest(".task-list__select");
    if (!cb) return;

    if (cb.classList.contains("task-list__select-all")) {
      var allBoxes = document.querySelectorAll(
        ".task-list__select:not(.task-list__select-all)",
      );
      for (var i = 0; i < allBoxes.length; i++) {
        var tid = allBoxes[i].getAttribute("data-task-id");
        if (tid) setRowSelected(tid, cb.checked);
      }
    } else {
      var taskId = cb.getAttribute("data-task-id");
      if (taskId) setRowSelected(taskId, cb.checked);
    }
    updateBar();
  });

  // Prevent drag triggering when clicking checkbox
  document.addEventListener("mousedown", function (e) {
    if (e.target.closest(".task-list__select")) {
      var row = e.target.closest(".task-list__row");
      if (row) row.setAttribute("draggable", "false");
    }
  });
  document.addEventListener("mouseup", function (e) {
    var row = e.target.closest(".task-list__row");
    if (row) row.setAttribute("draggable", "true");
  });

  // -- Actions ----------------------------------------------------------------

  function refreshView() {
    var view = document.getElementById("tasks-view");
    if (view) htmx.trigger(view, "refresh");
  }

  moveBtn.addEventListener("click", function () {
    var section = sectionSelect.value;
    if (!section || selected.size === 0) return;

    var updates = Array.from(selected).map(function (id) {
      return { id: id, updates: { section: section } };
    });

    fetch("/api/v1/tasks/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Batch move failed (" + res.status + ")");
        clearSelection();
        sectionSelect.value = "";
        refreshView();
      })
      .catch(function (err) {
        if (window.toast) {
          window.toast({ type: "error", message: "Failed to move tasks." });
        }
        console.debug("[task-list] batch move failed:", err);
      });
  });

  deleteBtn.addEventListener("click", function () {
    if (selected.size === 0) return;
    var n = selected.size;
    if (
      !confirm(
        "Delete " + n + " task" + (n === 1 ? "" : "s") +
          "? This cannot be undone.",
      )
    ) return;

    var ids = Array.from(selected);
    var chain = Promise.resolve();
    ids.forEach(function (id) {
      chain = chain.then(function () {
        return fetch("/api/v1/tasks/" + id, { method: "DELETE" });
      });
    });

    chain
      .then(function () {
        clearSelection();
        refreshView();
      })
      .catch(function (err) {
        if (window.toast) {
          window.toast({ type: "error", message: "Failed to delete tasks." });
        }
        console.debug("[task-list] batch delete failed:", err);
      });
  });

  clearBtn.addEventListener("click", function () {
    clearSelection();
  });

  // Re-init after htmx swaps (tasks-view re-renders)
  document.addEventListener("htmx:afterSettle", function (e) {
    if (e.detail && e.detail.target && e.detail.target.id === "tasks-view") {
      selected.clear();
      bar = document.getElementById("task-bulk-bar");
      countEl = document.getElementById("task-bulk-count");
      sectionSelect = document.getElementById("task-bulk-section");
      moveBtn = document.getElementById("task-bulk-move");
      deleteBtn = document.getElementById("task-bulk-delete");
      clearBtn = document.getElementById("task-bulk-clear");
      if (bar) bar.classList.add("is-hidden");
    }
  });
})();
