// Note tabs — switches tab panels on click. Vanilla JS, no framework.

function initNoteTabs() {
  document.querySelectorAll("[data-note-tabs]").forEach(function (container) {
    var buttons = container.querySelectorAll("[data-tab-id]");
    var panels = container.querySelectorAll("[data-tab-panel]");

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var targetId = btn.dataset.tabId;

        buttons.forEach(function (b) {
          b.classList.toggle(
            "note-detail__tab-btn--active",
            b.dataset.tabId === targetId,
          );
          b.setAttribute(
            "aria-selected",
            b.dataset.tabId === targetId ? "true" : "false",
          );
        });

        panels.forEach(function (p) {
          p.classList.toggle("is-hidden", p.dataset.tabPanel !== targetId);
        });
      });
    });
  });
}

initNoteTabs();
document.addEventListener("htmx:afterSettle", initNoteTabs);
