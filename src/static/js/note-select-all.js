// Note content select-all — CMD+A (Mac) / Ctrl+A (other) selects the
// rendered note body (paragraphs + tabs/timeline/split-view custom modules)
// instead of the whole document. Scoped to the note detail page only; bails
// out for editable targets (title input, edit-mode textareas) so native
// browser select-all keeps working there.

(function () {
  "use strict";

  function isEditableTarget(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === "TEXTAREA" || tag === "INPUT" || el.isContentEditable;
  }

  function selectAllContent(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }

  document.addEventListener("keydown", function (e) {
    if (!(e.metaKey || e.ctrlKey)) return;
    if (e.key.toLowerCase() !== "a") return;

    var root = document.getElementById("note-detail-root");
    if (!root) return;
    if (isEditableTarget(e.target)) return;
    if (e.target !== document.body && !root.contains(e.target)) return;

    var body = root.querySelector(".note-detail__body");
    if (!body) return;

    e.preventDefault();
    selectAllContent(body);
  });
})();
