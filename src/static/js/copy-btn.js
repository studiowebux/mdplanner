// copy-btn.js — copy-to-clipboard for [data-copy] buttons.
// Usage: <button data-copy data-copy-value="some-value">Copy</button>
//        <button data-copy="url">Copy URL</button>  — copies window.location.href
// After click, button text briefly shows "Copied!" then reverts.

(function () {
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-copy]");
    if (!btn) return;
    var type = btn.getAttribute("data-copy");
    var value = type === "url"
      ? window.location.href
      : btn.getAttribute("data-copy-value");
    if (!value) return;
    if (value.charAt(0) === "/") value = window.location.origin + value;
    navigator.clipboard.writeText(value).then(function () {
      var original = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(function () {
        btn.textContent = original;
      }, 1500);
    });
  });
})();
