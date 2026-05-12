// Bandwidth bars — sets fill widths from data-bw-main / data-bw-over via CSSOM (CSP-safe).
(function () {
  function init() {
    document.querySelectorAll("[data-bw-main]").forEach(function (el) {
      el.style.setProperty("width", el.getAttribute("data-bw-main") + "%");
    });
    document.querySelectorAll("[data-bw-over]").forEach(function (el) {
      el.style.setProperty("width", el.getAttribute("data-bw-over") + "%");
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  document.addEventListener("htmx:afterSettle", init);
})();
