// Theme toggle — cycles dark/light. State persisted in localStorage.
// Extends the dark-mode init script already in MainLayout.

(function () {
  var btn = document.getElementById("theme-toggle");
  if (!btn) return;

  btn.addEventListener("click", function () {
    var isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("darkMode", isDark ? "true" : "false");
  });
})();
