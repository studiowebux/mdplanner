// KPI gauge — sets fill width from data-pct via CSSOM (CSP-safe, no inline styles).
(function () {
  function init() {
    document.querySelectorAll("[data-pct]").forEach(function (el) {
      el.style.setProperty("width", el.getAttribute("data-pct") + "%");
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  document.addEventListener("htmx:afterSettle", init);
})();
