// GitHub tabs — set active class via htmx:beforeRequest so it fires reliably
// even when htmx intercepts the click before it bubbles to document.
document.addEventListener("htmx:beforeRequest", function (e) {
  var tab = e.detail.elt;
  if (!tab || !tab.hasAttribute("data-github-tab")) return;
  var tabs = tab.closest(".github-tabs");
  if (!tabs) return;
  tabs.querySelectorAll("[data-github-tab]").forEach(function (b) {
    b.classList.remove("github-tabs__btn--active");
  });
  tab.classList.add("github-tabs__btn--active");
});

// Refresh button — re-trigger the currently active tab.
document.addEventListener("click", function (e) {
  var refresh = e.target.closest("[data-github-refresh]");
  if (!refresh) return;
  var container = refresh.closest(".github-tabs");
  if (!container) return;
  var active = container.querySelector(".github-tabs__btn--active");
  if (active && window.htmx) window.htmx.trigger(active, "click");
});
