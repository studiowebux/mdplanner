// note-markdown.js — pure markdown → note-block parser (no DOM). The
// client-side companion of the server-side utils/note-content.ts; splits raw
// markdown into { type:"text" } / { type:"code", language } blocks. Exposed as
// globalThis.NoteMarkdown so it works both as a classic browser script (loaded
// BEFORE note-editor.js) and as a Deno import in tests.

(function (root) {
  "use strict";

  function defaultGenId(prefix) {
    return prefix + "_" + Date.now() + "_" +
      Math.random().toString(36).substring(2, 8);
  }

  // Parse markdown into an ordered list of text / fenced-code blocks. `genId`
  // is injected so the editor can share its id scheme (and tests can pass a
  // deterministic one); it falls back to a timestamp+random generator.
  function parseMarkdownToBlocks(md, genId) {
    genId = genId || defaultGenId;
    var blocks = [];
    var lines = md.split("\n");
    var current = [];
    var inCode = false;
    var codeLang = "";
    var order = 0;

    function flush() {
      var text = current.join("\n").trim();
      if (text) {
        blocks.push({
          id: genId("block"),
          type: "text",
          content: text,
          order: order++,
        });
      }
      current = [];
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.startsWith("```")) {
        if (!inCode) {
          flush();
          inCode = true;
          codeLang = line.slice(3).trim();
        } else {
          var codeContent = current.join("\n");
          if (codeContent.trim()) {
            blocks.push({
              id: genId("code"),
              type: "code",
              content: codeContent,
              language: codeLang || undefined,
              order: order++,
            });
          }
          current = [];
          inCode = false;
          codeLang = "";
        }
        continue;
      }
      current.push(line);
    }

    flush();
    return blocks;
  }

  root.NoteMarkdown = { parseMarkdownToBlocks: parseMarkdownToBlocks };
})(typeof globalThis !== "undefined" ? globalThis : this);
