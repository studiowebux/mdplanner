// View toggle — switches between grid and table views.
// State persisted in localStorage per domain (data-view-domain).

(function () {
  var STORAGE_PREFIX = "viewMode:";

  function apply(container, mode) {
    var grid = container.closest(".view-container")
      ? container.closest(".view-container").querySelector(".card-grid")
      : document.querySelector(".card-grid");
    var table = container.closest(".view-container")
      ? container.closest(".view-container").querySelector(".data-table-wrapper")
      : document.querySelector(".data-table-wrapper");

    if (grid) grid.style.display = mode === "grid" ? "" : "none";
    if (table) table.style.display = mode === "table" ? "" : "none";

    var btns = container.querySelectorAll("[data-view-mode]");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("view-toggle__btn--active", btns[i].getAttribute("data-view-mode") === mode);
    }
  }

  // Init from localStorage
  var toggles = document.querySelectorAll("[data-view-domain]");
  for (var i = 0; i < toggles.length; i++) {
    var domain = toggles[i].getAttribute("data-view-domain");
    var saved = localStorage.getItem(STORAGE_PREFIX + domain) || "grid";
    apply(toggles[i], saved);
  }

  // Click handler
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-view-mode]");
    if (!btn) return;
    var container = btn.closest("[data-view-domain]");
    if (!container) return;
    var domain = container.getAttribute("data-view-domain");
    var mode = btn.getAttribute("data-view-mode");
    localStorage.setItem(STORAGE_PREFIX + domain, mode);
    apply(container, mode);
  });
})();
