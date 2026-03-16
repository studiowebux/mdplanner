// Domain filter — client-side filtering for card grids and data tables.
// Reads filter definitions from data-filter-key on <select> elements
// inside a [data-filter-domain] container. Hides non-matching cards and rows.
// Fully generic — no domain-specific class names.

(function () {
  function getFilterContainer(domain) {
    return document.querySelector("[data-filter-domain=\"" + domain + "\"]");
  }

  function getPageRoot(domain) {
    // The page root is the closest [data-domain] ancestor
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
        cards[i].style.display = "none";
        cards[i].setAttribute("data-filter-hidden", "");
      } else {
        cards[i].removeAttribute("data-filter-hidden");
        if (!cards[i].hasAttribute("data-search-hidden")) {
          cards[i].style.display = "";
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
        rows[j].style.display = "none";
        rows[j].setAttribute("data-filter-hidden", "");
      } else {
        rows[j].removeAttribute("data-filter-hidden");
        if (!rows[j].hasAttribute("data-search-hidden")) {
          rows[j].style.display = "";
          visibleRows++;
        }
      }
    }

    // Update count
    updateCount(page, cards.length || rows.length);
  }

  function updateCount(page, total) {
    var countEl = page.querySelector("[data-filter-count]");
    if (!countEl) return;
    var cards = page.querySelectorAll("[data-filterable-card]");
    var rows = page.querySelectorAll(".data-table__body .data-table__row");
    var items = cards.length > 0 ? cards : rows;
    var visible = 0;
    for (var i = 0; i < items.length; i++) {
      if (items[i].style.display !== "none") visible++;
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
    applyFilters(domain);
  });

  // Expose for programmatic use (e.g. after SSE updates)
  window.domainFilter = { apply: applyFilters };
})();
