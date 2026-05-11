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

  // --- Re-apply dragging class after htmx swaps #tasks-view mid-drag ---
  // SSE can trigger a view swap while a drag is in progress, which replaces
  // .task-list and removes task-list--dragging, hiding the drop strip.
  document.addEventListener("htmx:afterSwap", function (e) {
    if (
      dragTaskId &&
      e.detail &&
      e.detail.target &&
      e.detail.target.id === "tasks-view"
    ) {
      var list = document.querySelector(".task-list");
      if (list) list.classList.add(DRAG_CLASS);
    }
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
        var title = header.querySelector(".section-heading");
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

  // -- Helpers (always read elements from DOM — survives htmx swaps) ----------

  function getBar() {
    return document.getElementById("task-bulk-bar");
  }
  function getCountEl() {
    return document.getElementById("task-bulk-count");
  }
  function getSectionSelect() {
    return document.getElementById("task-bulk-section");
  }
  function getTagInput() {
    return document.getElementById("task-bulk-tag");
  }

  // -- Render -----------------------------------------------------------------

  function updateBar() {
    var bar = getBar();
    var countEl = getCountEl();
    if (!bar || !countEl) return;
    var n = selected.size;
    countEl.textContent = n + " selected";
    if (n > 0) {
      bar.classList.remove("is-hidden");
    } else {
      bar.classList.add("is-hidden");
    }
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
    // Update per-section select-all checkboxes
    var sectionCbs = document.querySelectorAll(
      ".task-list__select-all-section",
    );
    for (var i = 0; i < sectionCbs.length; i++) {
      var scb = sectionCbs[i];
      var section = scb.closest(".task-list__section");
      if (!section) continue;
      var sectionBoxes = section.querySelectorAll(".task-list__select");
      var checkedCount = 0;
      for (var j = 0; j < sectionBoxes.length; j++) {
        if (sectionBoxes[j].checked) checkedCount++;
      }
      if (checkedCount === 0) {
        scb.checked = false;
        scb.indeterminate = false;
      } else if (checkedCount === sectionBoxes.length) {
        scb.checked = true;
        scb.indeterminate = false;
      } else {
        scb.checked = false;
        scb.indeterminate = true;
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
    // Per-section select-all
    var scb = e.target.closest(".task-list__select-all-section");
    if (scb) {
      var section = scb.closest(".task-list__section");
      if (section) {
        var sectionBoxes = section.querySelectorAll(".task-list__select");
        for (var i = 0; i < sectionBoxes.length; i++) {
          var tid = sectionBoxes[i].getAttribute("data-task-id");
          if (tid) setRowSelected(tid, scb.checked);
        }
      }
      updateBar();
      return;
    }

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

  // -- Actions (event delegation — survives htmx swaps) ----------------------

  function bulkMove() {
    var sectionSelect = getSectionSelect();
    var section = sectionSelect ? sectionSelect.value : "";
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
        if (sectionSelect) sectionSelect.value = "";
      })
      .catch(function (err) {
        if (window.toast) {
          window.toast({ type: "error", message: "Failed to move tasks." });
        }
        console.debug("[task-list] batch move failed:", err);
      });
  }

  function bulkDelete() {
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
      })
      .catch(function (err) {
        if (window.toast) {
          window.toast({ type: "error", message: "Failed to delete tasks." });
        }
        console.debug("[task-list] batch delete failed:", err);
      });
  }

  function bulkTagAction(mode) {
    var tagInput = getTagInput();
    var tag = tagInput ? tagInput.value.trim() : "";
    if (!tag || selected.size === 0) return;

    var updates = Array.from(selected).map(function (id) {
      var row = document.querySelector(
        ".task-list__row[data-task-id='" + id + "']",
      );
      var current = [];
      if (row) {
        try {
          current = JSON.parse(row.getAttribute("data-tags") || "[]");
        } catch (_) {
          current = [];
        }
      }
      var next;
      if (mode === "add") {
        next = current.indexOf(tag) === -1 ? current.concat(tag) : current;
      } else {
        next = current.filter(function (t) {
          return t !== tag;
        });
      }
      return { id: id, updates: { tags: next } };
    });

    fetch("/api/v1/tasks/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Batch tag failed (" + res.status + ")");
        if (tagInput) tagInput.value = "";
        clearSelection();
      })
      .catch(function (err) {
        if (window.toast) {
          window.toast({ type: "error", message: "Failed to update tags." });
        }
        console.debug("[task-list] batch tag failed:", err);
      });
  }

  // Row click-to-select: clicking any non-interactive part of a row toggles its checkbox
  document.addEventListener("click", function (e) {
    var row = e.target.closest(".task-list__row[data-task-id]");
    if (!row) return;
    if (e.target.closest("a, button, select, input, label")) return;
    var taskId = row.getAttribute("data-task-id");
    if (!taskId) return;
    var cb = row.querySelector(".task-list__select");
    if (!cb) return;
    setRowSelected(taskId, !selected.has(taskId));
    updateBar();
  });

  // Single delegated click handler for all bulk bar buttons
  document.addEventListener("click", function (e) {
    var id = e.target.id;
    if (id === "task-bulk-move") {
      bulkMove();
      return;
    }
    if (id === "task-bulk-delete") {
      bulkDelete();
      return;
    }
    if (id === "task-bulk-clear") {
      clearSelection();
      return;
    }
    if (id === "task-bulk-tag-add") {
      bulkTagAction("add");
      return;
    }
    if (id === "task-bulk-tag-remove") {
      bulkTagAction("remove");
      return;
    }
  });

  // Tag input Enter key — also delegated
  document.addEventListener("keydown", function (e) {
    if (e.target.id === "task-bulk-tag" && e.key === "Enter") {
      e.preventDefault();
      bulkTagAction("add");
    }
  });

  // Clear selection state when view re-renders (bar hides automatically via updateBar)
  document.addEventListener("htmx:afterSettle", function (e) {
    if (e.detail && e.detail.target && e.detail.target.id === "tasks-view") {
      selected.clear();
      updateBar();
    }
  });
})();

