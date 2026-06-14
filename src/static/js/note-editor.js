// Note editor — orchestrates structured content editing on the detail page.
// State, edit-mode lifecycle, dirty/save-bar, save, block/section add + move,
// and click dispatch live here; the heavy lifting is split into sibling
// modules loaded first: note-editor-util.js (helpers), note-editor-builders.js
// (DOM factories), note-editor-collect.js (DOM → payload), note-editor-convert.js
// (render → editable). No classes, no framework. Uses fetch + htmx.

(function () {
  "use strict";

  var U = globalThis.NoteEditorUtil;
  var Builders = globalThis.NoteEditorBuilders;
  var Collect = globalThis.NoteEditorCollect;
  var Convert = globalThis.NoteEditorConvert;
  var qs = U.qs;
  var genId = U.genId;

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  var noteId = null;
  var editing = false;
  var dirty = false;
  var saveBar = null;

  function getNoteId() {
    if (noteId) return noteId;
    var el = document.querySelector("[data-note-id]");
    noteId = el ? el.dataset.noteId : null;
    return noteId;
  }

  // -------------------------------------------------------------------------
  // Dirty tracking
  // -------------------------------------------------------------------------

  function markDirty() {
    if (dirty) return;
    dirty = true;
    updateSaveBar();
    setUnsaved(true);
  }

  function clearDirty() {
    dirty = false;
    updateSaveBar();
    setUnsaved(false);
  }

  // Declare unsaved state to the central dirty guard (dirty-guard.js) via a
  // generic attribute on the edit root — the block editor is bespoke, so it
  // opts into the shared beforeunload guard this way rather than per-field.
  function setUnsaved(on) {
    var root = qs(".note-detail__body");
    if (!root) return;
    if (on) {
      root.setAttribute("data-unsaved", "true");
    } else {
      root.removeAttribute("data-unsaved");
    }
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

  // Unsaved-changes warning is handled centrally by dirty-guard.js, which reads
  // the [data-unsaved] attribute set via setUnsaved() above. No local
  // beforeunload listener — one guard covers every edit surface.

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
      Convert.convertToEditable(markDirty);
      trackDirtyInputs();
      disableFieldSwaps();
    } else {
      // Cancel — discard in-DOM edits by re-rendering the server view.
      if (dirty) {
        window.confirmAction({
          title: "Discard changes",
          message: "You have unsaved changes. Discard them?",
          confirmLabel: "Discard",
        }).then(function (ok) {
          if (ok) exitEditMode();
          else editing = true; // declined — stay in edit mode
        });
      } else {
        exitEditMode();
      }
    }
  }

  // Leave edit mode: drop dirty state, remove the save bar, and re-render the
  // detail from the server. The re-render is true htmx — dispatching note:refresh
  // fires the declarative hx-get on the SseRefresh element (clientTrigger), which
  // morph-swaps #note-detail-root. No window.location.reload, no htmx.ajax.
  function exitEditMode() {
    editing = false;
    clearDirty();
    removeSaveBar();
    document.body.dispatchEvent(
      new CustomEvent("note:refresh", { bubbles: true }),
    );
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
    // Scope to the header so only the title/project inline-edit inputs are
    // neutralized. A document-wide selector also matched the SseRefresh element
    // (same hx-target="#note-detail-root"), permanently killing live refresh
    // and the post-save re-render.
    var header = document.getElementById("note-detail-header");
    if (!header) return;
    var fields = header.querySelectorAll("[hx-target='#note-detail-root']");
    fields.forEach(function (el) {
      el.setAttribute("hx-swap", "none");
      el.removeAttribute("hx-target");
      el.removeAttribute("hx-select");
      if (window.htmx) window.htmx.process(el);
    });
  }

  // Guard the SSE live-refresh while editing: a note.updated arriving mid-edit
  // (save echo or another tab) must not morph #note-detail-root and wipe the
  // open editor. exitEditMode() sets editing=false BEFORE dispatching
  // note:refresh, so the post-save re-render still passes this guard.
  function guardSseRefresh() {
    var sse = document.querySelector("[sse-connect][hx-get]");
    if (!sse || sse.dataset.editGuard) return;
    sse.dataset.editGuard = "true";
    sse.addEventListener("htmx:beforeRequest", function (e) {
      // Only cancel the SSE element's OWN live-refresh request. htmx:beforeRequest
      // bubbles, so without the target check this also cancels descendant
      // requests (e.g. the per-block Preview button), which is why Preview never
      // populated while editing.
      if (editing && e.target === sse) e.preventDefault();
    });
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
  // Save — PUT to API then reload detail page
  // -------------------------------------------------------------------------

  function save() {
    var id = getNoteId();
    if (!id) return;

    Collect.flushFromDOM();
    var data = Collect.collectBlocks();

    fetch("/notes/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paragraphs: data.paragraphs,
        customSections: data.customSections,
      }),
    }).then(function (res) {
      if (res.ok) {
        exitEditMode(); // clears dirty + re-renders the saved view via htmx
        if (window.toast) {
          window.toast({ type: "success", message: "Note saved" });
        }
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
  // Add blocks / sections
  // -------------------------------------------------------------------------

  function appendToBody(el) {
    var body = qs(".note-detail__body");
    if (body) {
      body.appendChild(el);
      var ta = qs(".note-editor__textarea", el);
      if (ta) ta.focus();
    }
  }

  function addTextBlock() {
    appendToBody(Builders.createBlockElement(genId("para"), "text", "", ""));
    markDirty();
  }

  function addCodeBlock() {
    appendToBody(
      Builders.createBlockElement(genId("code"), "code", "", "javascript"),
    );
    markDirty();
  }

  function addTabsSection() {
    var section = Builders.createSectionShell(
      genId("section"),
      "tabs",
      "New Tabs",
    );
    qs("[data-tabs-container]", section).appendChild(
      Builders.createTabElement(genId("tab"), "Tab 1"),
    );
    Convert.addSectionAddButtons(section);
    appendToBody(section);
    markDirty();
  }

  function addTimelineSection() {
    var section = Builders.createSectionShell(
      genId("section"),
      "timeline",
      "New Timeline",
    );
    qs("[data-timeline-container]", section).appendChild(
      Builders.createTimelineItemElement(
        genId("timeline"),
        "Timeline 1",
        "pending",
        "",
      ),
    );
    Convert.addSectionAddButtons(section);
    appendToBody(section);
    markDirty();
  }

  function addSplitSection() {
    var section = Builders.createSectionShell(
      genId("section"),
      "split-view",
      "New Split View",
    );
    var container = qs("[data-split-container]", section);
    container.appendChild(Builders.createColumnElement(0));
    container.appendChild(Builders.createColumnElement(1));
    Convert.addSectionAddButtons(section);
    appendToBody(section);
    markDirty();
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
  // Click-action handlers (dispatch table — keeps the delegate flat)
  // -------------------------------------------------------------------------

  function toggleBlockType(btn, block) {
    if (!block) return;
    var ta = qs(".note-editor__textarea", block);
    if (ta) block.dataset.blockContent = ta.value;
    var current = block.dataset.blockType;
    block.dataset.blockType = current === "code" ? "text" : "code";
    btn.textContent = current === "code" ? "Code" : "Text";
    var typeField = qs('input[name="type"]', block);
    if (typeField) typeField.value = block.dataset.blockType;
    markDirty();
  }

  function deleteClosest(btn, selector) {
    var el = btn.closest(selector);
    if (el) {
      el.remove();
      markDirty();
    }
  }

  function deleteSection(section) {
    if (!section) return;
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

  function addTab(section) {
    if (!section) return;
    var addBar = qs(".note-editor__add-bar", section);
    var count = section.querySelectorAll("[data-tab-id]").length +
      section.querySelectorAll("[data-tab-panel]").length;
    var newTab = Builders.createTabElement(genId("tab"), "Tab " + (count + 1));
    if (addBar) section.insertBefore(newTab, addBar);
    else section.appendChild(newTab);
    markDirty();
  }

  function addTimelineItem(section) {
    if (!section) return;
    var addBar = qs(".note-editor__add-bar", section);
    var count = section.querySelectorAll("[data-timeline-item-id]").length;
    var newItem = Builders.createTimelineItemElement(
      genId("timeline"),
      "Timeline " + (count + 1),
      "pending",
      "",
    );
    if (addBar) section.insertBefore(newItem, addBar);
    else section.appendChild(newItem);
    markDirty();
  }

  function addColumn(section) {
    if (!section) return;
    var splitCont = qs("[data-split-container]", section) ||
      qs(".note-detail__split-view", section);
    if (!splitCont) return;
    var colCount = splitCont.querySelectorAll("[data-column-index]").length;
    splitCont.appendChild(Builders.createColumnElement(colCount));
    markDirty();
  }

  // action name → handler({ btn, block, section }). Flat lookup keeps the
  // click delegate's complexity low (was a 20-case switch, cyclomatic 42).
  var ACTIONS = {
    "move-up": function (ctx) {
      if (ctx.block) moveUp(ctx.block);
    },
    "move-down": function (ctx) {
      if (ctx.block) moveDown(ctx.block);
    },
    "delete-block": function (ctx) {
      if (ctx.block) {
        ctx.block.remove();
        markDirty();
      }
    },
    "toggle-type": function (ctx) {
      toggleBlockType(ctx.btn, ctx.block);
    },
    "save-content": function () {
      save();
    },
    "cancel-edit": function () {
      editing = true; // force toggleEdit to handle cancel path
      toggleEdit();
    },
    "add-text": addTextBlock,
    "add-code": addCodeBlock,
    "add-tabs-section": addTabsSection,
    "add-timeline-section": addTimelineSection,
    "add-split-section": addSplitSection,
    "move-section-up": function (ctx) {
      if (ctx.section) moveUp(ctx.section);
    },
    "move-section-down": function (ctx) {
      if (ctx.section) moveDown(ctx.section);
    },
    "delete-section": function (ctx) {
      deleteSection(ctx.section);
    },
    "add-tab": function (ctx) {
      addTab(ctx.section);
    },
    "delete-tab": function (ctx) {
      deleteClosest(ctx.btn, "[data-tab-id]");
    },
    "add-timeline-item": function (ctx) {
      addTimelineItem(ctx.section);
    },
    "delete-timeline-item": function (ctx) {
      deleteClosest(ctx.btn, "[data-timeline-item-id]");
    },
    "add-column": function (ctx) {
      addColumn(ctx.section);
    },
  };

  // -------------------------------------------------------------------------
  // Event delegation
  // -------------------------------------------------------------------------

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-action]");
    if (!btn) {
      if (e.target.closest("[data-note-edit-toggle]")) toggleEdit();
      return;
    }
    var handler = ACTIONS[btn.dataset.action];
    if (!handler) return;
    handler({
      btn: btn,
      block: btn.closest("[data-block-id]"),
      section: btn.closest("[data-section-id]"),
    });
  });

  // -------------------------------------------------------------------------
  // Title field — explicit Save (no save-on-blur). The Save button is revealed
  // only while the title differs from the persisted value; htmx performs the
  // actual save + re-render on click. data-unsaved opts the field into the
  // central dirty guard (dirty-guard.js) so leaving with unsaved edits warns.
  // -------------------------------------------------------------------------

  function wireTitleSave() {
    var input = document.getElementById("note-title-input");
    if (!input || input.dataset.titleWired) return;
    input.dataset.titleWired = "true";
    var btn = document.getElementById("note-title-save");
    if (!btn) return;
    var original = input.dataset.noteTitleOriginal || "";
    input.addEventListener("input", function () {
      var changed = input.value !== original;
      btn.classList.toggle("is-hidden", !changed);
      if (changed) btn.setAttribute("data-unsaved", "true");
      else btn.removeAttribute("data-unsaved");
    });
  }

  // Init — attach the SSE edit-guard once the SseRefresh element exists (the
  // [data-edit-guard] flag inside guardSseRefresh() keeps it bound only once)
  // and wire the explicit title Save. Both are idempotent and re-run on
  // htmx:load so they re-bind after #note-detail-root re-renders.
  function initEditor() {
    guardSseRefresh();
    wireTitleSave();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEditor);
  } else {
    initEditor();
  }
  document.addEventListener("htmx:load", initEditor);
})();
