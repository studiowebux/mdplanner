// Highlight.js init + code copy button — runs after DOM ready and htmx swaps.

(function () {
  function highlightAll() {
    if (!window.hljs) return;
    document.querySelectorAll("pre code:not(.hljs)").forEach(function (el) {
      window.hljs.highlightElement(el);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", highlightAll);
  } else {
    highlightAll();
  }
  document.addEventListener("htmx:afterSettle", highlightAll);
  document.addEventListener("htmx:afterSwap", highlightAll);

  // Copy button — event delegation
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-action='copy-code']");
    if (!btn) return;

    var block = btn.closest(".code-block");
    if (!block) return;

    var code = block.querySelector("pre code");
    if (!code) return;

    navigator.clipboard.writeText(code.textContent).then(function () {
      btn.textContent = "Copied!";
      btn.classList.add("code-block__copy--copied");
      setTimeout(function () {
        btn.textContent = "Copy";
        btn.classList.remove("code-block__copy--copied");
      }, 1500);
    });
  });
})();
