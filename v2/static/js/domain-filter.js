// Domain filter — client-side filtering for card grids and data tables.
// Reads filter definitions from data-filter-key on <select> elements
// inside a [data-filter-domain] container. Hides non-matching cards and rows.
// Persists filter selections to localStorage per domain.
// Fully generic — no domain-specific class names.

(function () {
  var STORAGE_PREFIX = "filters:";

  function getFilterContainer(domain) {
    return document.querySelector("[data-filter-domain=\"" + domain + "\"]");
  }

  function getPageRoot(domain) {
    var filterBar = getFilterContainer(domain);
    if (!filterBar) return null;
    return filterBar.closest("[data-domain]") || filterBar.parentElement;
  }

  function getFilters(container) {
    var filters = {};
    var selects = container.querySelectorAll("[data-filter-key]");
    for (var i = 0; i < selects.length; i++) {
      var key = selects[i].getAttribute("data-filter-key");
      var val = selects[i].value;
      if (val) filters[key] = val;
    }
    return filters;
  }

  function saveFilters(domain, container) {
    var state = {};
    var selects = container.querySelectorAll("[data-filter-key]");
    for (var i = 0; i < selects.length; i++) {
      var key = selects[i].getAttribute("data-filter-key");
      state[key] = selects[i].value;
    }
    localStorage.setItem(STORAGE_PREFIX + domain, JSON.stringify(state));
  }

  function restoreFilters(domain) {
    var raw = localStorage.getItem(STORAGE_PREFIX + domain);
    if (!raw) return;
    var state;
    try { state = JSON.parse(raw); } catch (_) { return; }
    var container = getFilterContainer(domain);
    if (!container) return;
    var selects = container.querySelectorAll("[data-filter-key]");
    for (var i = 0; i < selects.length; i++) {
      var key = selects[i].getAttribute("data-filter-key");
      if (state[key] != null) {
        selects[i].value = state[key];
      }
    }
    applyFilters(domain);
  }

  function matchesFilters(el, filters) {
    for (var key in filters) {
      var val = el.getAttribute("data-filter-" + key);
      if (val == null) val = "";
      if (filters[key] === "__empty__") {
        if (val !== "") return false;
      } else if (val !== filters[key]) {
        return false;
      }
    }
    return true;
  }

  function applyFilters(domain) {
    var container = getFilterContainer(domain);
    if (!container) return;
    var filters = getFilters(container);
    var page = getPageRoot(domain);
    if (!page) return;

    // Filter cards
    var cards = page.querySelectorAll("[data-filterable-card]");
    var visibleCards = 0;
    for (var i = 0; i < cards.length; i++) {
      var show = matchesFilters(cards[i], filters);
      if (!show) {
        cards[i].classList.add("is-hidden");
        cards[i].setAttribute("data-filter-hidden", "");
      } else {
        cards[i].removeAttribute("data-filter-hidden");
        if (!cards[i].hasAttribute("data-search-hidden") && !cards[i].hasAttribute("data-completed-hidden")) {
          cards[i].classList.remove("is-hidden");
          visibleCards++;
        }
      }
    }

    // Filter table rows
    var rows = page.querySelectorAll(".data-table__body .data-table__row");
    var visibleRows = 0;
    for (var j = 0; j < rows.length; j++) {
      var showRow = matchesFilters(rows[j], filters);
      if (!showRow) {
        rows[j].classList.add("is-hidden");
        rows[j].setAttribute("data-filter-hidden", "");
      } else {
        rows[j].removeAttribute("data-filter-hidden");
        if (!rows[j].hasAttribute("data-search-hidden") && !rows[j].hasAttribute("data-completed-hidden")) {
          rows[j].classList.remove("is-hidden");
          visibleRows++;
        }
      }
    }

    // Update count
    updateCount(page);
  }

  function updateCount(page) {
    var countEl = page.querySelector("[data-filter-count]");
    if (!countEl) return;
    var cards = page.querySelectorAll("[data-filterable-card]");
    var rows = page.querySelectorAll(".data-table__body .data-table__row");
    var items = cards.length > 0 ? cards : rows;
    var visible = 0;
    for (var i = 0; i < items.length; i++) {
      if (!items[i].classList.contains("is-hidden")) visible++;
    }
    var totalCount = items.length;
    if (visible < totalCount) {
      countEl.textContent = visible + " of " + totalCount;
    } else {
      countEl.textContent = totalCount + " total";
    }
  }

  // Listen for filter changes
  document.addEventListener("change", function (e) {
    var select = e.target.closest("[data-filter-key]");
    if (!select) return;
    var container = select.closest("[data-filter-domain]");
    if (!container) return;
    var domain = container.getAttribute("data-filter-domain");
    saveFilters(domain, container);
    applyFilters(domain);
  });

  // Clear all filters
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-filter-clear]");
    if (!btn) return;
    var domain = btn.getAttribute("data-filter-clear");
    var container = getFilterContainer(domain);
    if (!container) return;
    var selects = container.querySelectorAll("[data-filter-key]");
    for (var i = 0; i < selects.length; i++) {
      selects[i].value = "";
    }
    saveFilters(domain, container);
    applyFilters(domain);
  });

  // Init — restore saved filters on page load
  function initAll() {
    var containers = document.querySelectorAll("[data-filter-domain]");
    for (var i = 0; i < containers.length; i++) {
      var domain = containers[i].getAttribute("data-filter-domain");
      restoreFilters(domain);
    }
  }

  window.domainFilter = { apply: applyFilters };

  initAll();
})();
