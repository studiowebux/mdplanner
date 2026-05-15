// Fullscreen reading mode — toggles sidebar + topbar visibility.
// Activated by [data-fullscreen-toggle] button, exited by ESC or exit button.
(function () {
  var CLASS = "fullscreen-reading";

  function isActive() {
    return document.documentElement.classList.contains(CLASS);
  }

  function setExitBtn(visible) {
    var btn = document.getElementById("fullscreen-reading-exit");
    if (btn) btn.classList.toggle("is-hidden", !visible);
  }

  function enter() {
    document.documentElement.classList.add(CLASS);
    setExitBtn(true);
  }

  function exit() {
    document.documentElement.classList.remove(CLASS);
    setExitBtn(false);
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-fullscreen-toggle]")) {
      e.preventDefault();
      isActive() ? exit() : enter();
    } else if (e.target.closest("#fullscreen-reading-exit")) {
      e.preventDefault();
      exit();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isActive()) {
      e.preventDefault();
      e.stopPropagation();
      exit();
    }
  });
})();
