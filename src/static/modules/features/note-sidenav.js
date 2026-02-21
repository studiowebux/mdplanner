// Note Sidenav Module
// Slide-in panel for note creation and editing
// Pattern: Sidenav Module with Enhanced Features

import { Sidenav } from "../ui/sidenav.js";
import { NotesAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { escapeHtml, markdownToHtml } from "../utils.js";

export class NoteSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingNoteIndex = null;
    this.isNewNote = false;
    this.autoSaveTimeout = null;
    // Enhancement: Multi-select mode
    this.multiSelectMode = false;
    this.selectedParagraphs = new Set();
    // Enhancement: Drag and drop
    this.draggedParagraphId = null;
  }

  bindEvents() {
    // Close button
    document.getElementById("noteSidenavClose")?.addEventListener(
      "click",
      () => {
        this.close();
      },
    );

    // Cancel button
    document.getElementById("noteSidenavCancel")?.addEventListener(
      "click",
      () => {
        this.close();
      },
    );

    // Delete button
    document.getElementById("noteSidenavDelete")?.addEventListener(
      "click",
      () => {
        this.handleDelete();
      },
    );

    // Title input auto-save
    document.getElementById("noteSidenavTitle")?.addEventListener(
      "input",
      () => {
        this.scheduleAutoSave();
      },
    );

    // Basic mode editor auto-save
    document.getElementById("noteSidenavEditor")?.addEventListener(
      "input",
      () => {
        this.scheduleAutoSave();
      },
    );

    // Mode toggle buttons
    document.getElementById("noteSidenavModeBasic")?.addEventListener(
      "click",
      () => {
        this.setMode("basic");
      },
    );
    document.getElementById("noteSidenavModeEnhanced")?.addEventListener(
      "click",
      () => {
        this.setMode("enhanced");
      },
    );

    // Enhanced mode buttons
    document.getElementById("noteSidenavAddParagraph")?.addEventListener(
      "click",
      () => {
        this.addParagraph("text");
      },
    );
    document.getElementById("noteSidenavAddCode")?.addEventListener(
      "click",
      () => {
        this.addParagraph("code");
      },
    );

    // Enhancement: Multi-select toggle
    document.getElementById("noteSidenavMultiSelect")?.addEventListener(
      "click",
      () => {
        this.toggleMultiSelectMode();
      },
    );

    // Enhancement: Bulk delete
    document.getElementById("noteSidenavBulkDelete")?.addEventListener(
      "click",
      () => {
        this.bulkDeleteParagraphs();
      },
    );

    // Enhancement: Move selected up/down
    document.getElementById("noteSidenavMoveUp")?.addEventListener(
      "click",
      () => {
        this.moveSelectedParagraphs(-1);
      },
    );
    document.getElementById("noteSidenavMoveDown")?.addEventListener(
      "click",
      () => {
        this.moveSelectedParagraphs(1);
      },
    );

    // Enhancement: File drop zone / markdown import
    document.getElementById("noteSidenavImportMd")?.addEventListener(
      "click",
      () => {
        document.getElementById("noteSidenavFileInput")?.click();
      },
    );
    document.getElementById("noteSidenavFileInput")?.addEventListener(
      "change",
      (e) => {
        this.handleFileImport(e.target.files);
      },
    );

    // Enhancement: Open full editor
    document.getElementById("noteSidenavFullEditor")?.addEventListener(
      "click",
      () => {
        this.openFullEditor();
      },
    );

    // Enhancement: Custom sections
    document.getElementById("noteSidenavAddSection")?.addEventListener(
      "click",
      () => {
        this.addCustomSection();
      },
    );

    // Enhancement: Drop zone for drag and drop files
    const dropZone = document.getElementById("noteSidenavDropZone");
    if (dropZone) {
      dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("drag-over");
      });
      dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("drag-over");
      });
      dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("drag-over");
        this.handleFileImport(e.dataTransfer.files);
      });
    }
  }

  /**
   * Open sidenav for new note
   */
  openNew() {
    this.editingNoteIndex = null;
    this.isNewNote = true;

    // Update title
    document.getElementById("noteSidenavHeader").textContent = "New Note";

    // Reset form
    document.getElementById("noteSidenavTitle").value = "";
    document.getElementById("noteSidenavEditor").value = "";

    // Show basic mode by default
    this.updateModeUI("basic");
    this.showBasicEditor();

    // Hide delete button for new notes
    document.getElementById("noteSidenavDelete").classList.add("hidden");

    // Open sidenav
    Sidenav.open("noteSidenav");
  }

  /**
   * Open sidenav for existing note
   * @param {number} noteIndex - Index of the note in tm.notes array
   */
  openEdit(noteIndex) {
    const note = this.tm.notes[noteIndex];
    if (!note) return;

    this.editingNoteIndex = noteIndex;
    this.isNewNote = false;

    // Update title
    document.getElementById("noteSidenavHeader").textContent = "Edit Note";

    // Fill form
    document.getElementById("noteSidenavTitle").value = note.title || "";

    const isEnhanced = note.mode === "enhanced";
    this.updateModeUI(isEnhanced ? "enhanced" : "basic");

    if (isEnhanced) {
      this.showEnhancedEditor();
      this.renderEnhancedContent(note);
    } else {
      this.showBasicEditor();
      document.getElementById("noteSidenavEditor").value = note.content || "";
    }

    // Show delete button
    document.getElementById("noteSidenavDelete").classList.remove("hidden");

    // Open sidenav
    Sidenav.open("noteSidenav");
  }

  close() {
    // Clear any pending auto-save
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }

    // Reset multi-select state
    this.multiSelectMode = false;
    this.selectedParagraphs.clear();
    this.updateMultiSelectUI();

    Sidenav.close("noteSidenav");
    this.editingNoteIndex = null;
    this.isNewNote = false;
  }

  setMode(mode) {
    this.updateModeUI(mode);

    if (mode === "enhanced") {
      this.showEnhancedEditor();
      // Initialize empty paragraphs for new enhanced notes
      if (this.isNewNote) {
        this.renderEnhancedContent({ paragraphs: [], customSections: [] });
      }
    } else {
      this.showBasicEditor();
    }

    // If editing existing note, update its mode and save
    if (!this.isNewNote && this.editingNoteIndex !== null) {
      const note = this.tm.notes[this.editingNoteIndex];
      if (note) {
        note.mode = mode;
        if (
          mode === "enhanced" &&
          (!note.paragraphs || note.paragraphs.length === 0)
        ) {
          // Parse existing content into paragraphs
          const parsed = this.tm.parseContentAndCustomSections(
            note.content || "",
          );
          note.paragraphs = parsed.paragraphs;
          note.customSections = parsed.customSections;
          this.renderEnhancedContent(note);
        }
        this.scheduleAutoSave();
      }
    }
  }

  updateModeUI(mode) {
    const basicBtn = document.getElementById("noteSidenavModeBasic");
    const enhancedBtn = document.getElementById("noteSidenavModeEnhanced");

    if (mode === "enhanced") {
      basicBtn.classList.remove(
        "bg-inverse",
        "text-white",
      );
      basicBtn.classList.add(
        "bg-primary",
        "text-secondary",
        "border",
        "border-strong",
      );
      enhancedBtn.classList.remove(
        "bg-primary",
        "text-secondary",
        "border",
        "border-strong",
      );
      enhancedBtn.classList.add("bg-info", "text-white");
    } else {
      basicBtn.classList.add(
        "bg-inverse",
        "text-white",
      );
      basicBtn.classList.remove(
        "bg-primary",
        "text-secondary",
        "border",
        "border-strong",
      );
      enhancedBtn.classList.add(
        "bg-primary",
        "text-secondary",
        "border",
        "border-strong",
      );
      enhancedBtn.classList.remove("bg-info", "text-white");
    }
  }

  showBasicEditor() {
    document.getElementById("noteSidenavBasicEditor").classList.remove(
      "hidden",
    );
    document.getElementById("noteSidenavEnhancedEditor").classList.add(
      "hidden",
    );
  }

  showEnhancedEditor() {
    document.getElementById("noteSidenavBasicEditor").classList.add("hidden");
    document.getElementById("noteSidenavEnhancedEditor").classList.remove(
      "hidden",
    );
  }

  renderEnhancedContent(note) {
    const container = document.getElementById("noteSidenavParagraphs");
    if (!container) return;

    const paragraphs = note.paragraphs || [];

    if (paragraphs.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-muted">
          <p>No content yet. Click "+ Text" or "+ Code" to add a paragraph.</p>
        </div>
      `;
    } else {
      const sortedParagraphs = [...paragraphs].sort((a, b) =>
        (a.order || 0) - (b.order || 0)
      );
      container.innerHTML = sortedParagraphs.map((p) =>
        this.renderParagraphElement(p)
      ).join("");
    }

    // Also render custom sections
    this.renderCustomSections(note);
  }

  renderParagraphElement(paragraph) {
    const isCode = paragraph.type === "code";
    const isSelected = this.selectedParagraphs.has(paragraph.id);
    const languageOptions = [
      "javascript",
      "typescript",
      "python",
      "html",
      "css",
      "sql",
      "bash",
      "json",
      "markdown",
      "text",
    ]
      .map((lang) =>
        `<option value="${lang}" ${
          paragraph.language === lang ? "selected" : ""
        }>${lang}</option>`
      )
      .join("");

    // Enhancement: Drag and drop attributes + multi-select checkbox
    return `
      <div class="paragraph-item border ${
      isSelected
        ? "border-info ring-2 ring-2"
        : "border-default"
    } rounded-lg mb-3 ${this.multiSelectMode ? "cursor-pointer" : ""}"
           data-paragraph-id="${paragraph.id}"
           draggable="true"
           ondragstart="taskManager.noteSidenav.handleDragStart(event, '${paragraph.id}')"
           ondragover="taskManager.noteSidenav.handleDragOver(event)"
           ondrop="taskManager.noteSidenav.handleDrop(event, '${paragraph.id}')"
           ondragend="taskManager.noteSidenav.handleDragEnd(event)">
        <div class="flex items-center justify-between px-3 py-2 bg-secondary border-b border-default rounded-t-lg">
          <div class="flex items-center gap-2">
            ${
      this.multiSelectMode
        ? `
              <input type="checkbox" class="paragraph-checkbox rounded text-info"
                     ${isSelected ? "checked" : ""}
                     onclick="taskManager.noteSidenav.toggleParagraphSelection('${paragraph.id}')">
            `
        : `
              <span class="cursor-grab text-muted hover:text-secondary" title="Drag to reorder">⋮⋮</span>
            `
    }
            <span class="text-xs text-muted">${
      isCode ? "Code" : "Text"
    }</span>
            ${
      isCode
        ? `
              <select class="text-xs border border-strong rounded px-2 py-1 bg-primary text-primary"
                      onchange="taskManager.noteSidenav.updateParagraphLanguage('${paragraph.id}', this.value)">
                ${languageOptions}
              </select>
            `
        : ""
    }
          </div>
          <div class="flex items-center gap-1">
            <button type="button" onclick="taskManager.noteSidenav.toggleParagraphType('${paragraph.id}')"
                    class="px-2 py-1 text-xs text-secondary hover:text-primary" title="Toggle type">
              ${isCode ? "Text" : "Code"}
            </button>
            <button type="button" onclick="taskManager.noteSidenav.deleteParagraph('${paragraph.id}')"
                    class="px-2 py-1 text-xs text-error hover:text-error-text" title="Delete">
              Del
            </button>
          </div>
        </div>
        <textarea rows="${isCode ? 8 : 4}"
                  class="w-full p-3 border-0 resize-none focus:outline-none focus:ring-1 focus:ring-1 rounded-b-lg text-sm ${
      isCode
        ? "font-mono bg-secondary"
        : "bg-primary"
    } text-primary"
                  placeholder="${isCode ? "Enter code..." : "Enter text..."}"
                  onblur="taskManager.noteSidenav.updateParagraphContent('${paragraph.id}', this.value)">${
      escapeHtml(paragraph.content || "")
    }</textarea>
      </div>
    `;
  }

  addParagraph(type) {
    let note;

    if (this.isNewNote) {
      // For new notes, create a temporary note object
      note = this._getTempNote();
    } else {
      note = this.tm.notes[this.editingNoteIndex];
    }

    if (!note) return;

    if (!note.paragraphs) {
      note.paragraphs = [];
    }

    const newParagraph = {
      id: "para_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      type: type,
      content: "",
      language: type === "code" ? "javascript" : undefined,
      order: note.paragraphs.length,
    };

    note.paragraphs.push(newParagraph);

    if (this.isNewNote) {
      this._setTempNote(note);
    }

    this.renderEnhancedContent(note);
    this.scheduleAutoSave();

    // Focus the new paragraph
    setTimeout(() => {
      const textarea = document.querySelector(
        `[data-paragraph-id="${newParagraph.id}"] textarea`,
      );
      if (textarea) textarea.focus();
    }, 100);
  }

  updateParagraphContent(paragraphId, content) {
    const note = this.isNewNote
      ? this._getTempNote()
      : this.tm.notes[this.editingNoteIndex];
    if (!note || !note.paragraphs) return;

    const paragraph = note.paragraphs.find((p) => p.id === paragraphId);
    if (paragraph && paragraph.content !== content) {
      paragraph.content = content;
      if (this.isNewNote) {
        this._setTempNote(note);
      }
      this.scheduleAutoSave();
    }
  }

  updateParagraphLanguage(paragraphId, language) {
    const note = this.isNewNote
      ? this._getTempNote()
      : this.tm.notes[this.editingNoteIndex];
    if (!note || !note.paragraphs) return;

    const paragraph = note.paragraphs.find((p) => p.id === paragraphId);
    if (paragraph) {
      paragraph.language = language;
      if (this.isNewNote) {
        this._setTempNote(note);
      }
      this.scheduleAutoSave();
    }
  }

  toggleParagraphType(paragraphId) {
    const note = this.isNewNote
      ? this._getTempNote()
      : this.tm.notes[this.editingNoteIndex];
    if (!note || !note.paragraphs) return;

    const paragraph = note.paragraphs.find((p) => p.id === paragraphId);
    if (paragraph) {
      paragraph.type = paragraph.type === "code" ? "text" : "code";
      if (paragraph.type === "code" && !paragraph.language) {
        paragraph.language = "javascript";
      }
      if (this.isNewNote) {
        this._setTempNote(note);
      }
      this.renderEnhancedContent(note);
      this.scheduleAutoSave();
    }
  }

  deleteParagraph(paragraphId) {
    if (!confirm("Delete this paragraph?")) return;

    const note = this.isNewNote
      ? this._getTempNote()
      : this.tm.notes[this.editingNoteIndex];
    if (!note || !note.paragraphs) return;

    note.paragraphs = note.paragraphs.filter((p) => p.id !== paragraphId);
    note.paragraphs.forEach((p, index) => p.order = index);

    if (this.isNewNote) {
      this._setTempNote(note);
    }

    this.renderEnhancedContent(note);
    this.scheduleAutoSave();
  }

  // Temporary note storage for new notes
  _tempNote = null;

  _getTempNote() {
    if (!this._tempNote) {
      this._tempNote = {
        title: "",
        content: "",
        mode: "basic",
        paragraphs: [],
        customSections: [],
      };
    }
    return this._tempNote;
  }

  _setTempNote(note) {
    this._tempNote = note;
  }

  _clearTempNote() {
    this._tempNote = null;
  }

  scheduleAutoSave() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Show saving indicator
    this.showSaveStatus("Saving...");

    this.autoSaveTimeout = setTimeout(async () => {
      await this.save();
    }, 1000);
  }

  async save() {
    const title = document.getElementById("noteSidenavTitle").value.trim();
    const isEnhanced = document.getElementById("noteSidenavModeEnhanced")
      .classList.contains("bg-info");

    if (!title) {
      this.showSaveStatus("Title required");
      return;
    }

    try {
      if (this.isNewNote) {
        // Create new note
        const tempNote = this._getTempNote();
        const noteData = {
          title,
          content: isEnhanced
            ? this.buildContentFromParagraphs(tempNote.paragraphs)
            : document.getElementById("noteSidenavEditor").value,
          mode: isEnhanced ? "enhanced" : "basic",
        };

        if (isEnhanced) {
          noteData.paragraphs = tempNote.paragraphs;
          noteData.customSections = tempNote.customSections || [];
        }

        const response = await NotesAPI.create(noteData);
        if (response.ok) {
          this.showSaveStatus("Saved");
          this._clearTempNote();
          this.isNewNote = false;

          // Reload notes and select the new one
          await this.tm.loadNotes();
          this.editingNoteIndex = this.tm.notes.length - 1;
          this.tm.activeNote = this.editingNoteIndex;
          this.tm.renderNotesView();

          // Update header
          document.getElementById("noteSidenavHeader").textContent =
            "Edit Note";
          document.getElementById("noteSidenavDelete").classList.remove(
            "hidden",
          );
        } else {
          this.showSaveStatus("Error");
        }
      } else {
        // Update existing note
        const note = this.tm.notes[this.editingNoteIndex];
        if (!note) return;

        note.title = title;
        note.mode = isEnhanced ? "enhanced" : "basic";

        if (isEnhanced) {
          note.content = this.buildContentFromParagraphs(note.paragraphs);
        } else {
          note.content = document.getElementById("noteSidenavEditor").value;
        }

        const saveData = {
          title: note.title,
          content: note.content,
          mode: note.mode,
          paragraphs: note.paragraphs,
          customSections: note.customSections,
        };

        const response = await NotesAPI.update(note.id, saveData);
        if (response.ok) {
          this.showSaveStatus("Saved");
          this.tm.renderNotesView();
        } else {
          this.showSaveStatus("Error");
        }
      }
    } catch (error) {
      console.error("Error saving note:", error);
      this.showSaveStatus("Error");
    }
  }

  buildContentFromParagraphs(paragraphs) {
    if (!paragraphs || paragraphs.length === 0) return "";

    const sorted = [...paragraphs].sort((a, b) =>
      (a.order || 0) - (b.order || 0)
    );
    return sorted.map((p) => {
      if (p.type === "code") {
        return `\`\`\`${p.language || "text"}\n${p.content}\n\`\`\``;
      }
      return p.content;
    }).join("\n\n");
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById("noteSidenavSaveStatus");
    if (statusEl) {
      statusEl.textContent = text;
      statusEl.classList.remove(
        "hidden",
        "sidenav-status-saved",
        "sidenav-status-saving",
        "sidenav-status-error",
      );

      if (text === "Saved") {
        statusEl.classList.add("sidenav-status-saved");
      } else if (text === "Error" || text === "Title required") {
        statusEl.classList.add("sidenav-status-error");
      } else {
        statusEl.classList.add("sidenav-status-saving");
      }

      // Hide after delay for success/error
      if (text === "Saved" || text === "Error") {
        setTimeout(() => {
          statusEl.classList.add("hidden");
        }, 2000);
      }
    }
  }

  async handleDelete() {
    if (this.isNewNote) {
      this._clearTempNote();
      this.close();
      return;
    }

    const note = this.tm.notes[this.editingNoteIndex];
    if (!note) return;

    if (!confirm(`Delete "${note.title}"? This cannot be undone.`)) return;

    try {
      await NotesAPI.delete(note.id);
      showToast("Note deleted", "success");
      this.tm.activeNote = null;
      await this.tm.loadNotes();
      this.tm.renderNotesView();
      this.close();
    } catch (error) {
      console.error("Error deleting note:", error);
      showToast("Error deleting note", "error");
    }
  }

  // ============================================
  // Enhancement: Multi-select mode
  // ============================================

  toggleMultiSelectMode() {
    this.multiSelectMode = !this.multiSelectMode;
    this.selectedParagraphs.clear();
    this.updateMultiSelectUI();

    const note = this.isNewNote
      ? this._getTempNote()
      : this.tm.notes[this.editingNoteIndex];
    if (note) {
      this.renderEnhancedContent(note);
    }
  }

  updateMultiSelectUI() {
    const toggleBtn = document.getElementById("noteSidenavMultiSelect");
    const bulkActions = document.getElementById("noteSidenavBulkActions");

    if (toggleBtn) {
      if (this.multiSelectMode) {
        toggleBtn.classList.add("bg-info", "text-white");
        toggleBtn.classList.remove(
          "bg-tertiary",
          "text-secondary",
        );
      } else {
        toggleBtn.classList.remove("bg-info", "text-white");
        toggleBtn.classList.add(
          "bg-tertiary",
          "text-secondary",
        );
      }
    }

    if (bulkActions) {
      bulkActions.classList.toggle("hidden", !this.multiSelectMode);
    }
  }

  toggleParagraphSelection(paragraphId) {
    if (this.selectedParagraphs.has(paragraphId)) {
      this.selectedParagraphs.delete(paragraphId);
    } else {
      this.selectedParagraphs.add(paragraphId);
    }

    const note = this.isNewNote
      ? this._getTempNote()
      : this.tm.notes[this.editingNoteIndex];
    if (note) {
      this.renderEnhancedContent(note);
    }
  }

  bulkDeleteParagraphs() {
    if (this.selectedParagraphs.size === 0) {
      showToast("No paragraphs selected", "error");
      return;
    }

    if (
      !confirm(`Delete ${this.selectedParagraphs.size} selected paragraph(s)?`)
    ) return;

    const note = this.isNewNote
      ? this._getTempNote()
      : this.tm.notes[this.editingNoteIndex];
    if (!note || !note.paragraphs) return;

    note.paragraphs = note.paragraphs.filter((p) =>
      !this.selectedParagraphs.has(p.id)
    );
    note.paragraphs.forEach((p, index) => p.order = index);

    if (this.isNewNote) {
      this._setTempNote(note);
    }

    this.selectedParagraphs.clear();
    this.renderEnhancedContent(note);
    this.scheduleAutoSave();
    showToast("Paragraphs deleted", "success");
  }

  moveSelectedParagraphs(direction) {
    if (this.selectedParagraphs.size === 0) {
      showToast("No paragraphs selected", "error");
      return;
    }

    const note = this.isNewNote
      ? this._getTempNote()
      : this.tm.notes[this.editingNoteIndex];
    if (!note || !note.paragraphs) return;

    const sorted = [...note.paragraphs].sort((a, b) =>
      (a.order || 0) - (b.order || 0)
    );
    const selectedIds = Array.from(this.selectedParagraphs);

    // Get indices of selected items
    const indices = selectedIds.map((id) =>
      sorted.findIndex((p) => p.id === id)
    ).sort((a, b) => a - b);

    // Check bounds
    if (direction < 0 && indices[0] === 0) return;
    if (direction > 0 && indices[indices.length - 1] === sorted.length - 1) {
      return;
    }

    // Move items
    if (direction < 0) {
      for (const idx of indices) {
        [sorted[idx - 1], sorted[idx]] = [sorted[idx], sorted[idx - 1]];
      }
    } else {
      for (const idx of indices.reverse()) {
        [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
      }
    }

    // Update orders
    sorted.forEach((p, index) => p.order = index);
    note.paragraphs = sorted;

    if (this.isNewNote) {
      this._setTempNote(note);
    }

    this.renderEnhancedContent(note);
    this.scheduleAutoSave();
  }

  // ============================================
  // Enhancement: Drag and drop reordering
  // ============================================

  handleDragStart(event, paragraphId) {
    if (this.multiSelectMode) {
      event.preventDefault();
      return;
    }
    this.draggedParagraphId = paragraphId;
    event.target.classList.add("opacity-50");
    event.dataTransfer.effectAllowed = "move";
  }

  handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  handleDrop(event, targetParagraphId) {
    event.preventDefault();
    if (
      !this.draggedParagraphId || this.draggedParagraphId === targetParagraphId
    ) return;

    const note = this.isNewNote
      ? this._getTempNote()
      : this.tm.notes[this.editingNoteIndex];
    if (!note || !note.paragraphs) return;

    const sorted = [...note.paragraphs].sort((a, b) =>
      (a.order || 0) - (b.order || 0)
    );
    const draggedIdx = sorted.findIndex((p) =>
      p.id === this.draggedParagraphId
    );
    const targetIdx = sorted.findIndex((p) => p.id === targetParagraphId);

    if (draggedIdx < 0 || targetIdx < 0) return;

    // Remove dragged item and insert at target position
    const [draggedItem] = sorted.splice(draggedIdx, 1);
    sorted.splice(targetIdx, 0, draggedItem);

    // Update orders
    sorted.forEach((p, index) => p.order = index);
    note.paragraphs = sorted;

    if (this.isNewNote) {
      this._setTempNote(note);
    }

    this.renderEnhancedContent(note);
    this.scheduleAutoSave();
  }

  handleDragEnd(event) {
    event.target.classList.remove("opacity-50");
    this.draggedParagraphId = null;
  }

  // ============================================
  // Enhancement: File drop zone / markdown import
  // ============================================

  async handleFileImport(files) {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith(".md") && !file.name.endsWith(".txt")) {
      showToast("Only .md and .txt files supported", "error");
      return;
    }

    try {
      const content = await file.text();
      const isEnhanced = document.getElementById("noteSidenavModeEnhanced")
        .classList.contains("bg-info");

      if (isEnhanced) {
        // Parse markdown into paragraphs
        const paragraphs = this.parseMarkdownToParagraphs(content);
        const note = this.isNewNote
          ? this._getTempNote()
          : this.tm.notes[this.editingNoteIndex];

        if (note) {
          const startOrder = note.paragraphs?.length || 0;
          paragraphs.forEach((p, i) => p.order = startOrder + i);
          note.paragraphs = [...(note.paragraphs || []), ...paragraphs];

          if (this.isNewNote) {
            this._setTempNote(note);
          }

          this.renderEnhancedContent(note);
          this.scheduleAutoSave();
        }
      } else {
        // Append to basic editor
        const editor = document.getElementById("noteSidenavEditor");
        if (editor) {
          editor.value = editor.value
            ? editor.value + "\n\n" + content
            : content;
          this.scheduleAutoSave();
        }
      }

      showToast(`Imported ${file.name}`, "success");
    } catch (error) {
      console.error("Error importing file:", error);
      showToast("Error importing file", "error");
    }

    // Reset file input
    const fileInput = document.getElementById("noteSidenavFileInput");
    if (fileInput) fileInput.value = "";
  }

  parseMarkdownToParagraphs(content) {
    const paragraphs = [];
    const lines = content.split("\n");
    let currentParagraph = null;
    let inCodeBlock = false;
    let codeLanguage = "";

    for (const line of lines) {
      // Check for code block start/end
      if (line.startsWith("```")) {
        if (inCodeBlock) {
          // End code block
          if (currentParagraph) {
            paragraphs.push(currentParagraph);
            currentParagraph = null;
          }
          inCodeBlock = false;
        } else {
          // Start code block
          if (currentParagraph) {
            paragraphs.push(currentParagraph);
          }
          codeLanguage = line.slice(3).trim() || "text";
          currentParagraph = {
            id: "para_" + Date.now() + "_" +
              Math.random().toString(36).substr(2, 9),
            type: "code",
            language: codeLanguage,
            content: "",
            order: paragraphs.length,
          };
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        currentParagraph.content += (currentParagraph.content ? "\n" : "") +
          line;
      } else if (line.trim() === "") {
        // Empty line - end current paragraph
        if (currentParagraph && currentParagraph.content.trim()) {
          paragraphs.push(currentParagraph);
          currentParagraph = null;
        }
      } else {
        // Text line
        if (!currentParagraph) {
          currentParagraph = {
            id: "para_" + Date.now() + "_" +
              Math.random().toString(36).substr(2, 9),
            type: "text",
            content: "",
            order: paragraphs.length,
          };
        }
        currentParagraph.content += (currentParagraph.content ? "\n" : "") +
          line;
      }
    }

    // Don't forget the last paragraph
    if (currentParagraph && currentParagraph.content.trim()) {
      paragraphs.push(currentParagraph);
    }

    return paragraphs;
  }

  // ============================================
  // Enhancement: Open full editor
  // ============================================

  openFullEditor() {
    // Close sidenav and switch to full notes view with this note selected
    const noteIndex = this.editingNoteIndex;
    const isNew = this.isNewNote;

    if (isNew) {
      // Save the temp note first before switching
      this.save().then(() => {
        this.close();
        this.tm.switchView("notes");
        // The note should now be saved, select it
        setTimeout(() => {
          if (this.tm.notes.length > 0) {
            this.tm.activeNote = this.tm.notes.length - 1;
            this.tm.editNoteMode = true;
            this.tm.renderNotesView();
          }
        }, 100);
      });
    } else {
      this.close();
      this.tm.switchView("notes");
      this.tm.activeNote = noteIndex;
      this.tm.editNoteMode = true;
      this.tm.renderNotesView();
    }

    showToast("Opened in full editor", "success");
  }

  // ============================================
  // Enhancement: Custom sections support
  // ============================================

  addCustomSection() {
    const note = this.isNewNote
      ? this._getTempNote()
      : this.tm.notes[this.editingNoteIndex];
    if (!note) return;

    if (!note.customSections) {
      note.customSections = [];
    }

    const sectionTypes = ["tabs", "timeline", "split"];
    const sectionType =
      sectionTypes[note.customSections.length % sectionTypes.length];

    const newSection = {
      id: "section_" + Date.now(),
      type: sectionType,
      title: `Section ${note.customSections.length + 1}`,
      items: [],
    };

    note.customSections.push(newSection);

    if (this.isNewNote) {
      this._setTempNote(note);
    }

    this.renderCustomSections(note);
    this.scheduleAutoSave();
    showToast(`Added ${sectionType} section`, "success");
  }

  renderCustomSections(note) {
    const container = document.getElementById("noteSidenavCustomSections");
    if (!container) return;

    const sections = note.customSections || [];

    if (sections.length === 0) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = sections.map((section) => `
      <div class="custom-section border border-info-border rounded-lg mb-3 bg-info-bg" data-section-id="${section.id}">
        <div class="flex items-center justify-between px-3 py-2 border-b border-info-border">
          <div class="flex items-center gap-2">
            <span class="text-xs px-2 py-0.5 rounded bg-info-bg text-info">${section.type}</span>
            <input type="text" value="${escapeHtml(section.title)}"
                   class="text-sm font-medium bg-transparent border-0 text-primary focus:outline-none focus:ring-1 focus:ring-purple-400 rounded px-1"
                   onblur="taskManager.noteSidenav.updateSectionTitle('${section.id}', this.value)">
          </div>
          <div class="flex items-center gap-1">
            <select class="text-xs border border-info-border rounded px-2 py-1 bg-primary text-primary"
                    onchange="taskManager.noteSidenav.updateSectionType('${section.id}', this.value)">
              <option value="tabs" ${
      section.type === "tabs" ? "selected" : ""
    }>Tabs</option>
              <option value="timeline" ${
      section.type === "timeline" ? "selected" : ""
    }>Timeline</option>
              <option value="split" ${
      section.type === "split" ? "selected" : ""
    }>Split View</option>
            </select>
            <button type="button" onclick="taskManager.noteSidenav.addSectionItem('${section.id}')"
                    class="px-2 py-1 text-xs text-info hover:text-info-text">+ Item</button>
            <button type="button" onclick="taskManager.noteSidenav.deleteSection('${section.id}')"
                    class="px-2 py-1 text-xs text-error hover:text-error-text">Del</button>
          </div>
        </div>
        <div class="p-2">
          ${
      section.items?.length > 0
        ? section.items.map((item, idx) => `
            <div class="flex items-center gap-2 mb-1">
              <input type="text" value="${
          escapeHtml(item.title || "")
        }" placeholder="Item title"
                     class="flex-1 text-sm px-2 py-1 border border-strong rounded bg-primary text-primary"
                     onblur="taskManager.noteSidenav.updateSectionItem('${section.id}', ${idx}, 'title', this.value)">
              <button type="button" onclick="taskManager.noteSidenav.deleteSectionItem('${section.id}', ${idx})"
                      class="text-error hover:text-error-text text-sm">&times;</button>
            </div>
          `).join("")
        : '<div class="text-xs text-muted italic">No items yet</div>'
    }
        </div>
      </div>
    `).join("");
  }

  updateSectionTitle(sectionId, title) {
    const note = this.isNewNote
      ? this._getTempNote()
      : this.tm.notes[this.editingNoteIndex];
    if (!note || !note.customSections) return;

    const section = note.customSections.find((s) => s.id === sectionId);
    if (section) {
      section.title = title;
      if (this.isNewNote) this._setTempNote(note);
      this.scheduleAutoSave();
    }
  }

  updateSectionType(sectionId, type) {
    const note = this.isNewNote
      ? this._getTempNote()
      : this.tm.notes[this.editingNoteIndex];
    if (!note || !note.customSections) return;

    const section = note.customSections.find((s) => s.id === sectionId);
    if (section) {
      section.type = type;
      if (this.isNewNote) this._setTempNote(note);
      this.renderCustomSections(note);
      this.scheduleAutoSave();
    }
  }

  addSectionItem(sectionId) {
    const note = this.isNewNote
      ? this._getTempNote()
      : this.tm.notes[this.editingNoteIndex];
    if (!note || !note.customSections) return;

    const section = note.customSections.find((s) => s.id === sectionId);
    if (section) {
      if (!section.items) section.items = [];
      section.items.push({ title: "", content: "" });
      if (this.isNewNote) this._setTempNote(note);
      this.renderCustomSections(note);
      this.scheduleAutoSave();
    }
  }

  updateSectionItem(sectionId, itemIdx, field, value) {
    const note = this.isNewNote
      ? this._getTempNote()
      : this.tm.notes[this.editingNoteIndex];
    if (!note || !note.customSections) return;

    const section = note.customSections.find((s) => s.id === sectionId);
    if (section && section.items && section.items[itemIdx]) {
      section.items[itemIdx][field] = value;
      if (this.isNewNote) this._setTempNote(note);
      this.scheduleAutoSave();
    }
  }

  deleteSectionItem(sectionId, itemIdx) {
    const note = this.isNewNote
      ? this._getTempNote()
      : this.tm.notes[this.editingNoteIndex];
    if (!note || !note.customSections) return;

    const section = note.customSections.find((s) => s.id === sectionId);
    if (section && section.items) {
      section.items.splice(itemIdx, 1);
      if (this.isNewNote) this._setTempNote(note);
      this.renderCustomSections(note);
      this.scheduleAutoSave();
    }
  }

  deleteSection(sectionId) {
    if (!confirm("Delete this section?")) return;

    const note = this.isNewNote
      ? this._getTempNote()
      : this.tm.notes[this.editingNoteIndex];
    if (!note || !note.customSections) return;

    note.customSections = note.customSections.filter((s) => s.id !== sectionId);
    if (this.isNewNote) this._setTempNote(note);
    this.renderCustomSections(note);
    this.scheduleAutoSave();
  }
}

export default NoteSidenavModule;
