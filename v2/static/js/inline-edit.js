// In-place content editing — CSP-safe event delegation.
// A [contenteditable][data-inline-edit] element: on every input, its text is
// synced into the hidden input named by data-inline-target, and the Save
// button named by data-inline-save-btn is shown when the text differs from
// data-inline-original (dirty) and hidden when it matches (clean).
// htmx persists the change when the Save button is clicked.

(function () {
  var NBSP = / /g;

  function textOf(el) {
    return (el.innerText || "").replace(NBSP, " ").replace(/\r/g, "").trim();
  }

  document.addEventListener("input", function (e) {
    var el = e.target;
    if (!el.hasAttribute || !el.hasAttribute("data-inline-edit")) return;

    var current = textOf(el);

    // Keep the hidden input (submitted by htmx) in sync with the live text.
    var targetId = el.getAttribute("data-inline-target");
    var hidden = targetId ? document.getElementById(targetId) : null;
    if (hidden) hidden.value = current;

    // Show the Save button only while the content is dirty.
    var dirty = current !== (el.getAttribute("data-inline-original") || "");
    var btnId = el.getAttribute("data-inline-save-btn");
    var btn = btnId ? document.getElementById(btnId) : null;
    if (btn) btn.classList.toggle("is-hidden", !dirty);
  });
})();
