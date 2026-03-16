// Sidebar toggle — desktop collapse + mobile overlay.
// Desktop: toggles .sidebar-collapsed on <html>, persisted in localStorage.
// Mobile (<=768px): toggles .sidebar-open on <html>, overlay closes on tap.

(function () {
  var MOBILE_BP = 768;
  var COLLAPSED_KEY = "sidebarCollapsed";
  var html = document.documentElement;
  var btn = document.getElementById("sidebar-toggle");
  var overlay = document.getElementById("sidebar-overlay");

  function isMobile() {
    return window.innerWidth <= MOBILE_BP;
  }

  function setAriaExpanded(open) {
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function applyDesktopState() {
    var collapsed = localStorage.getItem(COLLAPSED_KEY) === "true";
    html.classList.toggle("sidebar-collapsed", collapsed);
    setAriaExpanded(!collapsed);
  }

  function toggle() {
    if (isMobile()) {
      var open = html.classList.toggle("sidebar-open");
      setAriaExpanded(open);
    } else {
      var collapsed = html.classList.toggle("sidebar-collapsed");
      localStorage.setItem(COLLAPSED_KEY, collapsed ? "true" : "false");
      setAriaExpanded(!collapsed);
    }
  }

  function closeOverlay() {
    html.classList.remove("sidebar-open");
    setAriaExpanded(false);
  }

  // Init desktop state from localStorage.
  if (!isMobile()) applyDesktopState();

  if (btn) btn.addEventListener("click", toggle);
  if (overlay) overlay.addEventListener("click", closeOverlay);

  // On resize: clean up stale classes when crossing the breakpoint.
  window.addEventListener("resize", function () {
    if (isMobile()) {
      html.classList.remove("sidebar-collapsed");
    } else {
      html.classList.remove("sidebar-open");
      applyDesktopState();
    }
  });
})();
