// htmx hooks — check swapped elements against active client-side filters.
// Only inspects the single element that was swapped, not the full page.

(function () {
  function isHiddenByFilter(el, domain) {
    var container = document.querySelector("[data-filter-domain=\"" + domain + "\"]");
    if (!container) return false;
    var selects = container.querySelectorAll("[data-filter-key]");
    for (var i = 0; i < selects.length; i++) {
      var key = selects[i].getAttribute("data-filter-key");
      var filterVal = selects[i].value;
      if (!filterVal) continue;
      var elVal = el.getAttribute("data-filter-" + key) || "";
      if (filterVal !== elVal) return true;
    }
    return false;
  }

  function isHiddenBySearch(el, domain) {
    var input = document.querySelector("[data-search-domain=\"" + domain + "\"]");
    if (!input || !input.value.trim()) return false;
    var query = input.value.trim().toLowerCase();
    return (el.textContent || "").toLowerCase().indexOf(query) === -1;
  }

  function isHiddenByCompleted(el, domain) {
    var cb = document.querySelector("[data-hide-completed=\"" + domain + "\"]");
    if (!cb || !cb.checked) return false;
    var status = cb.getAttribute("data-completed-status");
    return el.getAttribute("data-filter-status") === status;
  }

  document.addEventListener("htmx:oobAfterSwap", function (e) {
    var el = e.target;
    if (!el || !el.getAttribute) return;
    var page = el.closest("[data-domain]");
    if (!page) return;
    var domain = page.getAttribute("data-domain");

    if (isHiddenByFilter(el, domain) || isHiddenBySearch(el, domain) || isHiddenByCompleted(el, domain)) {
      el.classList.add("is-hidden");
    }
  });
})();
