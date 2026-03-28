// Sidenav — open/close via data attributes, ESC key, dirty state tracking,
// visual dirty indicator, and resize handle.

(function () {
  var dirtyNavs = {};

  function getOpenSidenav() {
    return document.querySelector(".sidenav.is-open");
  }

  function openSidenav(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    dirtyNavs[id] = false;
    updateDirtyIndicator(el, false);
    trackDirty(el, id);
  }

  function closeSidenav(el) {
    if (!el) return;
    var id = el.id;
    if (dirtyNavs[id]) {
      window.confirmAction({
        title: "Unsaved changes",
        message: "You have unsaved changes. Close anyway?",
        confirmLabel: "Discard",
      }).then(function (ok) {
        if (ok) forceClose(el);
      });
      return;
    }
    forceClose(el);
  }

  function forceClose(el) {
    el.classList.remove("is-open");
    el.setAttribute("aria-hidden", "true");
    dirtyNavs[el.id] = false;
    updateDirtyIndicator(el, false);
  }

  function updateDirtyIndicator(el, dirty) {
    var title = el.querySelector(".sidenav__title");
    if (!title) return;
    if (dirty) {
      title.classList.add("sidenav__title--dirty");
    } else {
      title.classList.remove("sidenav__title--dirty");
    }
  }

  // Store handler references per sidenav ID so we can remove before re-adding
  var dirtyHandlers = {};

  function trackDirty(el, id) {
    // Remove previous listeners if they exist (prevents stacking after discard)
    if (dirtyHandlers[id] && dirtyHandlers[id].el) {
      dirtyHandlers[id].el.removeEventListener("input", dirtyHandlers[id].fn);
      dirtyHandlers[id].el.removeEventListener("change", dirtyHandlers[id].fn);
    }
    var markDirty = function () {
      dirtyNavs[id] = true;
      updateDirtyIndicator(el, true);
    };
    el.addEventListener("input", markDirty);
    el.addEventListener("change", markDirty);
    dirtyHandlers[id] = { el: el, fn: markDirty };
  }

  // Reset dirty state on successful form submit (called by domain form JS).
  window.sidenavResetDirty = function (id) {
    dirtyNavs[id] = false;
    var el = document.getElementById(id);
    if (el) updateDirtyIndicator(el, false);
  };

  // Click handlers — open + close
  document.addEventListener("click", function (e) {
    var openBtn = e.target.closest("[data-sidenav-open]");
    if (openBtn) {
      var id = openBtn.getAttribute("data-sidenav-open");
      openSidenav(id);
      return;
    }

    var closeBtn = e.target.closest("[data-sidenav-close]");
    if (closeBtn) {
      var el = closeBtn.closest(".sidenav");
      closeSidenav(el);
    }
  });

  // Detect htmx-swapped sidenavs that render already open (domain factory forms).
  // afterSettle (not afterSwap) — content must be in the DOM before querying.
  document.addEventListener("htmx:afterSettle", function (e) {
    var target = e.detail.target || e.target;
    var nav = target.querySelector
      ? target.querySelector(".sidenav.is-open")
      : null;
    if (
      !nav && target.classList && target.classList.contains("sidenav") &&
      target.classList.contains("is-open")
    ) {
      nav = target;
    }
    if (nav && nav.id) {
      dirtyNavs[nav.id] = false;
      updateDirtyIndicator(nav, false);
      trackDirty(nav, nav.id);
    }
  });

  // ESC key — dismiss autocomplete first, then close sidenav
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    // If an autocomplete dropdown is open, close it instead of the sidenav
    var openLists = document.querySelectorAll(".form__autocomplete-list");
    var dismissed = false;
    for (var i = 0; i < openLists.length; i++) {
      if (openLists[i].children.length > 0) {
        openLists[i].innerHTML = "";
        dismissed = true;
      }
    }
    if (dismissed) {
      e.preventDefault();
      return;
    }
    var open = getOpenSidenav();
    if (open) {
      e.preventDefault();
      closeSidenav(open);
    }
  });

  // Resize handle — drag to resize sidenav panel width
  (function () {
    var resizing = false;
    var panel = null;

    document.addEventListener("mousedown", function (e) {
      var handle = e.target.closest("[data-sidenav-resize]");
      if (!handle) return;
      panel = handle.closest(".sidenav__panel");
      if (!panel) return;
      resizing = true;
      e.preventDefault();
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", function (e) {
      if (!resizing || !panel) return;
      var width = window.innerWidth - e.clientX;
      var minW = 280;
      var maxW = window.innerWidth * 0.8;
      if (width < minW) width = minW;
      if (width > maxW) width = maxW;
      panel.style.width = width + "px";
    });

    document.addEventListener("mouseup", function () {
      if (!resizing) return;
      resizing = false;
      panel = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    });

    // Double-click resize handle — toggle expanded (90vw) / default
    document.addEventListener("dblclick", function (e) {
      var handle = e.target.closest("[data-sidenav-resize]");
      if (!handle) return;
      var p = handle.closest(".sidenav__panel");
      if (!p) return;
      p.classList.toggle("sidenav__panel--expanded");
    });
  })();
})();
