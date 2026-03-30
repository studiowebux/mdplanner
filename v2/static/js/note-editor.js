// Note editor — manages structured content editing on the detail page.
// Split into small functions. No classes, no framework. Uses fetch + htmx.

(function () {
  "use strict";

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  var noteId = null;
  var editing = false;
  var dirty = false;
  var saveBar = null;
  var timelineCounter = 0;

  function getNoteId() {
    if (noteId) return noteId;
    var el = document.querySelector("[data-note-id]");
    noteId = el ? el.dataset.noteId : null;
    return noteId;
  }

  // -------------------------------------------------------------------------
  // ID generation
  // -------------------------------------------------------------------------

  function genId(prefix) {
    return prefix + "_" + Date.now() + "_" +
      Math.random().toString(36).substring(2, 8);
  }

  // -------------------------------------------------------------------------
  // DOM helpers
  // -------------------------------------------------------------------------

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }
  function qsa(sel, root) {
    return (root || document).querySelectorAll(sel);
  }

  // -------------------------------------------------------------------------
  // Dirty tracking
  // -------------------------------------------------------------------------

  function markDirty() {
    if (dirty) return;
    dirty = true;
    updateSaveBar();
  }

  function clearDirty() {
    dirty = false;
    updateSaveBar();
  }

  function updateSaveBar() {
    if (!saveBar) return;
    if (dirty) {
      saveBar.classList.add("note-editor__save-bar--visible");
    } else {
      saveBar.classList.remove("note-editor__save-bar--visible");
    }
  }

  function createSaveBar() {
    if (saveBar) return;
    saveBar = document.createElement("div");
    saveBar.className = "note-editor__save-bar";
    saveBar.innerHTML =
      '<span class="note-editor__save-bar-text">Unsaved changes</span>' +
      '<button type="button" class="btn btn--primary btn--sm" data-action="save-content">Save</button>' +
      '<button type="button" class="btn btn--secondary btn--sm" data-action="cancel-edit">Cancel</button>';
    document.body.appendChild(saveBar);
  }

  function removeSaveBar() {
    if (saveBar) {
      saveBar.remove();
      saveBar = null;
    }
  }

  // Warn before leaving with unsaved changes
  window.addEventListener("beforeunload", function (e) {
    if (editing && dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  // -------------------------------------------------------------------------
  // Toggle edit mode
  // -------------------------------------------------------------------------

  function toggleEdit() {
    editing = !editing;
    var body = qs(".note-detail__body");
    var btn = qs("[data-note-edit-toggle]");
    if (!body || !btn) return;

    if (editing) {
      body.classList.add("note-detail__body--editing");
      btn.textContent = "Cancel";
      btn.classList.add("btn--danger");
      btn.classList.remove("btn--secondary");
      createSaveBar();
      showEditorControls();
      convertToEditable();
      trackDirtyInputs();
      disableFieldSwaps();
    } else {
      // Cancel — reload to discard changes
      if (dirty) {
        window.confirmAction({
          title: "Discard changes",
          message: "You have unsaved changes. Discard them?",
          confirmLabel: "Discard",
        }).then(function (ok) {
          if (ok) window.location.reload();
          else {
            editing = true; // stay in edit mode
          }
        });
      } else {
        window.location.reload();
      }
    }
  }

  function trackDirtyInputs() {
    // Any input/textarea change marks dirty
    var body = qs(".note-detail__body");
    if (!body) return;
    body.addEventListener("input", markDirty);
  }

  // -------------------------------------------------------------------------
  // Disable htmx page swaps on title/project while editing
  // -------------------------------------------------------------------------

  function disableFieldSwaps() {
    var fields = document.querySelectorAll(
      "[hx-target='#note-detail-root']",
    );
    fields.forEach(function (el) {
      el.setAttribute("hx-swap", "none");
      el.removeAttribute("hx-target");
      el.removeAttribute("hx-select");
      if (window.htmx) window.htmx.process(el);
    });
  }

  // -------------------------------------------------------------------------
  // Convert view blocks to editable
  // -------------------------------------------------------------------------

  function convertToEditable() {
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
        '<button type="button" class="btn btn--tertiary btn--sm" data-action="preview-block">Preview</button>' +
        '<button type="button" class="btn btn--danger btn--sm" data-action="delete-block">Del</button>';
      block.appendChild(controls);

      if (type === "code") {
        var langInput = document.createElement("input");
        langInput.type = "text";
        langInput.className = "note-editor__lang-input";
        langInput.value = lang;
        langInput.placeholder = "language";
        block.appendChild(langInput);
      }

      var textarea = document.createElement("textarea");
      textarea.className = "note-editor__textarea";
      textarea.value = content;
      textarea.rows = Math.max(3, content.split("\n").length + 1);
      textarea.addEventListener("input", autoResize);
      block.appendChild(textarea);
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

      var title = qs(".note-detail__section-title", section);
      if (title) title.after(sectionControls);

      // Merge all sub-blocks into one raw markdown textarea per container.
      // Code blocks get their ``` fences restored. The parser splits them
      // back into typed blocks on save.
      mergeSubBlocksToMarkdown(section);

      addSectionAddButtons(section);
    });
  }

  // Merge sub-blocks inside a container (tab panel, timeline item, column)
  // into a single raw markdown textarea. Code blocks get ``` fences restored.
  function mergeSubBlocksToMarkdown(section) {
    var containers = [];
    // Tabs: each tab panel
    qsa("[data-tab-panel]", section).forEach(function (el) {
      containers.push(el);
    });
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

      // Build raw markdown from sub-blocks
      var md = [];
      subs.forEach(function (sub) {
        var type = sub.dataset.blockType || "text";
        var content = sub.dataset.blockContent || "";
        var lang = sub.dataset.blockLang || "";
        if (type === "code") {
          md.push("```" + lang);
          md.push(content);
          md.push("```");
        } else {
          md.push(content);
        }
        md.push("");
      });

      // Remove sub-blocks from DOM
      subs.forEach(function (sub) {
        sub.remove();
      });

      // Create single textarea with raw markdown
      var wrapper = document.createElement("div");
      wrapper.className = "note-editor__raw-block";
      wrapper.dataset.rawMarkdown = "true";

      var ta = document.createElement("textarea");
      ta.className = "note-editor__textarea";
      ta.value = md.join("\n").trim();
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

  // -------------------------------------------------------------------------
  // Show/hide editor toolbar
  // -------------------------------------------------------------------------

  function showEditorControls() {
    var existing = qs(".note-editor__toolbar");
    if (existing) return;

    var toolbar = document.createElement("div");
    toolbar.className = "note-editor__toolbar";
    toolbar.innerHTML =
      '<button type="button" class="btn btn--secondary btn--sm" data-action="add-text">Add Text Block</button>' +
      '<button type="button" class="btn btn--secondary btn--sm" data-action="add-code">Add Code Block</button>' +
      '<button type="button" class="btn btn--secondary btn--sm" data-action="add-tabs-section">Add Tabs</button>' +
      '<button type="button" class="btn btn--secondary btn--sm" data-action="add-timeline-section">Add Timeline</button>' +
      '<button type="button" class="btn btn--secondary btn--sm" data-action="add-split-section">Add Split View</button>';

    var body = qs(".note-detail__body");
    if (body) body.before(toolbar);
  }

  // -------------------------------------------------------------------------
  // Preview a single block
  // -------------------------------------------------------------------------

  function previewBlock(block) {
    var ta = qs(".note-editor__textarea", block);
    if (!ta) return;
    block.dataset.blockContent = ta.value;

    var type = block.dataset.blockType;
    var content = ta.value;
    var previewDiv = qs(".note-editor__preview", block);

    if (previewDiv) {
      // Toggle off — remove preview
      previewDiv.remove();
      return;
    }

    previewDiv = document.createElement("div");
    previewDiv.className = "note-editor__preview markdown-body";

    if (type === "code") {
      var lang = block.dataset.blockLang || "";
      previewDiv.innerHTML = "<pre><code" +
        (lang ? ' class="language-' + lang + '"' : "") + ">" +
        escapeHtml(content) + "</code></pre>";
    } else {
      // Fetch rendered markdown from server
      fetch("/notes/preview-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content }),
      }).then(function (res) {
        if (!res.ok) throw new Error("Preview failed (" + res.status + ")");
        return res.text();
      }).then(function (html) {
        previewDiv.innerHTML = html;
      }).catch(function () {
        previewDiv.textContent = "Preview unavailable";
      });
    }

    block.appendChild(previewDiv);
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // -------------------------------------------------------------------------
  // Auto-resize textareas
  // -------------------------------------------------------------------------

  function autoResize() {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
  }

  // -------------------------------------------------------------------------
  // Flush DOM values back to data attributes
  // -------------------------------------------------------------------------

  function flushFromDOM() {
    qsa("[data-block-id][data-block-editable]").forEach(function (block) {
      var ta = qs(".note-editor__textarea", block);
      if (ta) block.dataset.blockContent = ta.value;
      var langInput = qs(".note-editor__lang-input", block);
      if (langInput) block.dataset.blockLang = langInput.value;
    });

    // Raw markdown blocks don't need flushing — textarea value is read
    // directly by collectContainerContent at save time.
  }

  // -------------------------------------------------------------------------
  // Collect structured data from DOM
  // -------------------------------------------------------------------------

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

  // Collect content from a container — checks for raw markdown textarea first,
  // falls back to individual sub-blocks.
  function collectContainerContent(parent) {
    var rawEl = qs("[data-raw-markdown] .note-editor__textarea", parent);
    if (rawEl) return parseMarkdownToBlocks(rawEl.value);

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

  // Parse raw markdown string into NoteParagraph-like blocks.
  // Splits on code fences and blank-line-separated paragraphs.
  function parseMarkdownToBlocks(md) {
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

  // -------------------------------------------------------------------------
  // Save — PUT to API then reload detail page
  // -------------------------------------------------------------------------

  function save() {
    var id = getNoteId();
    if (!id) return;

    flushFromDOM();
    var data = collectBlocks();

    fetch("/api/v1/notes/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paragraphs: data.paragraphs,
        customSections: data.customSections,
      }),
    }).then(function (res) {
      if (res.ok) {
        dirty = false; // prevent beforeunload warning
        window.location.reload();
      } else {
        throw new Error("Save failed (" + res.status + ")");
      }
    }).catch(function (err) {
      if (window.toast) {
        window.toast({ type: "error", message: "Failed to save note." });
      }
      console.debug("[note-editor] save failed:", err);
    });
  }

  // -------------------------------------------------------------------------
  // Add blocks
  // -------------------------------------------------------------------------

  function addTextBlock() {
    var block = createBlockElement(genId("para"), "text", "", "");
    appendToBody(block);
    markDirty();
  }

  function addCodeBlock() {
    var block = createBlockElement(genId("code"), "code", "", "javascript");
    appendToBody(block);
    markDirty();
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
      '<button type="button" class="btn btn--tertiary btn--sm" data-action="preview-block">Preview</button>' +
      '<button type="button" class="btn btn--danger btn--sm" data-action="delete-block">Del</button>';
    div.appendChild(controls);

    if (type === "code" && lang) {
      var langInput = document.createElement("input");
      langInput.type = "text";
      langInput.className = "note-editor__lang-input";
      langInput.value = lang;
      langInput.placeholder = "language";
      div.appendChild(langInput);
    }

    var textarea = document.createElement("textarea");
    textarea.className = "note-editor__textarea";
    textarea.value = content;
    textarea.rows = 3;
    textarea.addEventListener("input", autoResize);
    div.appendChild(textarea);

    return div;
  }

  function appendToBody(el) {
    var body = qs(".note-detail__body");
    if (body) {
      body.appendChild(el);
      var ta = qs(".note-editor__textarea", el);
      if (ta) ta.focus();
    }
  }

  // -------------------------------------------------------------------------
  // Add sections
  // -------------------------------------------------------------------------

  function addTabsSection() {
    var section = createSectionShell(genId("section"), "tabs", "New Tabs");
    var tab = createTabElement(genId("tab"), "Tab 1");
    qs("[data-tabs-container]", section).appendChild(tab);
    addSectionAddButtons(section);
    appendToBody(section);
    markDirty();
  }

  function addTimelineSection() {
    var section = createSectionShell(
      genId("section"),
      "timeline",
      "New Timeline",
    );
    timelineCounter = 1;
    var item = createTimelineItemElement(
      genId("timeline"),
      "Timeline 1",
      "pending",
      "",
    );
    qs("[data-timeline-container]", section).appendChild(item);
    addSectionAddButtons(section);
    appendToBody(section);
    markDirty();
  }

  function addSplitSection() {
    var section = createSectionShell(
      genId("section"),
      "split-view",
      "New Split View",
    );
    var container = qs("[data-split-container]", section);
    container.appendChild(createColumnElement(0));
    container.appendChild(createColumnElement(1));
    addSectionAddButtons(section);
    appendToBody(section);
    markDirty();
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

    qs("input[type=text]", header).addEventListener("input", function () {
      div.dataset.timelineTitle = this.value;
    });
    qs("select", header).addEventListener("change", function () {
      div.dataset.timelineStatus = this.value;
    });
    qs("input[type=date]", header).addEventListener("input", function () {
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

  // -------------------------------------------------------------------------
  // Move blocks
  // -------------------------------------------------------------------------

  function moveUp(el) {
    var prev = el.previousElementSibling;
    if (prev && !prev.classList.contains("note-editor__toolbar")) {
      el.parentNode.insertBefore(el, prev);
      markDirty();
    }
  }

  function moveDown(el) {
    var next = el.nextElementSibling;
    if (next) {
      el.parentNode.insertBefore(next, el);
      markDirty();
    }
  }

  // -------------------------------------------------------------------------
  // Event delegation
  // -------------------------------------------------------------------------

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-action]");
    if (!btn) {
      if (e.target.closest("[data-note-edit-toggle]")) {
        toggleEdit();
      }
      return;
    }

    var action = btn.dataset.action;
    var block = btn.closest("[data-block-id]");
    var section = btn.closest("[data-section-id]");

    switch (action) {
      // Block actions
      case "move-up":
        if (block) moveUp(block);
        break;
      case "move-down":
        if (block) moveDown(block);
        break;
      case "delete-block":
        if (block) {
          block.remove();
          markDirty();
        }
        break;
      case "toggle-type": {
        if (!block) break;
        var ta = qs(".note-editor__textarea", block);
        if (ta) block.dataset.blockContent = ta.value;
        var current = block.dataset.blockType;
        block.dataset.blockType = current === "code" ? "text" : "code";
        btn.textContent = current === "code" ? "Code" : "Text";
        markDirty();
        break;
      }
      case "preview-block":
        if (block) previewBlock(block);
        break;

      // Save bar actions
      case "save-content":
        save();
        break;
      case "cancel-edit":
        editing = true; // force toggleEdit to handle cancel path
        toggleEdit();
        break;

      // Toolbar actions
      case "add-text":
        addTextBlock();
        break;
      case "add-code":
        addCodeBlock();
        break;
      case "add-tabs-section":
        addTabsSection();
        break;
      case "add-timeline-section":
        addTimelineSection();
        break;
      case "add-split-section":
        addSplitSection();
        break;

      // Section actions
      case "move-section-up":
        if (section) moveUp(section);
        break;
      case "move-section-down":
        if (section) moveDown(section);
        break;
      case "delete-section":
        if (section) {
          window.confirmAction({
            title: "Delete section",
            message: "Delete this section and all its content?",
            confirmLabel: "Delete",
          }).then(function (ok) {
            if (ok) {
              section.remove();
              markDirty();
            }
          });
        }
        break;

      // Tab actions
      case "add-tab": {
        if (section) {
          var addBar = qs(".note-editor__add-bar", section);
          var count = section.querySelectorAll("[data-tab-id]").length +
            section.querySelectorAll("[data-tab-panel]").length;
          var newTab = createTabElement(genId("tab"), "Tab " + (count + 1));
          if (addBar) section.insertBefore(newTab, addBar);
          else section.appendChild(newTab);
          markDirty();
        }
        break;
      }
      case "delete-tab": {
        var tabEl = btn.closest("[data-tab-id]");
        if (tabEl) {
          tabEl.remove();
          markDirty();
        }
        break;
      }

      // Timeline actions
      case "add-timeline-item": {
        if (section) {
          var addBarTl = qs(".note-editor__add-bar", section);
          var tlCount =
            section.querySelectorAll("[data-timeline-item-id]").length;
          var newItem = createTimelineItemElement(
            genId("timeline"),
            "Timeline " + (tlCount + 1),
            "pending",
            "",
          );
          if (addBarTl) section.insertBefore(newItem, addBarTl);
          else section.appendChild(newItem);
          markDirty();
        }
        break;
      }
      case "delete-timeline-item": {
        var itemEl = btn.closest("[data-timeline-item-id]");
        if (itemEl) {
          itemEl.remove();
          markDirty();
        }
        break;
      }

      // Column actions
      case "add-column": {
        if (section) {
          var splitCont = qs("[data-split-container]", section) ||
            qs(".note-detail__split-view", section);
          if (splitCont) {
            var colCount =
              splitCont.querySelectorAll("[data-column-index]").length;
            splitCont.appendChild(createColumnElement(colCount));
            markDirty();
          }
        }
        break;
      }
    }
  });
})();
