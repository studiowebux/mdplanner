// note-editor-builders.js — pure DOM factories for the note editor. Each
// function returns a detached element built from its arguments; no shared
// editor state. Exposed as globalThis.NoteEditorBuilders. Loaded AFTER
// note-editor-util.js, BEFORE note-editor.js. Classic browser script.

(function (root) {
  "use strict";

  var U = root.NoteEditorUtil;
  var escapeHtml = U.escapeHtml;
  var autoResize = U.autoResize;

  // Creates a raw markdown textarea wrapper for section content editing.
  function createRawMarkdownBlock(content) {
    var wrapper = document.createElement("div");
    wrapper.className = "note-editor__raw-block";
    wrapper.dataset.rawMarkdown = "true";

    var ta = document.createElement("textarea");
    ta.className = "note-editor__textarea";
    ta.value = content;
    ta.rows = Math.max(3, content.split("\n").length + 1);
    ta.addEventListener("input", autoResize);
    wrapper.appendChild(ta);

    return wrapper;
  }

  function createBlockElement(id, type, content, lang) {
    var div = document.createElement("div");
    div.className = "note-detail__paragraph note-editor__block";
    div.dataset.blockId = id;
    div.dataset.blockType = type;
    div.dataset.blockContent = content;
    div.dataset.blockEditable = "true";
    if (lang) div.dataset.blockLang = lang;

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
      ' hx-swap="innerHTML">Preview</button>' +
      '<button type="button" class="btn btn--danger btn--sm" data-action="delete-block">Del</button>';
    div.appendChild(controls);

    // Hidden type field — sent with the preview request (kept in sync by
    // the toggle-type action) so the server can render code vs markdown.
    var typeField = document.createElement("input");
    typeField.type = "hidden";
    typeField.name = "type";
    typeField.value = type;
    div.appendChild(typeField);

    if (type === "code" && lang) {
      var langInput = document.createElement("input");
      langInput.type = "text";
      langInput.name = "lang";
      langInput.className = "note-editor__lang-input";
      langInput.value = lang;
      langInput.placeholder = "language";
      div.appendChild(langInput);
    }

    var textarea = document.createElement("textarea");
    textarea.className = "note-editor__textarea";
    textarea.name = "content";
    textarea.value = content;
    textarea.rows = 3;
    textarea.addEventListener("input", autoResize);
    div.appendChild(textarea);

    // Persistent preview pane — htmx swaps the rendered fragment here.
    var preview = document.createElement("div");
    preview.className = "note-editor__preview markdown-body";
    div.appendChild(preview);

    if (window.htmx) window.htmx.process(div);

    return div;
  }

  function createSectionShell(id, type, title) {
    var div = document.createElement("div");
    div.className = "note-detail__section-block note-editor__section";
    div.dataset.sectionId = id;
    div.dataset.sectionType = type;
    div.dataset.sectionTitle = title;
    div.dataset.sectionEditable = "true";

    var titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.className = "note-editor__section-title-input";
    titleInput.value = title;
    titleInput.addEventListener("input", function () {
      div.dataset.sectionTitle = this.value;
    });

    var controls = document.createElement("div");
    controls.className = "note-editor__section-controls";
    controls.innerHTML =
      '<button type="button" class="btn btn--tertiary btn--sm" data-action="move-section-up">Up</button>' +
      '<button type="button" class="btn btn--tertiary btn--sm" data-action="move-section-down">Down</button>' +
      '<button type="button" class="btn btn--danger btn--sm" data-action="delete-section">Del</button>';

    div.appendChild(titleInput);
    div.appendChild(controls);

    var container = document.createElement("div");
    if (type === "tabs") container.dataset.tabsContainer = "";
    else if (type === "timeline") container.dataset.timelineContainer = "";
    else if (type === "split-view") {
      container.dataset.splitContainer = "";
      container.className = "note-detail__split-view";
    }
    div.appendChild(container);

    return div;
  }

  function createTabElement(id, title) {
    var div = document.createElement("div");
    div.dataset.tabId = id;
    div.dataset.tabTitle = title;
    div.className = "note-editor__tab-item";

    var header = document.createElement("div");
    header.className = "note-editor__tab-header";
    var titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.className = "note-editor__tab-title-input";
    titleInput.value = title;
    titleInput.addEventListener("input", function () {
      div.dataset.tabTitle = this.value;
    });
    var delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn--danger btn--sm";
    delBtn.textContent = "Del";
    delBtn.dataset.action = "delete-tab";
    header.appendChild(titleInput);
    header.appendChild(delBtn);
    div.appendChild(header);

    div.appendChild(createRawMarkdownBlock(""));

    return div;
  }

  function createTimelineItemElement(id, title, status, date) {
    var div = document.createElement("div");
    div.dataset.timelineItemId = id;
    div.dataset.timelineTitle = title;
    div.dataset.timelineStatus = status;
    div.dataset.timelineDate = date || "";
    div.className = "note-editor__timeline-item";

    var header = document.createElement("div");
    header.className = "note-editor__timeline-header";
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
      (date || "") + '">' +
      '<button type="button" class="btn btn--danger btn--sm" data-action="delete-timeline-item">Del</button>';

    U.qs("input[type=text]", header).addEventListener("input", function () {
      div.dataset.timelineTitle = this.value;
    });
    U.qs("select", header).addEventListener("change", function () {
      div.dataset.timelineStatus = this.value;
    });
    U.qs("input[type=date]", header).addEventListener("input", function () {
      div.dataset.timelineDate = this.value;
    });

    div.appendChild(header);
    div.appendChild(createRawMarkdownBlock(""));

    return div;
  }

  function createColumnElement(index) {
    var div = document.createElement("div");
    div.className = "note-detail__split-col";
    div.dataset.columnIndex = String(index);
    div.appendChild(createRawMarkdownBlock(""));
    return div;
  }

  root.NoteEditorBuilders = {
    createRawMarkdownBlock: createRawMarkdownBlock,
    createBlockElement: createBlockElement,
    createSectionShell: createSectionShell,
    createTabElement: createTabElement,
    createTimelineItemElement: createTimelineItemElement,
    createColumnElement: createColumnElement,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
