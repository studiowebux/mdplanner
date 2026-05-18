// Persist the collapsible-filters open/closed state per domain.
// The native <details> element handles the visual toggle; this listener
// records the preference in the ui_state cookie via the /:domain/filters-collapsed
// endpoint so it survives navigation. The ui_state cookie is httpOnly, so the
// write must go through the server.
(function () {
  // `toggle` does not bubble — listen on the capture phase to catch it.
  document.addEventListener("toggle", function (e) {
    var details = e.target;
    if (!details || details.tagName !== "DETAILS") return;
    var domain = details.getAttribute("data-filter-collapse");
    if (!domain) return;
    var collapsed = details.open ? "false" : "true";
    fetch("/" + domain + "/filters-collapsed?filtersCollapsed=" + collapsed);
  }, true);
})();
