// Insert an attachment's markdown reference into the note body at the cursor.
//
// The note body renders as read-only markdown; an editable `.note-editor__textarea`
// only exists while a block is being edited (note-editor-convert.js). So we track
// the last-focused editor textarea and splice the attachment's markdown there when
// the user clicks an attachment's "Insert" button (`[data-insert-md]`). Dispatching
// an `input` event lets the note editor mark the note dirty + auto-resize. When no
// editor textarea is open we toast a hint instead of silently no-opping.
//
// Classic browser IIFE (NOT an ES module): assigns globalThis.NoteAttachmentInsert
// so the pure splice can be unit-tested DOM-free. DOM wiring is guarded by a
// `typeof document` check so importing the file in tests does not touch the DOM.
(function (root) {
  "use strict";

  var TEXTAREA = ".note-editor__textarea";

  // Splice `text` into `value`, replacing the [start, end) selection. A single
  // space is added before the insert when the preceding character is not already
  // whitespace, so a mid-word cursor does not glue the markdown onto a word.
  // Returns the new value and the caret position just after the inserted text.
  function spliceAtCursor(value, start, end, text) {
    var before = value.slice(0, start);
    var after = value.slice(end);
    var sep = before && !/\s$/.test(before) ? " " : "";
    var insert = sep + text;
    return { value: before + insert + after, cursor: (before + insert).length };
  }

  root.NoteAttachmentInsert = { spliceAtCursor: spliceAtCursor };

  if (typeof document === "undefined") return;

  var lastFocused = null;
  document.addEventListener("focusin", function (e) {
    var t = e.target;
    if (t && t.matches && t.matches(TEXTAREA)) lastFocused = t;
  });

  function targetTextarea() {
    if (lastFocused && document.contains(lastFocused)) return lastFocused;
    return document.querySelector(".note-detail__body " + TEXTAREA);
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-insert-md]") : null;
    if (!btn) return;
    var md = btn.getAttribute("data-insert-md");
    if (!md) return;
    var ta = targetTextarea();
    if (!ta) {
      if (typeof root.toast === "function") {
        root.toast({
          type: "info",
          message: "Click into the note text to insert the attachment.",
        });
      }
      return;
    }
    var res = spliceAtCursor(ta.value, ta.selectionStart, ta.selectionEnd, md);
    ta.value = res.value;
    ta.setSelectionRange(res.cursor, res.cursor);
    ta.focus();
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  });
})(globalThis);
