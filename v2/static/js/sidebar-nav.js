// Sidebar — filter input, category collapse persistence.

(function () {
  var COLLAPSE_KEY = "sidebarGroups";

  function init() {
    var sidebar = document.getElementById("app-sidebar");
    if (!sidebar) return;

    // -- Filter --
    var filter = document.getElementById("sidebar-filter");
    if (filter) {
      filter.addEventListener("input", function () {
        var query = filter.value.toLowerCase().trim();
        var items = sidebar.querySelectorAll(".sidebar__item");
        var groups = sidebar.querySelectorAll(".sidebar__group");

        items.forEach(function (item) {
          var text = item.textContent.toLowerCase();
          item.classList.toggle(
            "is-hidden",
            query !== "" && text.indexOf(query) === -1,
          );
        });

        groups.forEach(function (group) {
          var visible = group.querySelectorAll(
            ".sidebar__item:not(.is-hidden)",
          );
          group.classList.toggle(
            "is-hidden",
            query !== "" && visible.length === 0,
          );
        });
      });
    }

    // -- Group collapse persistence --
    var groups = sidebar.querySelectorAll(".sidebar__group[id]");
    var saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(COLLAPSE_KEY) || "{}");
    } catch (err) {
      console.warn("[sidebar] failed to parse collapse state:", err);
      saved = {};
    }

    groups.forEach(function (group) {
      // Restore saved state
      if (saved[group.id] === false) {
        group.removeAttribute("open");
      }

      group.addEventListener("toggle", function () {
        saved[group.id] = group.open;
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify(saved));
      });
    });
  }

  init();

  // Re-init after htmx swaps the sidebar (pin toggle).
  document.body.addEventListener("htmx:afterSwap", function (e) {
    if (e.detail.target && e.detail.target.id === "app-sidebar") {
      init();
    }
  });
})();
