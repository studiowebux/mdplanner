// Notes Feature Module - Basic CRUD functionality
import { NotesAPI, ProjectAPI } from "../api.js";
import { showConfirm } from "../ui/confirm.js";
import { showLoading, hideLoading } from "../ui/loading.js";
import { showToast } from "../ui/toast.js";

/**
 * Notes management - CRUD, selection, save
 */
export class NotesModule {
  /** @param {TaskManager} taskManager */
  constructor(taskManager) {
    this.tm = taskManager;
    this._projectFilter = "";
    this._searchFilter = "";
    this._collapsedGroups = new Set();
    this._groupKeys = [];
  }

  async load() {
    showLoading("notesView");
    try {
      const projectInfo = await ProjectAPI.getInfo();
      this.tm.notes = projectInfo.notes || [];
      this.renderView();
    } catch (error) {
      console.error("Error loading notes:", error);
      this.tm.notes = [];
      this.renderView();
    } finally {
      hideLoading("notesView");
    }
  }

  renderView() {
    const tabNav = document.getElementById("notesTabNav");
    const emptyState = document.getElementById("emptyNotesState");
    const activeContent = document.getElementById("activeNoteContent");
    const countEl = document.getElementById("notesCount");

    // Populate project filter dropdown
    this._populateProjectFilter();

    // Apply project + search filters
    let visibleNotes = this.tm.notes;
    if (this._projectFilter) {
      visibleNotes = visibleNotes.filter(
        (n) => (n.project || "").toLowerCase() === this._projectFilter.toLowerCase(),
      );
    }
    if (this._searchFilter) {
      const q = this._searchFilter.toLowerCase();
      visibleNotes = visibleNotes.filter((n) => n.title.toLowerCase().includes(q));
    }

    // Update total count in sidebar header
    if (countEl) countEl.textContent = `(${visibleNotes.length})`;

    if (visibleNotes.length === 0) {
      tabNav.innerHTML = "";
      emptyState.classList.remove("hidden");
      activeContent.classList.add("hidden");
      this._setMobileActive(false);
      return;
    }

    emptyState.classList.add("hidden");

    // Group notes by project — named projects sorted A-Z, unassigned last
    const groups = new Map();
    for (const note of visibleNotes) {
      const key = note.project || "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(note);
    }
    const sortedKeys = [...groups.keys()].sort((a, b) => {
      if (a === "" && b !== "") return 1;
      if (b === "" && a !== "") return -1;
      return a.localeCompare(b);
    });
    this._groupKeys = sortedKeys;

    // Render grouped list
    tabNav.innerHTML = sortedKeys.map((key, groupIndex) => {
      const groupNotes = groups.get(key);
      const label = key || "Unassigned";
      const isCollapsed = this._collapsedGroups.has(key);
      const chevronClass = `notes-group-chevron${isCollapsed ? " collapsed" : ""}`;

      const notesHtml = groupNotes.map((note) => {
        const index = this.tm.notes.indexOf(note);
        const isActive = this.tm.activeNote === index;
        const isEnhanced = note.mode === "enhanced";
        const meta = isEnhanced ? "enhanced" : "";
        return `
          <li><button class="notes-list-item${isActive ? " active" : ""}"
            data-note-index="${index}"
            onclick="taskManager.selectNote(${index})"
            title="${note.title}">
            <span class="notes-list-item-title">${note.title}</span>
            ${meta ? `<span class="notes-list-item-meta text-muted">${meta}</span>` : ""}
          </button></li>
        `;
      }).join("");

      return `
        <li class="notes-group">
          <button class="notes-group-header"
            onclick="taskManager.notesModule.toggleGroup(${groupIndex})"
            aria-expanded="${!isCollapsed}">
            <span class="notes-group-label">${label}</span>
            <span class="notes-group-count">${groupNotes.length}</span>
            <svg class="${chevronClass}" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <ul class="notes-group-list${isCollapsed ? " hidden" : ""}">
            ${notesHtml}
          </ul>
        </li>
      `;
    }).join("");

    // Show first note if none selected
    if (this.tm.activeNote === null && this.tm.notes.length > 0) {
      this.tm.activeNote = 0;
    }

    // Scroll active note into view within its group
    const activeBtn = tabNav.querySelector(".notes-list-item.active");
    if (activeBtn) activeBtn.scrollIntoView({ block: "nearest", behavior: "smooth" });

    // Mobile: toggle note-active class
    this._setMobileActive(this.tm.activeNote !== null);

    this.renderActive();
  }

