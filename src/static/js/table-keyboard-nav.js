// table-keyboard-nav.js — unified vim-style j/k/g/G/Enter row navigation.
// Nav keys are read from window.keybindings.nav (keybindings.js).
// Handles both the task list (.task-list__row[data-task-id]) and all domain
// DataTable views (.data-table__row[data-row-id]).  Only one spec is active
// per page — whichever has rows in the DOM wins.
//
// task-list.js retains x/a/Escape/jump-pill shortcuts (task-specific).
// Those read the focused row via .task-list__row--focused from the DOM.

(function () {
  var nav = (window.keybindings && window.keybindings.nav) || {};
  var KEY_DOWN = nav.down || "j";
  var KEY_UP = nav.up || "k";
  var KEY_TOP = nav.top || "g";
  var KEY_BOTTOM = nav.bottom || "G";

  var SPECS = [
    {
      selector: ".task-list__row[data-task-id]",
      focusedClass: "task-list__row--focused",
      stickySelector: ".task-list__sticky-header",
      navigate: function (row) {
        var id = row.getAttribute("data-task-id");
        if (id) window.location.href = "/tasks/" + id;
      },
    },
    {
      selector: ".data-table__row[data-row-id]",
      focusedClass: "data-table__row--focused",
      stickySelector: null,
      navigate: function (row) {
        var id = row.getAttribute("data-row-id");
        var table = row.closest("[data-column-table]");
        var domain = table ? table.getAttribute("data-column-table") : null;
        if (id && domain) window.location.href = "/" + domain + "/" + id;
      },
    },
  ];

  var focusedIndex = -1;
  var activeSpec = null;

  function getActiveSpec() {
    for (var i = 0; i < SPECS.length; i++) {
      if (document.querySelector(SPECS[i].selector)) return SPECS[i];
    }
    return null;
  }

  function getRows(spec) {
    return Array.from(document.querySelectorAll(spec.selector));
  }

  function clearFocus(spec, rows) {
    rows = rows || getRows(spec);
    for (var i = 0; i < rows.length; i++) {
      rows[i].classList.remove(spec.focusedClass);
    }
  }

  function setFocus(spec, index) {
    var rows = getRows(spec);
    if (rows.length === 0) return;
    if (index < 0) index = 0;
    if (index >= rows.length) index = rows.length - 1;
    clearFocus(spec, rows);
    focusedIndex = index;
    rows[focusedIndex].classList.add(spec.focusedClass);

    var scrollEl = document.querySelector(".app-shell__content");
    if (!scrollEl) {
      rows[focusedIndex].scrollIntoView({ block: "nearest" });
      return;
    }

    var stickyHeader = spec.stickySelector
      ? document.querySelector(spec.stickySelector)
      : null;
    var headerH = stickyHeader
      ? stickyHeader.getBoundingClientRect().height
      : 0;
    var scrollRect = scrollEl.getBoundingClientRect();
    var rowRect = rows[focusedIndex].getBoundingClientRect();
    var rowOffsetTop = rowRect.top - scrollRect.top + scrollEl.scrollTop;
    var rowBottom = rowOffsetTop + rowRect.height;
    var visibleTop = scrollEl.scrollTop + headerH;
    var visibleBottom = scrollEl.scrollTop + scrollEl.clientHeight;
    if (rowOffsetTop < visibleTop) {
      scrollEl.scrollTop = rowOffsetTop - headerH - 4;
    } else if (rowBottom > visibleBottom) {
      scrollEl.scrollTop = rowBottom - scrollEl.clientHeight + 4;
    }
  }

  function inputFocused() {
    var el = document.activeElement;
    if (!el) return false;
    var tag = el.tagName;
    return (
      tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" ||
      el.isContentEditable
    );
  }

  function buildKeyActions() {
    var actions = {};
    actions[KEY_DOWN] = function (spec, rows) {
      setFocus(spec, focusedIndex < 0 ? 0 : focusedIndex + 1);
    };
    actions[KEY_UP] = function (spec, rows) {
      setFocus(spec, focusedIndex < 0 ? rows.length - 1 : focusedIndex - 1);
    };
    actions[KEY_TOP] = function (spec) {
      setFocus(spec, 0);
    };
    actions[KEY_BOTTOM] = function (spec, rows) {
      setFocus(spec, rows.length - 1);
    };
    actions["Enter"] = function (spec, rows) {
      if (focusedIndex >= 0 && rows[focusedIndex]) {
        spec.navigate(rows[focusedIndex]);
      }
    };
    return actions;
  }

  var KEY_ACTIONS = buildKeyActions();

  document.addEventListener("keydown", function (e) {
    if (inputFocused()) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    var action = KEY_ACTIONS[e.key];
    if (!action) return;

    var spec = getActiveSpec();
    if (!spec) return;

    var rows = getRows(spec);
    if (rows.length === 0) return;

    e.preventDefault();
    action(spec, rows);
  });

  // Reset when htmx swaps in new row content.
  document.addEventListener("htmx:afterSettle", function (e) {
    var target = e.detail && e.detail.target ? e.detail.target : e.target;
    if (!target || !target.querySelector) return;
    for (var i = 0; i < SPECS.length; i++) {
      if (target.querySelector(SPECS[i].selector)) {
        focusedIndex = -1;
        activeSpec = null;
        return;
      }
    }
  });
})();
