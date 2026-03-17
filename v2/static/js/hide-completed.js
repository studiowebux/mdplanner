// Hide completed — toggle visibility of completed items in cards and table rows.
// Reads data-hide-completed="<domain>" checkbox and data-completed-status for the value.
// Persists preference to localStorage per domain.

(function () {
  var STORAGE_PREFIX = "hideCompleted:";

  function getPageRoot(domain) {
    var cb = document.querySelector("[data-hide-completed=\"" + domain + "\"]");
    if (!cb) return null;
    return cb.closest("[data-domain]") || cb.parentElement;
  }

  function apply(domain) {
    var cb = document.querySelector("[data-hide-completed=\"" + domain + "\"]");
    if (!cb) return;
    var status = cb.getAttribute("data-completed-status");
    var hide = cb.checked;
    var page = getPageRoot(domain);
    if (!page) return;

    // Cards
    var cards = page.querySelectorAll("[data-filterable-card]");
    for (var i = 0; i < cards.length; i++) {
      var cardStatus = cards[i].getAttribute("data-filter-status");
      if (cardStatus === status) {
        if (hide) {
          cards[i].classList.add("is-hidden");
          cards[i].setAttribute("data-completed-hidden", "");
        } else {
          cards[i].removeAttribute("data-completed-hidden");
          if (!cards[i].hasAttribute("data-filter-hidden") && !cards[i].hasAttribute("data-search-hidden")) {
            cards[i].classList.remove("is-hidden");
          }
        }
      }
    }

    // Table rows
    var rows = page.querySelectorAll(".data-table__body .data-table__row");
    for (var j = 0; j < rows.length; j++) {
      var rowStatus = rows[j].getAttribute("data-filter-status");
      if (rowStatus === status) {
        if (hide) {
          rows[j].classList.add("is-hidden");
          rows[j].setAttribute("data-completed-hidden", "");
        } else {
          rows[j].removeAttribute("data-completed-hidden");
          if (!rows[j].hasAttribute("data-filter-hidden") && !rows[j].hasAttribute("data-search-hidden")) {
            rows[j].classList.remove("is-hidden");
          }
        }
      }
    }

    // Update count
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

  // Init from localStorage
  function initAll() {
    var checkboxes = document.querySelectorAll("[data-hide-completed]");
    for (var i = 0; i < checkboxes.length; i++) {
      var domain = checkboxes[i].getAttribute("data-hide-completed");
      var saved = localStorage.getItem(STORAGE_PREFIX + domain);
      if (saved === "true") {
        checkboxes[i].checked = true;
        apply(domain);
      }
    }
  }

  document.addEventListener("change", function (e) {
    var cb = e.target.closest("[data-hide-completed]");
    if (!cb) return;
    var domain = cb.getAttribute("data-hide-completed");
    localStorage.setItem(STORAGE_PREFIX + domain, cb.checked);
    apply(domain);
  });

  window.hideCompleted = { apply: apply };

  initAll();
})();