  /** Toggle collapsed state of a project group by its index in _groupKeys. */
  toggleGroup(groupIndex) {
    const key = this._groupKeys[groupIndex];
    if (key === undefined) return;
    if (this._collapsedGroups.has(key)) {
      this._collapsedGroups.delete(key);
    } else {
      this._collapsedGroups.add(key);
    }
    this.renderView();
  }

  renderActive() {
    const activeContent = document.getElementById("activeNoteContent");
    const activeNote = this.tm.notes[this.tm.activeNote];

    if (!activeNote) {
      activeContent.classList.add("hidden");
      return;
    }

    activeContent.classList.remove("hidden");
    document.getElementById("activeNoteTitle").value = activeNote.title;

    // Display note metadata
    const formatDate = (isoString) => {
      if (!isoString) return "";
      const date = new Date(isoString);
      return date.toLocaleDateString() + " " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };
    document.getElementById("noteCreatedAt").textContent = activeNote.createdAt
      ? `Created: ${formatDate(activeNote.createdAt)}`
      : "";
    document.getElementById("noteUpdatedAt").textContent = activeNote.updatedAt
      ? `Updated: ${formatDate(activeNote.updatedAt)}`
      : "";
    document.getElementById("noteRevision").textContent = activeNote.revision
      ? `Rev: ${activeNote.revision}`
      : "";

    // Populate project select
    this._populateActiveNoteProject(activeNote.project || "");

    // Check if we should use enhanced mode
    const isEnhanced = this.tm.enhancedMode && activeNote.mode === "enhanced";

    // Update toggle button state
    const btn = document.getElementById("toggleModeBtn");
    const btnText = document.getElementById("toggleModeText");
    if (btn && btnText) {
      if (isEnhanced) {
        btn.classList.add("bg-info", "text-white");
        btn.classList.remove(
          "bg-tertiary",
          "text-secondary",
        );
        btn.title = "Switch to Basic Mode";
        btnText.textContent = "Enhanced";
      } else {
        btn.classList.remove("bg-info", "text-white");
        btn.classList.add(
          "bg-tertiary",
          "text-secondary",
        );
        btn.title = "Switch to Enhanced Mode";
        btnText.textContent = "Basic";
      }
    }

    // Show/hide appropriate editors based on mode and edit state
    const enhancedView = document.getElementById("enhancedNoteView");
    const enhancedEditor = document.getElementById("enhancedNoteEditor");
    const simpleEditor = document.getElementById("activeNoteBodyContainer");

    if (isEnhanced) {
      simpleEditor.classList.add("hidden");

      if (this.tm.noteEditMode) {
        // Edit mode: show editing controls
        enhancedView.classList.add("hidden");
        enhancedEditor.classList.remove("hidden");
        this.tm.renderParagraphs();
        this.tm.renderCustomSections();
      } else {
        // View mode: show beautiful rendered content
        enhancedEditor.classList.add("hidden");
        enhancedView.classList.remove("hidden");
        enhancedView.innerHTML = this.tm.renderEnhancedViewMode();
      }
    } else {
      enhancedView.classList.add("hidden");
      enhancedEditor.classList.add("hidden");
      simpleEditor.classList.remove("hidden");
      document.getElementById("activeNoteEditor").textContent = activeNote.content;
      this.updateDisplay();
    }
  }

  updateDisplay() {
    const activeNote = this.tm.notes[this.tm.activeNote];
    if (!activeNote) return;

    // Parse content to extract custom sections if they exist
    const parsed = this.tm.parseContentAndCustomSections(activeNote.content);

    let htmlContent = "";

    // Only render paragraph content (not custom section content which is already in paragraphs)
    if (parsed.paragraphs && parsed.paragraphs.length > 0) {
      htmlContent = this.tm.markdownToHtml(
        parsed.paragraphs.map((p) =>
          p.type === "code"
            ? `\`\`\`${p.language || "text"}\n${p.content}\n\`\`\``
            : p.content
        ).join("\n\n"),
      );
    }

    // Add custom sections as interactive preview components from metadata (not from content)
    if (parsed.customSections && parsed.customSections.length > 0) {
      parsed.customSections.forEach((section) => {
        htmlContent += this.tm.renderCustomSectionPreview(section);
      });
    }

    // If content is empty or just whitespace, add a fallback
    if (!htmlContent.trim()) {
      htmlContent =
        '<p class="text-muted italic">No content</p>';
    }

    document.getElementById("activeNoteBody").innerHTML = htmlContent;
  }

