// note-editor-convert.js — converts the rendered (read-only) note blocks into
// editable controls when entering edit mode: paragraphs → textareas, custom
// sections → titled/move/delete controls, sub-blocks → one raw-markdown
// textarea per container. Exposed as globalThis.NoteEditorConvert. Loaded AFTER
// note-editor-util.js, BEFORE note-editor.js. `markDirty` is injected so the
// title/status/date edits mark the editor dirty without a shared closure.

(function (root) {
  "use strict";

  var U = root.NoteEditorUtil;
  var qs = U.qs;
  var qsa = U.qsa;
  var escapeHtml = U.escapeHtml;
  var autoResize = U.autoResize;

  // Wire title/status/date inputs into each existing timeline item header so
  // the user can edit them while in edit mode. Mirrors the header controls
  // createTimelineItemElement builds for newly added items — pre-existing
  // items rendered as static spans by note-blocks.tsx had no editor wiring,
  // so collectSection read stale dataset values on save.
  function makeTimelineHeadersEditable(section, markDirty) {
    qsa("[data-timeline-item-id]", section).forEach(function (item) {
      if (item.dataset.headerEditable) return;
      item.dataset.headerEditable = "true";

      var header = qs(".note-detail__timeline-header", item);
      if (!header) return;

      var title = item.dataset.timelineTitle || "";
      var status = item.dataset.timelineStatus || "pending";
      var date = item.dataset.timelineDate || "";

      // Replace the static spans with the same controls
      // createTimelineItemElement uses for new items.
      header.textContent = "";
      header.innerHTML =
        '<input type="text" class="note-editor__timeline-title-input" value="' +
        escapeHtml(title) + '" placeholder="Title">' +
        '<select class="note-editor__status-select">' +
        '<option value="pending"' + (status === "pending" ? " selected" : "") +
        ">Pending</option>" +
        '<option value="success"' + (status === "success" ? " selected" : "") +
        ">Success</option>" +
        '<option value="failed"' + (status === "failed" ? " selected" : "") +
        ">Failed</option>" +
        "</select>" +
        '<input type="date" class="note-editor__date-input" value="' +
        escapeHtml(date) + '">' +
        '<button type="button" class="btn btn--danger btn--sm" data-action="delete-timeline-item">Del</button>';

      qs("input[type=text]", header).addEventListener("input", function () {
        item.dataset.timelineTitle = this.value;
        markDirty();
      });
      qs("select", header).addEventListener("change", function () {
        item.dataset.timelineStatus = this.value;
        markDirty();
      });
      qs("input[type=date]", header).addEventListener("input", function () {
        item.dataset.timelineDate = this.value;
        markDirty();
      });
    });
  }

  // Build a single raw markdown string from a container's sub-blocks
  // (DOM datasets → fenced markdown). Shared by the tab and merge converters.
  function subBlocksToMarkdown(container) {
    var blocks = [];
    container.querySelectorAll("[data-sub-block-id]").forEach(function (sub) {
      blocks.push({
        type: sub.dataset.blockType || "text",
        content: sub.dataset.blockContent || "",
        lang: sub.dataset.blockLang || "",
      });
    });
    return U.subBlocksToMarkdown(blocks);
  }

  // Convert a saved tabs section (read-only tab bar + [data-tab-panel] panels)
  // into the SAME self-contained, stacked [data-tab-id] items that
  // createTabElement builds for newly added tabs — a title input + a raw
  // markdown textarea per tab. The previous approach nested an <input> inside
  // each role="tab" <button>, where the caret/typing was unreliable and tab
  // switching broke, so neither renaming a tab nor editing a non-first tab's
  // content persisted on saved notes. Collection then runs through the single
  // [data-tab-id] path for both new and saved tabs.
  function convertTabsToEditable(section) {
    var tabsWrap = qs(".note-detail__tabs", section);
    var panels = qsa("[data-tab-panel]", section);
    if (panels.length === 0) return;

    panels.forEach(function (panel) {
      var id = panel.dataset.tabPanel;
      var title = panel.dataset.tabPanelTitle;
      if (!title) {
        var btn = section.querySelector(
          '[data-tab-id="' + id + '"][role="tab"]',
        );
        title = btn ? (btn.dataset.tabTitle || btn.textContent.trim()) : "Tab";
      }

      var md = subBlocksToMarkdown(panel);
      var item = root.NoteEditorBuilders.createTabElement(id, title);
      var ta = qs(".note-editor__raw-block .note-editor__textarea", item);
      if (ta) {
        ta.value = md;
        ta.rows = Math.max(3, md.split("\n").length + 1);
      }

      if (tabsWrap) tabsWrap.before(item);
      else section.appendChild(item);
    });

    if (tabsWrap) tabsWrap.remove();
  }

  // Merge sub-blocks inside a container (timeline item, column) into a single
  // raw markdown textarea. Code blocks get ``` fences restored. Tabs use
  // convertTabsToEditable instead (rebuilt as stacked editable items).
  function mergeSubBlocksToMarkdown(section) {
    var containers = [];
    // Timeline: each timeline item content area
    qsa("[data-timeline-item-id]", section).forEach(function (el) {
      var content = qs(".note-detail__timeline-content", el);
      if (content) containers.push(content);
      else containers.push(el);
    });
    // Split: each column
    qsa("[data-column-index]", section).forEach(function (el) {
      containers.push(el);
    });

    containers.forEach(function (container) {
      var subs = container.querySelectorAll("[data-sub-block-id]");
      if (subs.length === 0) return;

      // Build raw markdown from sub-blocks, then remove them from the DOM.
      var md = subBlocksToMarkdown(container);
      subs.forEach(function (sub) {
        sub.remove();
      });

      // Create single textarea with raw markdown
      var wrapper = document.createElement("div");
      wrapper.className = "note-editor__raw-block";
      wrapper.dataset.rawMarkdown = "true";

      var ta = document.createElement("textarea");
      ta.className = "note-editor__textarea";
      ta.value = md;
      ta.rows = Math.max(3, ta.value.split("\n").length + 1);
      ta.addEventListener("input", autoResize);
      wrapper.appendChild(ta);

      // Insert before any add-block buttons
      var addBtn = qs("[data-action='add-sub-block']", container);
      if (addBtn) {
        addBtn.remove(); // raw editing replaces add-block buttons
      }
      container.appendChild(wrapper);
    });
  }

  function addSectionAddButtons(section) {
    var type = section.dataset.sectionType;
    var addBar = document.createElement("div");
    addBar.className = "note-editor__add-bar";

    if (type === "tabs") {
      addBar.innerHTML =
        '<button type="button" class="btn btn--secondary btn--sm" data-action="add-tab">Add Tab</button>';
    } else if (type === "timeline") {
      addBar.innerHTML =
        '<button type="button" class="btn btn--secondary btn--sm" data-action="add-timeline-item">Add Item</button>';
    } else if (type === "split-view") {
      addBar.innerHTML =
        '<button type="button" class="btn btn--secondary btn--sm" data-action="add-column">Add Column</button>';
    }

    section.appendChild(addBar);
  }

  function convertToEditable(markDirty) {
    // Paragraphs — replace rendered HTML with textareas
    qsa("[data-block-id]").forEach(function (origBlock) {
      if (origBlock.dataset.blockEditable) return;

      var type = origBlock.dataset.blockType;
      var content = origBlock.dataset.blockContent || "";
      var lang = origBlock.dataset.blockLang || "";

      // Replace <pre> with <div> so layout works correctly
      var block = document.createElement("div");
      block.className = "note-detail__paragraph note-editor__block";
      block.dataset.blockId = origBlock.dataset.blockId;
      block.dataset.blockType = type;
      block.dataset.blockContent = content;
      block.dataset.blockEditable = "true";
      if (lang) block.dataset.blockLang = lang;
      origBlock.replaceWith(block);

      var controls = document.createElement("div");
      controls.className = "note-editor__block-controls";
      controls.innerHTML =
        '<button type="button" class="btn btn--tertiary btn--sm" data-action="move-up">Up</button>' +
        '<button type="button" class="btn btn--tertiary btn--sm" data-action="move-down">Down</button>' +
        '<button type="button" class="btn btn--tertiary btn--sm" data-action="toggle-type">' +
        (type === "code" ? "Text" : "Code") + "</button>" +
        '<button type="button" class="btn btn--tertiary btn--sm"' +
        ' hx-post="/notes/preview-block"' +
        ' hx-include="closest .note-editor__block"' +
        ' hx-target="next .note-editor__preview"' +
        ' hx-swap="innerHTML"' +
        ' hx-trigger="click, input delay:400ms from:closest .note-editor__block">Preview</button>' +
        '<button type="button" class="btn btn--danger btn--sm" data-action="delete-block">Del</button>';
      block.appendChild(controls);

      // Hidden type field — sent with the preview request (kept in sync by
      // the toggle-type action) so the server can render code vs markdown.
      var typeField = document.createElement("input");
      typeField.type = "hidden";
      typeField.name = "type";
      typeField.value = type;
      block.appendChild(typeField);

      if (type === "code") {
        var langInput = document.createElement("input");
        langInput.type = "text";
        langInput.name = "lang";
        langInput.className = "note-editor__lang-input";
        langInput.value = lang;
        langInput.placeholder = "language";
        block.appendChild(langInput);
      }

      var textarea = document.createElement("textarea");
      textarea.className = "note-editor__textarea";
      textarea.name = "content";
      textarea.value = content;
      textarea.rows = Math.max(3, content.split("\n").length + 1);
      textarea.addEventListener("input", autoResize);
      block.appendChild(textarea);

      // Persistent preview pane — htmx swaps the rendered fragment here.
      var preview = document.createElement("div");
      preview.className = "note-editor__preview markdown-body";
      block.appendChild(preview);

      if (window.htmx) window.htmx.process(block);
    });

    // Custom section content blocks
    qsa("[data-section-id]").forEach(function (section) {
      if (section.dataset.sectionEditable) return;
      section.dataset.sectionEditable = "true";

      var sectionControls = document.createElement("div");
      sectionControls.className = "note-editor__section-controls";
      sectionControls.innerHTML =
        '<button type="button" class="btn btn--tertiary btn--sm" data-action="move-section-up">Up</button>' +
        '<button type="button" class="btn btn--tertiary btn--sm" data-action="move-section-down">Down</button>' +
        '<button type="button" class="btn btn--danger btn--sm" data-action="delete-section">Del</button>';

      // Saved sections render their heading as <h3 class="section-heading">
      // (note-blocks.tsx); newly-added ones use note-editor__section-title-input
      // (createSectionShell). Converge them: replace the static heading with the
      // same editable title input so a saved section can be renamed, then anchor
      // the move/delete controls after it. The body-level input listener marks
      // the editor dirty, matching createSectionShell. The previous selector
      // (.note-detail__section-title) matched nothing, so saved sections had no
      // editable title and no controls — frozen after the first save.
      var heading = qs(".section-heading", section);
      var titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.className = "note-editor__section-title-input";
      titleInput.value = section.dataset.sectionTitle ||
        (heading ? heading.textContent : "");
      titleInput.addEventListener("input", function () {
        section.dataset.sectionTitle = this.value;
      });
      if (heading) heading.replaceWith(titleInput);
      else section.insertBefore(titleInput, section.firstChild);
      titleInput.after(sectionControls);

      // Tabs rebuild into stacked editable items (title input + raw textarea);
      // timeline/split merge their sub-blocks into one raw markdown textarea per
      // container. Code blocks get their ``` fences restored either way; the
      // parser splits them back into typed blocks on save.
      if (section.dataset.sectionType === "tabs") {
        convertTabsToEditable(section);
      } else {
        mergeSubBlocksToMarkdown(section);
        if (section.dataset.sectionType === "timeline") {
          makeTimelineHeadersEditable(section, markDirty);
        }
      }

      addSectionAddButtons(section);
    });
  }

  root.NoteEditorConvert = {
    convertToEditable: convertToEditable,
    addSectionAddButtons: addSectionAddButtons,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
