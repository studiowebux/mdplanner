// Focus mode — hides sidebar + topbar globally, persisted in localStorage.
// Toggle via #focus-mode-btn or #focus-mode-exit; Escape exits.
(function () {
  var CLASS = "focus-mode";
  var STORAGE_KEY = "focusMode";
  var html = document.documentElement;

  function isActive() {
    return html.classList.contains(CLASS);
  }

  function setExitBtn(visible) {
    var btn = document.getElementById("focus-mode-exit");
    if (btn) btn.classList.toggle("is-hidden", !visible);
  }

  function enter() {
    html.classList.add(CLASS);
    localStorage.setItem(STORAGE_KEY, "true");
    setExitBtn(true);
  }

  function exit() {
    html.classList.remove(CLASS);
    localStorage.setItem(STORAGE_KEY, "false");
    setExitBtn(false);
  }

  // Sync exit button visibility with initial state (set by INIT_SCRIPT).
  document.addEventListener("DOMContentLoaded", function () {
    setExitBtn(isActive());
  });

  document.addEventListener("click", function (e) {
    if (e.target.closest("#focus-mode-btn")) {
      e.preventDefault();
      isActive() ? exit() : enter();
    } else if (e.target.closest("#focus-mode-exit")) {
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
