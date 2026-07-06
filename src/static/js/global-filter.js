// Global filter dropdowns — project + assignee multi-select in the topbar.
// HTML contract (rendered by components/shell/global-filter-dropdown.tsx):
//   [data-global-filter="<type>"]        — trigger button
//   [data-global-filter-panel="<type>"]  — floating panel (.is-hidden default)
//   [data-global-filter-search="<type>"] — search input inside the panel
//   [data-global-filter-all="<type>"]    — "All" button (visible options)
//   [data-global-filter-none="<type>"]   — "None" button (visible options)
//   [data-global-filter-list="<type>"]   — option list container
//   [data-global-filter-item="<type>"]   — <label> wrapping one checkbox
//   [data-global-filter-badge="<type>"]  — count badge on the trigger button
//
// Serialization is PURE htmx: the panels live in one shared <form> that POSTs
// on change, so FormData carries every checked box (see the .tsx component).
// This script only does UI: open/close, search, All/None, badge counts.
// Checkbox checked-state is rendered server-side; no client state sync needed.

(function () {
  var Core = globalThis.GlobalFilterCore;

  // -------------------------------------------------------------------------
  // Panel open/close (one open at a time)
  // -------------------------------------------------------------------------

  var openPanel = null;

  function panelEl(type) {
    return document.querySelector('[data-global-filter-panel="' + type + '"]');
  }

  function openFilterPanel(type) {
    if (openPanel && openPanel !== type) closeFilterPanel(openPanel);
    var panel = panelEl(type);
    if (panel) panel.classList.remove("is-hidden");
    openPanel = type;
  }

  function closeFilterPanel(type) {
    var panel = panelEl(type);
    if (panel) panel.classList.add("is-hidden");
    if (openPanel === type) openPanel = null;
  }

  function toggleFilterPanel(type) {
    var panel = panelEl(type);
    if (!panel) return;
    if (panel.classList.contains("is-hidden")) openFilterPanel(type);
    else closeFilterPanel(type);
  }

  // -------------------------------------------------------------------------
  // Badge — reflects the number of checked boxes in a panel
  // -------------------------------------------------------------------------

  function updateBadge(type) {
    var badge = document.querySelector(
      '[data-global-filter-badge="' + type + '"]',
    );
    if (!badge) return;
    var count = document.querySelectorAll(
      '[data-global-filter-item="' + type +
        '"] input[type="checkbox"]:checked',
    ).length;
    badge.textContent = String(count);
    badge.classList.toggle("is-hidden", count === 0);
  }

  // -------------------------------------------------------------------------
  // Search — hide options whose label does not match
  // -------------------------------------------------------------------------

  function applySearch(type, query) {
    var labels = document.querySelectorAll(
      '[data-global-filter-item="' + type + '"]',
    );
    labels.forEach(function (label) {
      var text = (label.textContent || "").trim();
      var visible = Core ? Core.matchesQuery(text, query) : true;
      label.classList.toggle("is-hidden", !visible);
    });
  }

  // -------------------------------------------------------------------------
  // All / None — toggle only the currently-visible (search-filtered) options,
  // then fire ONE change so the shared form POSTs the full state once.
  // -------------------------------------------------------------------------

  function setVisible(type, checked) {
    var labels = document.querySelectorAll(
      '[data-global-filter-item="' + type + '"]',
    );
    var changed = false;
    var lastBox = null;
    labels.forEach(function (label) {
      if (label.classList.contains("is-hidden")) return;
      var box = label.querySelector('input[type="checkbox"]');
      if (!box) return;
      if (box.checked !== checked) {
        box.checked = checked;
        changed = true;
      }
      lastBox = box;
    });
    updateBadge(type);
    if (changed && lastBox) {
      lastBox.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  // -------------------------------------------------------------------------
  // Wiring
  // -------------------------------------------------------------------------

  function init() {
    document.querySelectorAll("[data-global-filter]").forEach(function (btn) {
      updateBadge(btn.getAttribute("data-global-filter"));
    });

    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-global-filter]");
      if (btn) {
        e.stopPropagation();
        // Mutual exclusivity with the person switcher.
        var personDetails = document.getElementById("topbar-person-switcher");
        if (personDetails) personDetails.removeAttribute("open");
        toggleFilterPanel(btn.getAttribute("data-global-filter"));
        return;
      }

      var allBtn = e.target.closest("[data-global-filter-all]");
      if (allBtn) {
        setVisible(allBtn.getAttribute("data-global-filter-all"), true);
        return;
      }

      var noneBtn = e.target.closest("[data-global-filter-none]");
      if (noneBtn) {
        setVisible(noneBtn.getAttribute("data-global-filter-none"), false);
        return;
      }

      // Outside click closes the open panel.
      if (openPanel) {
        var panel = panelEl(openPanel);
        if (panel && !panel.contains(e.target)) closeFilterPanel(openPanel);
      }
    });

    // Search input — filter options. Stop its change from reaching the form so
    // typing never fires a filter POST (the search field carries no name).
    document.addEventListener("input", function (e) {
      var search = e.target.closest("[data-global-filter-search]");
      if (!search) return;
      applySearch(
        search.getAttribute("data-global-filter-search"),
        search.value,
      );
    });
    document.addEventListener("change", function (e) {
      var search = e.target.closest("[data-global-filter-search]");
      if (search) {
        e.stopPropagation();
        return;
      }
      // Checkbox toggled — recount its panel's badge.
      var item = e.target.closest("[data-global-filter-item]");
      if (item) updateBadge(item.getAttribute("data-global-filter-item"));
    }, true);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && openPanel) closeFilterPanel(openPanel);
    });

    var personDetails = document.getElementById("topbar-person-switcher");
    if (personDetails) {
      personDetails.addEventListener("toggle", function () {
        if (personDetails.open && openPanel) closeFilterPanel(openPanel);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