  toggleEditMode() {
    this.tm.noteEditMode = !this.tm.noteEditMode;
    const titleInput = document.getElementById("activeNoteTitle");
    const activeNote = this.tm.notes[this.tm.activeNote];
    const isEnhanced = this.tm.enhancedMode && activeNote?.mode === "enhanced";

    // Update title input styling
    if (this.tm.noteEditMode) {
      titleInput.removeAttribute("readonly");
      titleInput.classList.add(
        "border-b",
        "border-strong",
      );
    } else {
      titleInput.setAttribute("readonly", "true");
      titleInput.classList.remove(
        "border-b",
        "border-strong",
      );
    }

    // Handle enhanced vs simple mode differently
    if (isEnhanced) {
      // For enhanced notes, re-render with appropriate mode
      this.renderActive();
    } else {
      // For simple notes, toggle editor/display
      const editor = document.getElementById("activeNoteEditor");
      const display = document.getElementById("activeNoteBody");

      if (this.tm.noteEditMode) {
        editor.classList.remove("hidden");
        display.classList.add("hidden");
        editor.focus();
      } else {
        editor.classList.add("hidden");
        display.classList.remove("hidden");
        this.updateDisplay();
      }
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById("noteSaveText");
    if (statusEl) {
      statusEl.textContent = text;
      statusEl.classList.remove("hidden");
      if (text === "Saved") {
        statusEl.classList.remove("text-muted", "text-error");
        statusEl.classList.add("text-success");
      } else if (text === "Error") {
        statusEl.classList.remove("text-muted", "text-success");
        statusEl.classList.add("text-error");
      } else {
        statusEl.classList.remove("text-success", "text-error");
        statusEl.classList.add("text-muted");
      }
    }
  }

  hideSaveStatus() {
    const statusEl = document.getElementById("noteSaveText");
    if (statusEl) {
      statusEl.classList.add("hidden");
    }
  }

  async save() {
    if (this.tm.activeNote === null) return;

    const activeNote = this.tm.notes[this.tm.activeNote];
    const title = document.getElementById("activeNoteTitle").value;

    // For enhanced mode, flush DOM → paragraphs → content before reading
    if (this.tm.enhancedMode && activeNote.mode === "enhanced") {
      this.tm.flushParagraphsFromDOM();
    }

    let content = activeNote.content;

    // For simple mode, get content from the contentEditable editor
    if (!this.tm.enhancedMode || activeNote.mode !== "enhanced") {
      const editorElement = document.getElementById("activeNoteEditor");
      if (editorElement) {
        content = editorElement.textContent;
        activeNote.content = content;
      }
    }

    try {
      // Show saving indicator
      this.showSaveStatus("Saving...");

      // Prepare the data to save - include all enhanced mode data
      const project = document.getElementById("activeNoteProject")?.value || undefined;
      const saveData = {
        title: title,
        content: content,
        mode: activeNote.mode,
        paragraphs: activeNote.paragraphs,
        customSections: activeNote.customSections,
        project: project,
      };

      const response = await NotesAPI.update(activeNote.id, saveData);
      if (response.ok) {
        // Update local data
        this.tm.notes[this.tm.activeNote].title = title;

        // Show saved status
        showToast("Saved", "success");

        // Update tab title if it changed
        this.renderView();
      } else {
        this.showSaveStatus("Error");
      }

      // Hide indicator after a short delay
      setTimeout(() => {
        this.hideSaveStatus();
      }, 2000);
    } catch (error) {
      console.error("Error saving note:", error);
      this.showSaveStatus("Error");
    }
  }

  select(noteIndex) {
    this.tm.activeNote = noteIndex;
    const note = this.tm.notes[noteIndex];
    if (note) {
      this.tm.enhancedMode = note.mode === "enhanced";
      history.replaceState(null, "", `#note=${note.id}`);
    }
    this._setMobileActive(true);
    this.renderView();
  }

  /** Open a note by its ID — used by deep links and hashchange. */
  selectById(noteId) {
    const index = this.tm.notes.findIndex((n) => n.id === noteId);
    if (index !== -1) this.select(index);
  }

  /** Copy current note URL to clipboard. */
  copyLink() {
    const note = this.tm.notes[this.tm.activeNote];
    if (!note) return;
    const url = `${window.location.origin}${window.location.pathname}#note=${note.id}`;
    navigator.clipboard.writeText(url).then(() => {
      this.showSaveStatus("Link copied");
      setTimeout(() => this.hideSaveStatus(), 2000);
    });
  }

  openModal() {
    this.tm.editingNote = null;
    this.tm.newNoteEnhanced = false;
    document.getElementById("noteModalTitle").textContent = "New Note";
    document.getElementById("noteTitle").value = "";
    document.getElementById("noteContent").value = "";
    document.getElementById("noteEnhancedMode").value = "";
    this.updateModeButtons();
    document.getElementById("noteModal").classList.remove("hidden");
    document.getElementById("noteModal").classList.add("flex");
    document.getElementById("noteTitle").focus();
  }

  updateModeButtons() {
    const basicBtn = document.getElementById("noteModeBasic");
    const enhancedBtn = document.getElementById("noteModeEnhanced");

    if (this.tm.newNoteEnhanced) {
      basicBtn.classList.remove(
        "bg-inverse",
        "text-white",
      );
      basicBtn.classList.add(
        "bg-primary",
        "text-secondary",
        "border",
        "border-strong",
        "hover:bg-tertiary",
      );
      enhancedBtn.classList.remove(
        "bg-primary",
        "text-secondary",
        "border",
        "border-strong",
        "hover:bg-tertiary",
      );
      enhancedBtn.classList.add("bg-info", "text-white");
    } else {
      basicBtn.classList.remove(
        "bg-primary",
        "text-secondary",
        "border",
        "border-strong",
        "hover:bg-tertiary",
      );
      basicBtn.classList.add(
        "bg-inverse",
        "text-white",
      );
      enhancedBtn.classList.remove("bg-info", "text-white");
      enhancedBtn.classList.add(
        "bg-primary",
        "text-secondary",
        "border",
        "border-strong",
        "hover:bg-tertiary",
      );
    }
  }

  closeModal() {
    document.getElementById("noteModal").classList.add("hidden");
    document.getElementById("noteModal").classList.remove("flex");
  }

  async handleSubmit(e) {
    e.preventDefault();

    const title = document.getElementById("noteTitle").value;
    const content = "";
    const enhancedMode = this.tm.newNoteEnhanced || false;

    try {
      let response;
      if (this.tm.editingNote !== null) {
        // Update existing note using backend ID
        const note = this.tm.notes[this.tm.editingNote];
        response = await NotesAPI.update(note.id, { title, content });
      } else {
        // Create new note with empty content - user will edit inline
        const noteData = { title, content };
        if (enhancedMode) {
          noteData.mode = "enhanced";
          noteData.paragraphs = [];
        }
        response = await NotesAPI.create(noteData);
      }

      if (!response.ok) {
        console.error("Failed to save note:", await response.text());
        return;
      }

      this.closeModal();
      await this.load();

      // Select the new note and enable edit mode
      if (this.tm.editingNote === null) {
        const newNoteIndex = this.tm.notes.length - 1;
        this.tm.activeNote = newNoteIndex;
        this.tm.enhancedMode = enhancedMode;
        this.renderView();

        // Auto-enable edit mode for new notes (basic mode only)
        if (!enhancedMode) {
          // Small delay to ensure DOM is ready
          setTimeout(() => {
            this.tm.noteEditMode = false;
            this.toggleEditMode();
          }, 100);
        }
      }
    } catch (error) {
      console.error("Error saving note:", error);
    }
  }

  async deleteCurrent() {
    if (this.tm.activeNote === null) return;

    if (!(await showConfirm("Are you sure you want to delete this note?"))) return;

    try {
      const note = this.tm.notes[this.tm.activeNote];
      await NotesAPI.delete(note.id);
      this.tm.activeNote = null;
      await this.load();
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  }

  _setMobileActive(active) {
    const layout = document.getElementById("notesLayout");
    if (layout) layout.classList.toggle("note-active", active);
  }

  _populateActiveNoteProject(current) {
    const select = document.getElementById("activeNoteProject");
    if (!select) return;
    const noteProjects = this.tm.notes.map((n) => n.project).filter(Boolean);
    const portfolioProjects = (this.tm.portfolio || []).map((p) => p.name)
      .filter(Boolean);
    const projects = [...new Set([...noteProjects, ...portfolioProjects])]
      .sort();
    select.innerHTML = '<option value="">No project</option>' +
      projects.map((p) => `<option value="${p}">${p}</option>`).join("");
    select.value = current && projects.includes(current) ? current : "";
  }

  _populateProjectFilter() {
    const select = document.getElementById("notesProjectFilter");
    if (!select) return;
    const noteProjects = this.tm.notes.map((n) => n.project).filter(Boolean);
    const portfolioProjects = (this.tm.portfolio || []).map((p) => p.name)
      .filter(Boolean);
    const projects = [...new Set([...noteProjects, ...portfolioProjects])]
      .sort();
    const current = select.value;
    select.innerHTML = '<option value="">All projects</option>' +
      projects.map((p) => `<option value="${p}">${p}</option>`).join("");
    if (current && projects.includes(current)) select.value = current;
  }

  bindEvents() {
    // Double-click-to-edit: single click only reads, double-click enters edit mode
    document.getElementById("activeNoteBody")
      ?.addEventListener("dblclick", () => {
        if (!this.tm.noteEditMode && this.tm.activeNote !== null) {
          const activeNote = this.tm.notes[this.tm.activeNote];
          const isEnhanced = this.tm.enhancedMode &&
            activeNote?.mode === "enhanced";
          if (!isEnhanced) {
            this.tm.noteEditMode = false;
            this.toggleEditMode();
          }
        }
      });

    // Cmd+S / Ctrl+S to save note
    document.getElementById("activeNoteEditor")
      ?.addEventListener("keydown", (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "s") {
          e.preventDefault();
          this.save();
        }
      });

    // Search filter
    document.getElementById("notesSearch")
      ?.addEventListener("input", (e) => {
        this._searchFilter = e.target.value.trim();
        this.tm.activeNote = null;
        this.renderView();
      });

    // Project filter
    document.getElementById("notesProjectFilter")
      ?.addEventListener("change", (e) => {
        this._projectFilter = e.target.value;
        this.tm.activeNote = null;
        this.renderView();
      });

    // Mobile back button
    document.getElementById("notesBackBtn")
      ?.addEventListener("click", () => {
        this.tm.activeNote = null;
        this._setMobileActive(false);
        const activeContent = document.getElementById("activeNoteContent");
        const emptyState = document.getElementById("emptyNotesState");
        if (activeContent) activeContent.classList.add("hidden");
        if (emptyState) emptyState.classList.remove("hidden");
      });

    // Add note button (header only — sidebar footer button removed)
    document
      .getElementById("addNoteBtn")
      .addEventListener("click", () => this.tm.noteSidenavModule.openNew());

    // Cancel note modal
    document
      .getElementById("cancelNoteBtn")
      .addEventListener("click", () => this.closeModal());

    // Note form submission
    document
      .getElementById("noteForm")
      .addEventListener("submit", (e) => this.handleSubmit(e));

    // Mode toggle buttons
    document
      .getElementById("noteModeBasic")
      .addEventListener("click", () => {
        this.tm.newNoteEnhanced = false;
        this.updateModeButtons();
      });
    document
      .getElementById("noteModeEnhanced")
      .addEventListener("click", () => {
        this.tm.newNoteEnhanced = true;
        this.updateModeButtons();
      });

    // Toggle edit mode
    document
      .getElementById("toggleEditBtn")
      .addEventListener("click", () => this.toggleEditMode());

    // Copy link to note
    document
      .getElementById("copyNoteLinkBtn")
      ?.addEventListener("click", () => this.copyLink());

    // Delete note
    document
      .getElementById("deleteNoteBtn")
      .addEventListener("click", () => this.deleteCurrent());

    // Save button for inline note editor
    document
      .getElementById("notesInlineSave")
      ?.addEventListener("click", () => this.save());

    // Close modal on background click
    document.getElementById("noteModal").addEventListener("click", (e) => {
      if (e.target.id === "noteModal") {
        this.closeModal();
      }
    });
  }
}
