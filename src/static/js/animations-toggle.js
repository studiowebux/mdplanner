// Animations toggle — enables/disables swap animations. State persisted in
// localStorage under "noAnimations". The control lives in Settings → Display
// ("Enable animations" checkbox); init.js applies html.no-animations
// pre-paint so there is no FOUC even on pages that don't render the control.
// Also removes htmx swap delay when animations are off to avoid dead pauses.

(function () {
  // Strip swap delay when animations are disabled — runs everywhere,
  // independent of whether the settings control is on this page.
  document.addEventListener("htmx:configRequest", function (e) {
    if (!document.documentElement.classList.contains("no-animations")) return;
    var elt = e.detail.elt;
    var swap = elt.getAttribute("hx-swap");
    if (swap && swap.indexOf("swap:") !== -1) {
      elt.setAttribute("hx-swap", swap.replace(/swap:\d+ms/, "swap:0"));
    }
  });

  var cb = document.getElementById("pref-animations");
  if (!cb) return;

  // Hydrate checkbox from localStorage. Checked = animations ON = no class.
  cb.checked = localStorage.getItem("noAnimations") !== "true";

  cb.addEventListener("change", function () {
    var off = !cb.checked;
    document.documentElement.classList.toggle("no-animations", off);
    localStorage.setItem("noAnimations", off ? "true" : "false");
  });
})();
