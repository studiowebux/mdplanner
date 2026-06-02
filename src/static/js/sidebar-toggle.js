// Sidebar toggle — desktop collapse + mobile overlay.
// Desktop: toggles .sidebar-collapsed on <html>, persisted in localStorage.
// Mobile (<=breakpoint): toggles .sidebar-open on <html>, overlay closes on tap.

(function () {
  var MOBILE_BP = parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue("--breakpoint-mobile"),
    10,
  ) || 768;
  var COLLAPSED_KEY = "sidebarCollapsed";
  var WIDTH_KEY = "sidebarWidth";
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

  function applyStoredWidth() {
    if (html.classList.contains("sidebar-collapsed")) return;
    var stored = localStorage.getItem(WIDTH_KEY);
    if (!stored) return;
    var px = parseInt(stored, 10);
    if (isNaN(px)) return;
    var min = parseInt(
      getComputedStyle(html).getPropertyValue("--sidebar-w-min"),
      10,
    ) || 160;
    var max = parseInt(
      getComputedStyle(html).getPropertyValue("--sidebar-w-max"),
      10,
    ) || 400;
    px = Math.min(Math.max(px, min), max);
    html.style.setProperty("--sidebar-width", px + "px");
  }

  // Init desktop state from localStorage.
  if (!isMobile()) {
    applyDesktopState();
    applyStoredWidth();
  }

  // Scroll active nav link into view (instant, minimum scroll).
  var activeLink = document.querySelector(".sidebar__link--active");
  if (activeLink) {
    activeLink.scrollIntoView({ block: "nearest", behavior: "instant" });
  }

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

  // ── Sidebar drag-resize ───────────────────────────────────────────────────
  var handle = document.querySelector(".sidebar__resize-handle");
  if (handle) {
    var wMin = parseInt(
      getComputedStyle(html).getPropertyValue("--sidebar-w-min"),
      10,
    ) || 160;
    var wMax = parseInt(
      getComputedStyle(html).getPropertyValue("--sidebar-w-max"),
      10,
    ) || 400;
    var dragging = false;

    handle.addEventListener("pointerdown", function (e) {
      if (isMobile() || html.classList.contains("sidebar-collapsed")) return;
      dragging = true;
      handle.classList.add("is-dragging");
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    handle.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var sidebar = document.getElementById("app-sidebar");
      if (!sidebar) return;
      var rect = sidebar.getBoundingClientRect();
      var newW = Math.min(Math.max(e.clientX - rect.left, wMin), wMax);
      html.style.setProperty("--sidebar-width", newW + "px");
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove("is-dragging");
      var current = html.style.getPropertyValue("--sidebar-width");
      if (current) localStorage.setItem(WIDTH_KEY, parseInt(current, 10));
    }

    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);
  }
})();
