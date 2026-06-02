// Hash scroll — when the URL has a #fragment, scroll to the matching
// element and briefly highlight it for visibility.

(function () {
  function scrollToHash() {
    var hash = window.location.hash;
    if (!hash) return;
    var el = document.getElementById(hash.slice(1));
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("is-hash-target");
    setTimeout(function () {
      el.classList.remove("is-hash-target");
    }, 2000);
  }

  if (document.readyState === "complete") {
    scrollToHash();
  } else {
    window.addEventListener("load", scrollToHash);
  }
})();
