// Theme toggle — cycles dark/light. State persisted in localStorage.
// Extends the dark-mode init script already in MainLayout.

(function () {
  function toggle() {
    var isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("darkMode", isDark ? "true" : "false");
  }

  var btn = document.getElementById("theme-toggle");
  if (btn) btn.addEventListener("click", toggle);

  // t key — toggle theme when no input is focused
  document.addEventListener("keydown", function (e) {
    if (e.key !== "t") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var el = document.activeElement;
    if (!el) return toggle();
    var tag = el.tagName;
    if (
      tag !== "INPUT" && tag !== "SELECT" && tag !== "TEXTAREA" &&
      !el.isContentEditable
    ) toggle();
  });
})();
