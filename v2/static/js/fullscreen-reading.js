// Fullscreen reading mode — toggles sidebar + topbar visibility.
// Activated by [data-fullscreen-toggle] button, exited by ESC or button.
(function () {
  var CLASS = "fullscreen-reading";

  function isActive() {
    return document.documentElement.classList.contains(CLASS);
  }

  function toggle() {
    document.documentElement.classList.toggle(CLASS);
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-fullscreen-toggle]")) {
      e.preventDefault();
      toggle();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isActive()) {
      e.preventDefault();
      e.stopPropagation();
      document.documentElement.classList.remove(CLASS);
    }
  });
})();
