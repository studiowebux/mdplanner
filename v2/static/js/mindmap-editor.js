// mindmap-editor.js — Tab / Shift+Tab indent for the mindmap bullet editor.
// Matches the 2-space indent the parser/serializer rely on
// (v2/repositories/mindmap.repository.ts). Document-level keydown delegate
// works for the initial render and any later htmx swap of the form.

(function () {
  "use strict";

  const INDENT = "  ";
  const STEP = INDENT.length;
  const SELECTOR = ".mindmap-edit-form__textarea";

  function lineStartAt(value, pos) {
    const i = value.lastIndexOf("\n", pos - 1);
    return i === -1 ? 0 : i + 1;
  }

  function lineEndAt(value, pos) {
    const i = value.indexOf("\n", pos);
    return i === -1 ? value.length : i;
  }

  function indentBlock(block) {
    return block.split("\n").map((line) => INDENT + line).join("\n");
  }

  function outdentBlock(block) {
    return block
      .split("\n")
      .map((line) => {
        if (line.startsWith(INDENT)) return line.slice(STEP);
        if (line.startsWith(" ")) return line.slice(1);
        return line;
      })
      .join("\n");
  }

  function applyLineEdit(ta, transform) {
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const blockStart = lineStartAt(ta.value, start);
    const blockEnd = lineEndAt(ta.value, end);
    const original = ta.value.slice(blockStart, blockEnd);
    const updated = transform(original);
    ta.setRangeText(updated, blockStart, blockEnd, "preserve");
    // Restore a selection that spans the modified block so repeated
    // Tab presses keep indenting the same lines.
    ta.selectionStart = blockStart;
    ta.selectionEnd = blockStart + updated.length;
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function handleTab(_e, ta) {
    applyLineEdit(ta, indentBlock);
  }

  function handleShiftTab(_e, ta) {
    applyLineEdit(ta, outdentBlock);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const ta = e.target;
    if (!(ta instanceof HTMLTextAreaElement)) return;
    if (!ta.matches(SELECTOR)) return;
    e.preventDefault();
    if (e.shiftKey) handleShiftTab(e, ta);
    else handleTab(e, ta);
  });
})();
