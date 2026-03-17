// Column toggle — show/hide data table columns per domain.
// Reads data-column-domain on the toggle container. Persists to localStorage.

(function () {
  var STORAGE_PREFIX = "columns:";

  function getState(domain, totalCols) {
    var raw = localStorage.getItem(STORAGE_PREFIX + domain);
    if (raw) {
      try { return JSON.parse(raw); } catch (_) { /* ignore */ }
    }
    // Default: all visible
    var state = {};
    for (var i = 0; i < totalCols; i++) state[i] = true;
    return state;
  }

  function saveState(domain, state) {
    localStorage.setItem(STORAGE_PREFIX + domain, JSON.stringify(state));
  }

  function applyColumns(domain) {
    var table = document.querySelector("[data-column-table=\"" + domain + "\"]");
    if (!table) return;
    var ths = table.querySelectorAll(".data-table__th");
    var state = getState(domain, ths.length);

    // Apply to header
    for (var i = 0; i < ths.length; i++) {
      if (state[i] === false) { ths[i].classList.add("is-hidden"); } else { ths[i].classList.remove("is-hidden"); }
    }

    // Apply to body rows
    var rows = table.querySelectorAll(".data-table__row");
    for (var r = 0; r < rows.length; r++) {
      var cells = rows[r].querySelectorAll(".data-table__td");
      for (var c = 0; c < cells.length; c++) {
        if (state[c] === false) { cells[c].classList.add("is-hidden"); } else { cells[c].classList.remove("is-hidden"); }
      }
    }

    // Update checkbox states
    var checkboxes = document.querySelectorAll("[data-column-domain=\"" + domain + "\"] [data-col-index]");
    for (var j = 0; j < checkboxes.length; j++) {
      var idx = parseInt(checkboxes[j].getAttribute("data-col-index"), 10);
      checkboxes[j].checked = state[idx] !== false;
    }
  }

  // Init all column toggles on page
  function initAll() {
    var tables = document.querySelectorAll("[data-column-table]");
    for (var i = 0; i < tables.length; i++) {
      var domain = tables[i].getAttribute("data-column-table");
      applyColumns(domain);
    }
  }

  // Toggle dropdown open/close
  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-column-trigger]");
    if (trigger) {
      var domain = trigger.getAttribute("data-column-trigger");
      var dropdown = document.querySelector("[data-column-dropdown=\"" + domain + "\"]");
      if (dropdown) {
        dropdown.classList.toggle("is-open");
      }
      e.stopPropagation();
      return;
    }

    // Close open dropdowns when clicking outside
    if (!e.target.closest("[data-column-dropdown]")) {
      var openDropdowns = document.querySelectorAll("[data-column-dropdown].is-open");
      for (var i = 0; i < openDropdowns.length; i++) {
        openDropdowns[i].classList.remove("is-open");
      }
    }
  });

  // Checkbox change
  document.addEventListener("change", function (e) {
    var cb = e.target.closest("[data-col-index]");
    if (!cb) return;
    var container = cb.closest("[data-column-domain]");
    if (!container) return;
    var domain = container.getAttribute("data-column-domain");
    var table = document.querySelector("[data-column-table=\"" + domain + "\"]");
    if (!table) return;

    var ths = table.querySelectorAll(".data-table__th");
    var state = getState(domain, ths.length);
    var idx = parseInt(cb.getAttribute("data-col-index"), 10);
    state[idx] = cb.checked;
    saveState(domain, state);
    applyColumns(domain);
  });

  // Expose for SSE updates (reapply after row swap)
  window.columnToggle = { apply: applyColumns, init: initAll };

  // Init on load
  initAll();
})();
