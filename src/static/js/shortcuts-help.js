// shortcuts-help.js — press ? to open the keyboard shortcuts dialog.

(function () {
  var dialog = document.getElementById("shortcuts-dialog");
  if (!dialog) return;

  function inputFocused() {
    var el = document.activeElement;
    if (!el) return false;
    var tag = el.tagName;
    return (
      tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" ||
      el.isContentEditable
    );
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "?") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (inputFocused()) return;
    e.preventDefault();
    dialog.showModal();
  });

  dialog.addEventListener("click", function (e) {
    if (e.target === dialog) dialog.close();
  });
})();
