// Task list — bulk selection + list-specific keyboard shortcuts.
// Drag-and-drop reorder/move is handled declaratively by SortableJS + htmx
// (see sortable-init.js and the POST /tasks/reorder endpoint), not here.

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

  // -- Actions (event delegation — survives htmx swaps) ----------------------

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

  // Bulk bar: Clear is JS (resets selection state); Move/Tag/Delete are htmx.
  document.addEventListener("click", function (e) {
    var id = e.target.id;
    if (id === "task-bulk-clear") {
      clearSelection();
      return;
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
// Keys are read from window.keybindings.nav (keybindings.js).
// j/k/g/G/Enter are handled by table-keyboard-nav.js (shared with all domains).
// ---------------------------------------------------------------------------

(function () {
  var nav = (window.keybindings && window.keybindings.nav) || {};
  var KEY_SELECT = nav.select || "x";
  var KEY_SELECT_ALL = nav.selectAll || "a";

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

    var key = e.key;
    switch (key) {
      case KEY_SELECT: {
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

      case KEY_SELECT_ALL: {
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
