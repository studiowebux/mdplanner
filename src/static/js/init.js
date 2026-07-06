// Runs before CSS loads to prevent flash of unstyled content (FOUC).
// Applies stored theme, sidebar, animation, font, and focus-mode classes
// to <html> before first paint.
(function () {
  var d = document.documentElement;

  var darkMode = localStorage.getItem("darkMode");
  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (darkMode === "true" || (darkMode === null && prefersDark)) {
    d.classList.add("dark");
  }

  if (localStorage.getItem("sidebarCollapsed") === "true") {
    d.classList.add("sidebar-collapsed");
  }

  if (localStorage.getItem("noAnimations") === "true") {
    d.classList.add("no-animations");
  }

  if (localStorage.getItem("fontMono") === "true") {
    d.classList.add("font-mono");
  }

  if (localStorage.getItem("focusMode") === "true") {
    d.classList.add("focus-mode");
  }
})();
