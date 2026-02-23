/* markdown.js — marked/hljs setup, renderMarkdown, addCopyButtons
 *
 * Uses an isolated Marked instance so ollamaui does not contaminate
 * mdplanner's globally configured marked renderer.
 */

var _ollamaMarked = new marked.Marked();

_ollamaMarked.use(
  markedHighlight.markedHighlight({
    langPrefix: "hljs language-",
    highlight: function (code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
  }),
);

_ollamaMarked.setOptions({ gfm: true, breaks: true });

App.renderMarkdown = function (text) {
  return _ollamaMarked.parse(text);
};

App.wrapTables = function (container) {
  container.querySelectorAll("table").forEach(function (table) {
    if (table.parentElement.classList.contains("table-wrap")) return;
    var wrap = document.createElement("div");
    wrap.className = "table-wrap";
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  });
};

App.addCopyButtons = function (container) {
  container.querySelectorAll("pre code").forEach(function (block) {
    if (block.closest(".code-block-wrapper")) return;
    var pre = block.parentElement;
    var wrapper = document.createElement("div");
    wrapper.className = "code-block-wrapper";
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    var btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.textContent = "Copy";
    btn.addEventListener("click", function () {
      navigator.clipboard.writeText(block.textContent).then(function () {
        btn.textContent = "Copied!";
        setTimeout(function () {
          btn.textContent = "Copy";
        }, 1500);
      });
    });
    wrapper.appendChild(btn);
  });
};
