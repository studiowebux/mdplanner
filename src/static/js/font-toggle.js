// Font toggle — switches between Roboto (sans) and JetBrains Mono.
// Persisted in localStorage under "fontMono". The control lives in
// Settings → Display ("Use monospace font" checkbox); init.js applies
// html.font-mono pre-paint so there is no FOUC.

(function () {
  var cb = document.getElementById("pref-font-mono");
  if (!cb) return;

  cb.checked = localStorage.getItem("fontMono") === "true";

  cb.addEventListener("change", function () {
    var on = cb.checked;
    document.documentElement.classList.toggle("font-mono", on);
    localStorage.setItem("fontMono", on ? "true" : "false");
  });
})();
