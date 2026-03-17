// Domain search — client-side text search across cards and table rows.
// Reads from input[data-search-domain] and hides non-matching items.
// Fully generic — no domain-specific class names.

(function () {
  var DEBOUNCE_MS = 150;
  var timer = null;

  function normalize(str) {
    return str.toLowerCase().trim();
  }

  function getPageRoot(input) {
    return input.closest("[data-domain]") || input.parentElement;
  }

  function applySearch(domain) {
    var input = document.querySelector("[data-search-domain=\"" + domain + "\"]");
    if (!input) return;
    var query = normalize(input.value);
    var page = getPageRoot(input);
    if (!page) return;

    // Search cards
    var cards = page.querySelectorAll("[data-filterable-card]");
    for (var i = 0; i < cards.length; i++) {
      var text = normalize(cards[i].textContent || "");
      var match = query.length === 0 || text.indexOf(query) !== -1;
      if (!match) {
        cards[i].classList.add("is-hidden");
        cards[i].setAttribute("data-search-hidden", "");
      } else {
        cards[i].removeAttribute("data-search-hidden");
        if (!cards[i].hasAttribute("data-filter-hidden")) {
          cards[i].classList.remove("is-hidden");
        }
      }
    }

    // Search table rows
    var rows = page.querySelectorAll(".data-table__body .data-table__row");
    for (var j = 0; j < rows.length; j++) {
      var rowText = normalize(rows[j].textContent || "");
      var showRow = query.length === 0 || rowText.indexOf(query) !== -1;
      if (!showRow) {
        rows[j].classList.add("is-hidden");
        rows[j].setAttribute("data-search-hidden", "");
      } else {
        rows[j].removeAttribute("data-search-hidden");
        if (!rows[j].hasAttribute("data-filter-hidden")) {
          rows[j].classList.remove("is-hidden");
        }
      }
    }

    // Update count via shared logic
    var countEl = page.querySelector("[data-filter-count]");
    if (countEl) {
      var items = cards.length > 0 ? cards : rows;
      var visible = 0;
      for (var k = 0; k < items.length; k++) {
        if (!items[k].classList.contains("is-hidden")) visible++;
      }
      if (visible < items.length) {
        countEl.textContent = visible + " of " + items.length;
      } else {
        countEl.textContent = items.length + " total";
      }
    }
  }

  document.addEventListener("input", function (e) {
    var input = e.target.closest("[data-search-domain]");
    if (!input) return;
    var domain = input.getAttribute("data-search-domain");
    clearTimeout(timer);
    timer = setTimeout(function () { applySearch(domain); }, DEBOUNCE_MS);
  });

  window.domainSearch = { apply: applySearch };
})();