// ---------------------------------------------------------------------------
// Task-list-specific shortcuts — x (toggle select), a (select all), Escape.
// j/k/g/G/Enter are handled by table-keyboard-nav.js (shared with all domains).
// ---------------------------------------------------------------------------

(function () {
  function inputFocused() {
    var el = document.activeElement;
    if (!el) return false;
    var tag = el.tagName;
    return (
      tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" ||
      el.isContentEditable
    );
  }

  document.addEventListener("keydown", function (e) {
    if (inputFocused()) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!document.querySelector(".task-list__row[data-task-id]")) return;

    switch (e.key) {
      case "x": {
        e.preventDefault();
        var focused = document.querySelector(".task-list__row--focused");
        if (focused) {
          var cb = focused.querySelector(".task-list__select");
          if (cb) {
            cb.checked = !cb.checked;
            cb.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
        break;
      }

      case "a": {
        e.preventDefault();
        var allCbs = Array.from(
          document.querySelectorAll(
            ".task-list__select:not(.task-list__select-all)",
          ),
        );
        var allChecked = allCbs.length > 0 &&
          allCbs.every(function (c) {
            return c.checked;
          });
        allCbs.forEach(function (c) {
          c.checked = !allChecked;
          c.dispatchEvent(new Event("change", { bubbles: true }));
        });
        break;
      }

      case "Escape": {
        var focusedRow = document.querySelector(".task-list__row--focused");
        if (focusedRow) focusedRow.classList.remove("task-list__row--focused");
        break;
      }
    }
  });

  // Jump pill — scroll the section into view below the sticky header.
  // The target (#section-xxx) is position:sticky itself, so getBoundingClientRect
  // and offsetTop both return the stuck position when scrolled past it. Use the
  // parent .task-list__section (non-sticky) as the reference element instead.
  document.addEventListener("click", function (e) {
    var pill = e.target.closest(".task-list__jump-pill");
    if (!pill) return;
    var href = pill.getAttribute("href");
    if (!href || href.charAt(0) !== "#") return;
    var target = document.getElementById(href.slice(1));
    if (!target) return;
    e.preventDefault();
    var stickyHeader = document.querySelector(".task-list__sticky-header");
    var stickyH = stickyHeader
      ? stickyHeader.getBoundingClientRect().height
      : 0;
    var scrollEl = document.querySelector(".app-shell__content");
    if (!scrollEl) {
      target.scrollIntoView();
      return;
    }
    var ref = target.closest(".task-list__section") || target;
    var scrollRect = scrollEl.getBoundingClientRect();
    var naturalTop = ref.getBoundingClientRect().top - scrollRect.top +
      scrollEl.scrollTop;
    scrollEl.scrollTo({ top: naturalTop - stickyH, behavior: "smooth" });
    history.replaceState(null, "", href);
  });
})();
