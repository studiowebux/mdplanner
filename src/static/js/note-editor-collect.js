// note-editor-collect.js — reads the in-DOM editor and produces the structured
// { paragraphs, customSections } payload the save() PUT sends. DOM-in, data-out;
// no shared editor state. Exposed as globalThis.NoteEditorCollect. Loaded AFTER
// note-editor-util.js (+ note-markdown.js), BEFORE note-editor.js.

(function (root) {
  "use strict";

  var U = root.NoteEditorUtil;
  var qs = U.qs;
  var qsa = U.qsa;

  // Flush live textarea/lang-input values back to each block's data attributes
  // so collectBlocks reads current content. Raw markdown blocks are read
  // directly by collectContainerContent at save time, so they need no flush.
  function flushFromDOM() {
    qsa("[data-block-id][data-block-editable]").forEach(function (block) {
      var ta = qs(".note-editor__textarea", block);
      if (ta) block.dataset.blockContent = ta.value;
      var langInput = qs(".note-editor__lang-input", block);
      if (langInput) block.dataset.blockLang = langInput.value;
    });
  }

  // Collect content from a container — checks for raw markdown textarea first,
  // falls back to individual sub-blocks.
  function collectContainerContent(parent) {
    var rawEl = qs("[data-raw-markdown] .note-editor__textarea", parent);
    if (rawEl) {
      return root.NoteMarkdown.parseMarkdownToBlocks(rawEl.value, U.genId);
    }

    // Fallback: collect individual sub-blocks (for newly created sections)
    var blocks = [];
    qsa("[data-sub-block-id]", parent).forEach(function (sub) {
      blocks.push({
        id: sub.dataset.subBlockId,
        type: sub.dataset.blockType || "text",
        content: sub.dataset.blockContent || "",
        language: sub.dataset.blockLang || undefined,
        order: blocks.length,
      });
    });
    return blocks;
  }

  function collectSection(el, globalOrder) {
    var type = el.dataset.sectionType;
    var title = el.dataset.sectionTitle || "";
    var config = {};

    if (type === "tabs") {
      config.tabs = [];
      qsa("[data-tab-panel]", el).forEach(function (tabEl) {
        config.tabs.push({
          id: tabEl.dataset.tabPanel,
          title: tabEl.dataset.tabPanelTitle || "Tab",
          content: collectContainerContent(tabEl),
        });
      });
      // Also collect from editor-created tab items
      qsa("[data-tab-id]", el).forEach(function (tabEl) {
        if (tabEl.getAttribute("role") === "tab") return; // skip tab bar buttons
        if (tabEl.dataset.tabPanel) return; // skip panels already collected
        config.tabs.push({
          id: tabEl.dataset.tabId,
          title: tabEl.dataset.tabTitle || "Tab",
          content: collectContainerContent(tabEl),
        });
      });
    } else if (type === "timeline") {
      config.timeline = [];
      qsa("[data-timeline-item-id]", el).forEach(function (itemEl) {
        config.timeline.push({
          id: itemEl.dataset.timelineItemId,
          title: itemEl.dataset.timelineTitle || "",
          status: itemEl.dataset.timelineStatus || "pending",
          date: itemEl.dataset.timelineDate || undefined,
          content: collectContainerContent(itemEl),
        });
      });
    } else if (type === "split-view") {
      var columns = [];
      qsa("[data-column-index]", el).forEach(function (colEl) {
        columns.push(collectContainerContent(colEl));
      });
      config.splitView = { columns: columns };
    }

    return {
      id: el.dataset.sectionId,
      type: type,
      title: title,
      order: 0,
      globalOrder: globalOrder,
      config: config,
    };
  }

  function collectBlocks() {
    var paragraphs = [];
    var customSections = [];
    var globalOrder = 0;

    var body = qs(".note-detail__body");
    if (!body) {
      return { paragraphs: paragraphs, customSections: customSections };
    }

    body.querySelectorAll(
      ":scope > [data-block-id], :scope > [data-section-id]",
    ).forEach(function (el) {
      if (el.dataset.blockId) {
        paragraphs.push({
          id: el.dataset.blockId,
          type: el.dataset.blockType || "text",
          content: el.dataset.blockContent || "",
          language: el.dataset.blockLang || undefined,
          order: paragraphs.length,
          globalOrder: globalOrder++,
        });
      } else if (el.dataset.sectionId) {
        customSections.push(collectSection(el, globalOrder++));
      }
    });

    return { paragraphs: paragraphs, customSections: customSections };
  }

  root.NoteEditorCollect = {
    flushFromDOM: flushFromDOM,
    collectBlocks: collectBlocks,
    collectSection: collectSection,
    collectContainerContent: collectContainerContent,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
