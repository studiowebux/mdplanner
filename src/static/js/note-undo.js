// Note editor undo/redo — per-textarea stacks for note block editing.
// Scoped to .note-editor__textarea elements only — does not interfere
// with native undo on other inputs (title, autocomplete, etc.).
// CMD+Z / Ctrl+Z = undo. CMD+SHIFT+Z / Ctrl+SHIFT+Z = redo.
// Survives htmx swaps and DOM moves via document-level event delegation:
// new textareas added by convertToEditable / addTextBlock / addCodeBlock
// inherit the behavior automatically with no afterSettle re-init needed.

(function () {
  "use strict";

  var MAX_STACK = 50;
  var SELECTOR_CLASS = "note-editor__textarea";

  // WeakMap<HTMLTextAreaElement, {undo: string[], redo: string[], last: string}>
  // GC'd automatically when textareas are removed from the DOM.
  var stacks = new WeakMap();

  function isNoteTextarea(el) {
    return el && el.tagName === "TEXTAREA" &&
      el.classList.contains(SELECTOR_CLASS);
  }

  function getStack(ta) {
    var s = stacks.get(ta);
    if (!s) {
      s = { undo: [], redo: [], last: ta.value };
      stacks.set(ta, s);
    }
    return s;
  }

  // Apply a restored value: write it, sync `last` so the dispatched input
  // event does not re-push the round-trip onto the stack, then fire a
  // bubbling input event so existing listeners (autoResize on the element,
  // markDirty delegated on .note-detail__body) react to the change.
  function applyValue(ta, val) {
    ta.value = val;
    var s = getStack(ta);
    s.last = val;
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function undo(ta) {
    var s = getStack(ta);
    if (s.undo.length === 0) return;
    var prev = s.undo.pop();
    s.redo.push(ta.value);
    if (s.redo.length > MAX_STACK) s.redo.shift();
    applyValue(ta, prev);
  }

  function redo(ta) {
    var s = getStack(ta);
    if (s.redo.length === 0) return;
    var next = s.redo.pop();
    s.undo.push(ta.value);
    if (s.undo.length > MAX_STACK) s.undo.shift();
    applyValue(ta, next);
  }

  // Initialize the stack's `last` snapshot when the user focuses the
  // textarea — captures the value BEFORE any keystroke so the first input
  // event can push the original onto the undo stack.
  document.addEventListener("focusin", function (e) {
    if (!isNoteTextarea(e.target)) return;
    var s = getStack(e.target);
    s.last = e.target.value;
  });

  // Each user input pushes the previous value onto the undo stack and
  // clears redo. The equality guard prevents the dispatched input event
  // from applyValue() from re-pushing the round-trip.
  document.addEventListener("input", function (e) {
    if (!isNoteTextarea(e.target)) return;
    var s = getStack(e.target);
    if (e.target.value === s.last) return;
    s.undo.push(s.last);
    if (s.undo.length > MAX_STACK) s.undo.shift();
    s.redo.length = 0;
    s.last = e.target.value;
  });

  // Intercept CMD/Ctrl+Z and CMD/Ctrl+SHIFT+Z only when focus is on a
  // note editor textarea. Native undo continues to work everywhere else.
  document.addEventListener("keydown", function (e) {
    if (!isNoteTextarea(e.target)) return;
    if (!(e.metaKey || e.ctrlKey)) return;
    if (e.key.toLowerCase() !== "z") return;
    e.preventDefault();
    if (e.shiftKey) redo(e.target);
    else undo(e.target);
  });
})();
