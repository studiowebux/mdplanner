// Note tabs — event-delegated click handler. No init needed, works on
// any dynamically loaded content (sidenav, htmx swaps, etc.).

(function () {
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-tab-id]");
    if (!btn || btn.getAttribute("role") !== "tab") return;

    var container = btn.closest("[data-note-tabs]");
    if (!container) return;

    var targetId = btn.dataset.tabId;

    // Toggle active button
    container.querySelectorAll("[data-tab-id][role='tab']").forEach(
      function (b) {
        b.classList.toggle(
          "note-detail__tab-btn--active",
          b.dataset.tabId === targetId,
        );
        b.setAttribute(
          "aria-selected",
          b.dataset.tabId === targetId ? "true" : "false",
        );
      },
    );

    // Toggle panels
    container.querySelectorAll("[data-tab-panel]").forEach(function (p) {
      p.classList.toggle("is-hidden", p.dataset.tabPanel !== targetId);
    });
  });
})();
