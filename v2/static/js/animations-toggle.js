// Animations toggle — enables/disables swap animations. State persisted in localStorage.
// Also removes htmx swap delay when animations are off to avoid dead pauses.

(function () {
  var btn = document.getElementById("animations-toggle");
  if (!btn) return;

  // Restore on load
  if (localStorage.getItem("noAnimations") === "true") {
    document.documentElement.classList.add("no-animations");
  }

  btn.addEventListener("click", function () {
    var off = document.documentElement.classList.toggle("no-animations");
    localStorage.setItem("noAnimations", off ? "true" : "false");
  });

  // Strip swap delay when animations are disabled
  document.addEventListener("htmx:configRequest", function (e) {
    if (!document.documentElement.classList.contains("no-animations")) return;
    var elt = e.detail.elt;
    var swap = elt.getAttribute("hx-swap");
    if (swap && swap.indexOf("swap:") !== -1) {
      elt.setAttribute("hx-swap", swap.replace(/swap:\d+ms/, "swap:0"));
    }
  });
})();
