// note-editor-util.js — shared low-level helpers for the note editor. Exposed
// as globalThis.NoteEditorUtil so the editor's sibling modules (builders,
// collect, convert) and note-editor.js all share one id scheme + DOM helpers.
// Loaded BEFORE the other note-editor-*.js scripts. Classic browser script
// (no ES modules); the DOM-free parts (genId, subBlocksToMarkdown) are also
// importable in Deno tests.

(function (root) {
  "use strict";

  function genId(prefix) {
    return prefix + "_" + Date.now() + "_" +
      Math.random().toString(36).substring(2, 8);
  }

  function qs(sel, scope) {
    return (scope || document).querySelector(sel);
  }
  function qsa(sel, scope) {
    return (scope || document).querySelectorAll(sel);
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // `this` is the textarea — grow it to fit its content.
  function autoResize() {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
  }

  // Merge an ordered list of sub-blocks into a single raw-markdown string.
  // Code blocks get their ``` fences (with language) restored; text blocks pass
  // through. A blank line separates blocks. DOM-free — the caller maps DOM
  // datasets to { type, content, lang } objects first.
  function subBlocksToMarkdown(blocks) {
    var md = [];
    blocks.forEach(function (b) {
      var type = b.type || "text";
      var content = b.content || "";
      var lang = b.lang || "";
      if (type === "code") {
        md.push("```" + lang);
        md.push(content);
        md.push("```");
      } else {
        md.push(content);
      }
      md.push("");
    });
    return md.join("\n").trim();
  }

  root.NoteEditorUtil = {
    genId: genId,
    qs: qs,
    qsa: qsa,
    escapeHtml: escapeHtml,
    autoResize: autoResize,
    subBlocksToMarkdown: subBlocksToMarkdown,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
