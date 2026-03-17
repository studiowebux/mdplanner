// Font toggle — switches between Roboto (sans) and JetBrains Mono.
// Persisted in localStorage. Class "font-mono" on <html> overrides --font-sans.

(function () {
  var btn = document.getElementById("font-toggle");
  if (!btn) return;

  btn.addEventListener("click", function () {
    var isMono = document.documentElement.classList.toggle("font-mono");
    localStorage.setItem("fontMono", isMono ? "true" : "false");
  });
})();
