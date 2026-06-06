// Keep <select> controls in sync with their server-rendered selection after a
// morph swap.
//
// idiomorph (morph:outerHTML, used by the SSE view refresh) updates the
// `selected` ATTRIBUTE on <option> elements, but a <select> the user has
// already interacted with keeps its old live value (the `.value` property does
// not follow an attribute change once the control is "dirty"). Result: e.g. the
// task-list assignee <select> snaps back to "Unassigned" right after assigning,
// even though the morphed-in HTML marks the correct option selected.
//
// After every htmx settle, force each <select> in the just-swapped subtree to
// display its server-rendered [selected] option. Scoped to the swapped node so
// open sidenav forms and unrelated controls are never touched. Only acts when
// the server explicitly marked an option selected and the live value disagrees.
(function () {
  function syncSelect(sel) {
    var marked = sel.querySelector("option[selected]");
    if (marked && sel.value !== marked.value) sel.value = marked.value;
  }

  function syncWithin(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.tagName === "SELECT") syncSelect(root);
    var selects = root.querySelectorAll("select");
    for (var i = 0; i < selects.length; i++) syncSelect(selects[i]);
  }

  document.addEventListener("htmx:afterSettle", function (e) {
    syncWithin(e.target);
  });
})();
