// Topbar overflow menu — toggles the action panel on narrow/mobile viewports.
// Adds/removes html.topbar-overflow-open on button click; closes on outside click.

(function () {
  var html = document.documentElement;
  var btn = document.getElementById("topbar-overflow-btn");
  var panel = document.getElementById("topbar-actions");

  function open() {
    html.classList.add("topbar-overflow-open");
    if (btn) btn.setAttribute("aria-expanded", "true");
  }

  function close() {
    html.classList.remove("topbar-overflow-open");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  function toggle() {
    if (html.classList.contains("topbar-overflow-open")) {
      close();
    } else {
      open();
    }
  }

  if (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      toggle();
    });
  }

  // Close when clicking outside the panel or button.
  document.addEventListener("click", function (e) {
    if (!html.classList.contains("topbar-overflow-open")) return;
    if (
      panel && panel.contains(e.target) ||
      btn && btn.contains(e.target)
    ) return;
    close();
  });

  // Close on Escape.
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });
})();
