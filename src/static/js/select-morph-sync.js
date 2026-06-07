// Keep <select> controls showing their server-rendered selection after an
// idiomorph (morph:outerHTML) swap.
//
// idiomorph reconciles element attributes (incl. an option's `selected` and a
// `data-*`) to match the server HTML, but it does NOT update a <select>'s live
// `.value` property once the user has dirtied the control. So after the SSE view
// refresh the task-list assignee select snaps back to "Unassigned" right after
// assigning, even though the morphed-in HTML marks the correct option.
//
// Fix: after every htmx content load/settle, force each <select>'s value back to
// what the server rendered. We register on htmx.onLoad — the same hook
// sortable-init uses, which re-runs over morph-reconciled subtrees (plain
// htmx:afterSettle did not fire reliably for the SSE morph) — plus a settle and
// DOMContentLoaded pass. The wanted value comes from an explicit
// `data-selected-value` attribute when present (reliably reconciled by
// idiomorph), falling back to the marked `option[selected]`.
(function (root) {
  "use strict";

  function desiredValue(sel) {
    if (sel.hasAttribute("data-selected-value")) {
      return sel.getAttribute("data-selected-value");
    }
    var marked = sel.querySelector("option[selected]");
    return marked ? marked.value : null;
  }

  function syncSelect(sel) {
    var want = desiredValue(sel);
    if (want !== null && sel.value !== want) sel.value = want;
  }

  function syncWithin(el) {
    if (!el || !el.querySelectorAll) return;
    if (el.tagName === "SELECT") syncSelect(el);
    var selects = el.querySelectorAll("select");
    for (var i = 0; i < selects.length; i++) syncSelect(selects[i]);
  }

  if (root.htmx && typeof root.htmx.onLoad === "function") {
    root.htmx.onLoad(syncWithin);
  }
  document.addEventListener("htmx:afterSettle", function (e) {
    syncWithin(e.target);
  });
  document.addEventListener("DOMContentLoaded", function () {
    syncWithin(document);
  });
})(typeof window !== "undefined" ? window : this);
