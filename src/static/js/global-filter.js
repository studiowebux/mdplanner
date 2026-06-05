// Global filter dropdowns — project and assignee multi-select in the topbar.
// HTML contract:
//   [data-global-filter="projects"]      — trigger button
//   [data-global-filter-panel="projects"] — floating panel (.is-hidden by default)
//   [data-global-filter-item="projects"]  — <label><input type="checkbox" value="..."> inside panel
//   [data-global-filter-badge="projects"] — count badge span on trigger button
// Same pattern repeated for "assignees".

(function () {
  // -------------------------------------------------------------------------
  // Initial state from server-rendered data-active attributes.
  // ui_state cookie is httpOnly — JS cannot read it.
  // -------------------------------------------------------------------------

  function readActiveAttr(type) {
    var panel = document.querySelector(
      '[data-global-filter-panel="' + type + '"]',
    );
    if (!panel) return [];
    try {
      var val = JSON.parse(panel.getAttribute("data-active") || "[]");
      return Array.isArray(val) ? val : [];
    } catch (_) {
      return [];
    }
  }

  function readGlobalState() {
    return {
      globalProjects: readActiveAttr("projects"),
      globalAssignees: readActiveAttr("assignees"),
    };
  }

  // -------------------------------------------------------------------------
  // In-memory filter state — source of truth after page load.
  // Reading from cookie on every htmx:afterSettle caused a race: an SSE-
  // triggered view reload could fire syncCheckboxes before the POST response
  // had updated the cookie, unchecking boxes the user had just checked.
  // -------------------------------------------------------------------------

  var memState = null; // null = not yet initialised

  function getMemState() {
    if (memState === null) memState = readGlobalState();
    return memState;
  }

  function setMemState(projects, assignees) {
    memState = { globalProjects: projects, globalAssignees: assignees };
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
    var state = getMemState();
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
  // Local UI state on change. The network POST is handled by htmx (hx-post on
  // the filter wrap); the server replies HX-Trigger: global-filter:changed,
  // which the domain-view listeners (from:body) use to reload.
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

  function onFilterChange() {
    var projects = getCheckedValues("projects");
    var assignees = getCheckedValues("assignees");
    updateBadge("projects", projects.length);
    updateBadge("assignees", assignees.length);
    // Update in-memory state immediately so syncCheckboxes called by any
    // concurrent htmx:afterSettle does not revert the user's selection.
    setMemState(projects, assignees);
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
        // Mutual exclusivity: opening a filter closes the person switcher so
        // two topbar popups are never open at once.
        var personDetails = document.getElementById("topbar-person-switcher");
        if (personDetails) personDetails.removeAttribute("open");
        toggleFilterPanel(btn.getAttribute("data-global-filter"));
        return;
      }

      // Checkboxes inside panels
      var item = e.target.closest("[data-global-filter-item]");
      if (item) {
        // Let the checkbox change fire naturally (htmx posts on change), then
        // refresh badges + in-memory state.
        setTimeout(onFilterChange, 0);
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

    // Mutual exclusivity: opening the person switcher closes any open filter.
    var personDetails = document.getElementById("topbar-person-switcher");
    if (personDetails) {
      personDetails.addEventListener("toggle", function () {
        if (personDetails.open && openPanel) closeFilterPanel(openPanel);
      });
    }

    // Re-sync after htmx swaps (page navigations restore cookie state)
    document.addEventListener("htmx:afterSettle", syncCheckboxes);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
