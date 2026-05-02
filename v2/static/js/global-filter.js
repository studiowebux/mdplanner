// Global filter dropdowns — project and assignee multi-select in the topbar.
// HTML contract:
//   [data-global-filter="projects"]      — trigger button
//   [data-global-filter-panel="projects"] — floating panel (.is-hidden by default)
//   [data-global-filter-item="projects"]  — <label><input type="checkbox" value="..."> inside panel
//   [data-global-filter-badge="projects"] — count badge span on trigger button
// Same pattern repeated for "assignees".

(function () {
  var COOKIE_NAME = "ui_state";
  var GLOBAL_KEY = "_global";
  var ENDPOINT = "/api/v1/settings/global-filters";

  // -------------------------------------------------------------------------
  // Cookie helpers
  // -------------------------------------------------------------------------

  function readCookie(name) {
    var match = document.cookie.match(
      new RegExp(
        "(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)",
      ),
    );
    return match ? decodeURIComponent(match[1]) : null;
  }

  function readGlobalState() {
    var raw = readCookie(COOKIE_NAME);
    if (!raw) return { globalProjects: [], globalAssignees: [] };
    try {
      var parsed = JSON.parse(raw);
      var g = (parsed && parsed[GLOBAL_KEY]) || {};
      return {
        globalProjects: Array.isArray(g.globalProjects) ? g.globalProjects : [],
        globalAssignees: Array.isArray(g.globalAssignees)
          ? g.globalAssignees
          : [],
      };
    } catch (_) {
      return { globalProjects: [], globalAssignees: [] };
    }
  }

  // -------------------------------------------------------------------------
  // Panel state
  // -------------------------------------------------------------------------

  var openPanel = null;

  function openFilterPanel(type) {
    if (openPanel && openPanel !== type) closeFilterPanel(openPanel);
    var panel = document.querySelector(
      '[data-global-filter-panel="' + type + '"]',
    );
    if (panel) panel.classList.remove("is-hidden");
    openPanel = type;
  }

  function closeFilterPanel(type) {
    var panel = document.querySelector(
      '[data-global-filter-panel="' + type + '"]',
    );
    if (panel) panel.classList.add("is-hidden");
    if (openPanel === type) openPanel = null;
  }

  function toggleFilterPanel(type) {
    var panel = document.querySelector(
      '[data-global-filter-panel="' + type + '"]',
    );
    if (!panel) return;
    if (panel.classList.contains("is-hidden")) {
      openFilterPanel(type);
    } else {
      closeFilterPanel(type);
    }
  }

  // -------------------------------------------------------------------------
  // Badge update
  // -------------------------------------------------------------------------

  function updateBadge(type, count) {
    var badge = document.querySelector(
      '[data-global-filter-badge="' + type + '"]',
    );
    if (!badge) return;
    badge.textContent = count;
    badge.classList.toggle("is-hidden", count === 0);
  }

  // -------------------------------------------------------------------------
  // Checkbox sync from cookie
  // -------------------------------------------------------------------------

  function syncCheckboxes() {
    var state = readGlobalState();
    syncType("projects", state.globalProjects);
    syncType("assignees", state.globalAssignees);
  }

  function syncType(type, activeValues) {
    var items = document.querySelectorAll(
      '[data-global-filter-item="' + type + '"] input[type="checkbox"]',
    );
    var count = 0;
    items.forEach(function (cb) {
      var checked = activeValues.indexOf(cb.value) !== -1;
      cb.checked = checked;
      if (checked) count++;
    });
    updateBadge(type, count);
  }

  // -------------------------------------------------------------------------
  // POST to server
  // -------------------------------------------------------------------------

  function getCheckedValues(type) {
    var items = document.querySelectorAll(
      '[data-global-filter-item="' + type + '"] input[type="checkbox"]:checked',
    );
    var values = [];
    items.forEach(function (cb) {
      values.push(cb.value);
    });
    return values;
  }

  function postFilters() {
    var projects = getCheckedValues("projects");
    var assignees = getCheckedValues("assignees");
    updateBadge("projects", projects.length);
    updateBadge("assignees", assignees.length);
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        globalProjects: projects,
        globalAssignees: assignees,
      }),
    }).then(function (res) {
      if (res.ok && typeof htmx !== "undefined") {
        htmx.trigger(document.body, "global-filter:changed");
      }
    });
  }

  // -------------------------------------------------------------------------
  // Event delegation
  // -------------------------------------------------------------------------

  function init() {
    syncCheckboxes();

    document.addEventListener("click", function (e) {
      // Trigger buttons
      var btn = e.target.closest("[data-global-filter]");
      if (btn) {
        e.stopPropagation();
        toggleFilterPanel(btn.getAttribute("data-global-filter"));
        return;
      }

      // Checkboxes inside panels
      var item = e.target.closest("[data-global-filter-item]");
      if (item) {
        // Let the checkbox change fire naturally, then POST
        setTimeout(postFilters, 0);
        return;
      }

      // Outside click — close any open panel
      if (openPanel) {
        var panel = document.querySelector(
          '[data-global-filter-panel="' + openPanel + '"]',
        );
        if (panel && !panel.contains(e.target)) {
          closeFilterPanel(openPanel);
        }
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && openPanel) closeFilterPanel(openPanel);
    });

    // Re-sync after htmx swaps (page navigations restore cookie state)
    document.addEventListener("htmx:afterSettle", syncCheckboxes);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
