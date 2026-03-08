/* markdown.js — marked/hljs setup, renderMarkdown, addCopyButtons
 *
 * Uses an isolated Marked instance so ollamaui does not contaminate
 * mdplanner's globally configured marked renderer.
 */

import { App } from "./state.js";

/* globals: marked, markedHighlight, hljs (loaded via vendor <script> tags) */

const _ollamaMarked = new marked.Marked();

_ollamaMarked.use(
  markedHighlight.markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang) {
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
    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  });
};

function _copyToClipboard(text, btn) {
  // Clipboard API requires a secure context (HTTPS or localhost).
  // Fall back to execCommand for plain HTTP LAN access.
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(function () {
      btn.textContent = "Copied!";
      setTimeout(function () {
        btn.textContent = "Copy";
      }, 1500);
    }).catch(function () {
      _execCommandCopy(text, btn);
    });
  } else {
    _execCommandCopy(text, btn);
  }
}

function _execCommandCopy(text, btn) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand("copy");
    btn.textContent = "Copied!";
  } catch (_) {
    btn.textContent = "Failed";
  }
  setTimeout(function () {
    btn.textContent = "Copy";
  }, 1500);
  document.body.removeChild(textarea);
}

App.addCopyButtons = function (container) {
  container.querySelectorAll("pre code").forEach(function (block) {
    if (block.closest(".code-block-wrapper")) return;
    const pre = block.parentElement;
    const wrapper = document.createElement("div");
    wrapper.className = "code-block-wrapper";
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.textContent = "Copy";
    btn.addEventListener("click", function () {
      _copyToClipboard(block.textContent, btn);
    });
    wrapper.appendChild(btn);
  });
};
