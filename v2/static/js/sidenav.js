// Sidenav — open/close via data attributes, ESC key, dirty state tracking.
// Open:  data-sidenav-open="<sidenav-id>" on any trigger element.
// Close: data-sidenav-close, backdrop click, or ESC key.
// Dirty: warns before closing if form inputs were modified.

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
  }

  function trackDirty(el, id) {
    var inputs = el.querySelectorAll("input, select, textarea");
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].addEventListener("input", function () {
        dirtyNavs[id] = true;
      });
    }
  }

  // Reset dirty state on successful form submit (called by domain form JS).
  window.sidenavResetDirty = function (id) {
    dirtyNavs[id] = false;
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

  // ESC key — close the topmost open sidenav
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var open = getOpenSidenav();
    if (open) {
      e.preventDefault();
      closeSidenav(open);
    }
  });
})();
