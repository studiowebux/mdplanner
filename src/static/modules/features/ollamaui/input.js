/* input.js — Textarea handling, keyboard shortcuts, init */

import { App } from "./state.js";

async function handleSend() {
  const value = App.el.inputEl.value.trim();
  if (!value && !App.pendingImages.length) return;
  if (App.isGenerating) return;

  const content = value || "(image)";
  const images = App.pendingImages.length ? App.pendingImages.slice() : null;
  let searchData = null;

  App.el.inputEl.value = "";
  App.el.inputEl.style.height = "auto";
  document.getElementById("charCount").textContent = "";
  App.clearPendingImages();

  if (App.searchEnabled && App.config.searchUrl) {
    App.el.typingEl.textContent = "Searching...";
    searchData = await App.webSearch(content);
  }

  App.sendMessage(content, {
    images: images,
    searchContext: searchData ? searchData.context : null,
    searchResults: searchData ? searchData.results : null,
  });
}

export function initInputListeners() {
  App.el.inputEl.addEventListener("input", function () {
    App.el.inputEl.style.height = "auto";
    App.el.inputEl.style.height =
      Math.min(App.el.inputEl.scrollHeight, 150) + "px";
    const len = App.el.inputEl.value.length;
    document.getElementById("charCount").textContent = len > 0 ? len : "";
  });

  App.el.inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  App.el.sendBtn.addEventListener("click", function () {
    if (App.isGenerating) {
      App.stopGeneration();
    } else {
      handleSend();
    }
  });
}

export function initKeyboardShortcuts() {
  document.addEventListener("keydown", function (e) {
    /* Only handle shortcuts when the Ollama view is active */
    if (
      document.getElementById("ollamaView")?.classList.contains("hidden")
    ) {
      return;
    }

    /* Escape: stop generation or clear input */
    if (e.key === "Escape") {
      if (App.isGenerating) {
        App.stopGeneration();
      } else if (document.activeElement === App.el.inputEl) {
        App.el.inputEl.value = "";
        App.el.inputEl.style.height = "auto";
      }
    }

    /* / to focus input (when not typing somewhere) */
    if (
      e.key === "/" &&
      document.activeElement !== App.el.inputEl &&
      !document.activeElement.closest(".config-panel") &&
      document.activeElement.tagName !== "TEXTAREA" &&
      document.activeElement.tagName !== "INPUT"
    ) {
      e.preventDefault();
      App.el.inputEl.focus();
    }
  });
}
