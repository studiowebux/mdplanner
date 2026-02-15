// Notes Feature Module - Basic CRUD functionality
import { NotesAPI, ProjectAPI } from '../api.js';

/**
 * Notes management - CRUD, selection, auto-save
 */
export class NotesModule {
  /** @param {TaskManager} taskManager */
  constructor(taskManager) {
    this.tm = taskManager;
  }

  async load() {
    try {
      const projectInfo = await ProjectAPI.getInfo();
      this.tm.notes = projectInfo.notes || [];
      this.renderView();
    } catch (error) {
      console.error("Error loading notes:", error);
      this.tm.notes = [];
      this.renderView();
    }
  }

  renderView() {
    const tabNav = document.getElementById("notesTabNav");
    const emptyState = document.getElementById("emptyNotesState");
    const activeContent = document.getElementById("activeNoteContent");

    if (this.tm.notes.length === 0) {
      tabNav.innerHTML = "";
      emptyState.classList.remove("hidden");
      activeContent.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");

    // Truncate long titles
    const truncate = (str, max = 20) => str.length > max ? str.slice(0, max) + '...' : str;

    // Render tabs with pill-style design
    tabNav.innerHTML = this.tm.notes
      .map((note, index) => {
        const isActive = (this.tm.activeNote === null && index === 0) || this.tm.activeNote === index;
        const isEnhanced = note.mode === 'enhanced';
        return `
          <button class="px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
            isActive
              ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
          }" onclick="taskManager.selectNote(${index})" title="${note.title}">
              ${isEnhanced ? '<span class="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5"></span>' : ''}${truncate(note.title)}
          </button>
        `;
      })
      .join("");

    // Show first note if none selected
    if (this.tm.activeNote === null && this.tm.notes.length > 0) {
      this.tm.activeNote = 0;
    }

    this.renderActive();
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
      return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

    // Check if we should use enhanced mode
    const isEnhanced = this.tm.enhancedMode && activeNote.mode === 'enhanced';

    // Update toggle button state
    const btn = document.getElementById('toggleModeBtn');
    const btnText = document.getElementById('toggleModeText');
    if (btn && btnText) {
      if (isEnhanced) {
        btn.classList.add('bg-purple-600', 'text-white');
        btn.classList.remove('bg-gray-100', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
        btn.title = 'Switch to Basic Mode';
        btnText.textContent = 'Enhanced';
      } else {
        btn.classList.remove('bg-purple-600', 'text-white');
        btn.classList.add('bg-gray-100', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
        btn.title = 'Switch to Enhanced Mode';
        btnText.textContent = 'Basic';
      }
    }

    // Show/hide appropriate editors based on mode and edit state
    const enhancedView = document.getElementById('enhancedNoteView');
    const enhancedEditor = document.getElementById('enhancedNoteEditor');
    const simpleEditor = document.getElementById('activeNoteBodyContainer');

    if (isEnhanced) {
      simpleEditor.classList.add('hidden');

      if (this.tm.noteEditMode) {
        // Edit mode: show editing controls
        enhancedView.classList.add('hidden');
        enhancedEditor.classList.remove('hidden');
        this.tm.renderParagraphs();
        this.tm.renderCustomSections();
      } else {
        // View mode: show beautiful rendered content
        enhancedEditor.classList.add('hidden');
        enhancedView.classList.remove('hidden');
        enhancedView.innerHTML = this.tm.renderEnhancedViewMode();
      }
    } else {
      enhancedView.classList.add('hidden');
      enhancedEditor.classList.add('hidden');
      simpleEditor.classList.remove('hidden');
      document.getElementById("activeNoteEditor").value = activeNote.content;
      this.updateDisplay();
    }
  }

  updateDisplay() {
    const activeNote = this.tm.notes[this.tm.activeNote];
    if (!activeNote) return;

    // Parse content to extract custom sections if they exist
    const parsed = this.tm.parseContentAndCustomSections(activeNote.content);

    let htmlContent = '';

    // Only render paragraph content (not custom section content which is already in paragraphs)
    if (parsed.paragraphs && parsed.paragraphs.length > 0) {
      htmlContent = this.tm.markdownToHtml(parsed.paragraphs.map(p =>
        p.type === 'code' ? `\`\`\`${p.language || 'text'}\n${p.content}\n\`\`\`` : p.content
      ).join('\n\n'));
    }

    // Add custom sections as interactive preview components from metadata (not from content)
    if (parsed.customSections && parsed.customSections.length > 0) {
      parsed.customSections.forEach(section => {
        htmlContent += this.tm.renderCustomSectionPreview(section);
      });
    }

    // If content is empty or just whitespace, add a fallback
    if (!htmlContent.trim()) {
      htmlContent =
        '<p class="text-gray-500 dark:text-gray-400 italic">No content</p>';
    }

    document.getElementById("activeNoteBody").innerHTML = htmlContent;
  }

  toggleEditMode() {
    this.tm.noteEditMode = !this.tm.noteEditMode;
    const titleInput = document.getElementById("activeNoteTitle");
    const activeNote = this.tm.notes[this.tm.activeNote];
    const isEnhanced = this.tm.enhancedMode && activeNote?.mode === 'enhanced';

    // Update title input styling
    if (this.tm.noteEditMode) {
      titleInput.removeAttribute("readonly");
      titleInput.classList.add("border-b", "border-gray-300", "dark:border-gray-600");
    } else {
      titleInput.setAttribute("readonly", "true");
      titleInput.classList.remove("border-b", "border-gray-300", "dark:border-gray-600");
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
        statusEl.classList.remove("text-gray-500", "text-red-500");
        statusEl.classList.add("text-green-600", "dark:text-green-400");
      } else if (text === "Error") {
        statusEl.classList.remove("text-gray-500", "text-green-600", "dark:text-green-400");
        statusEl.classList.add("text-red-500");
      } else {
        statusEl.classList.remove("text-green-600", "dark:text-green-400", "text-red-500");
        statusEl.classList.add("text-gray-500", "dark:text-gray-400");
      }
    }
  }

  hideSaveStatus() {
    const statusEl = document.getElementById("noteSaveText");
    if (statusEl) {
      statusEl.classList.add("hidden");
    }
  }

  scheduleAutoSave() {
    // Clear existing timeout
    if (this.tm.autoSaveTimeout) {
      clearTimeout(this.tm.autoSaveTimeout);
    }

    // Schedule auto-save after 1 second of inactivity
    this.tm.autoSaveTimeout = setTimeout(() => {
      this.autoSave();
    }, 1000);
  }

  async autoSave() {
    if (this.tm.activeNote === null) return;

    const activeNote = this.tm.notes[this.tm.activeNote];
    const title = document.getElementById("activeNoteTitle").value;

    // For enhanced mode, get content from the synced content field
    let content = activeNote.content;

    // For simple mode, get content from the editor
    if (!this.tm.enhancedMode || activeNote.mode !== 'enhanced') {
      const editorElement = document.getElementById("activeNoteEditor");
      if (editorElement) {
        content = editorElement.value;
        // Update the local content immediately for simple mode
        activeNote.content = content;
      }
    }

    try {
      // Show saving indicator
      this.showSaveStatus("Saving...");

      // Prepare the data to save - include all enhanced mode data
      const saveData = {
        title: title,
        content: content,
        mode: activeNote.mode,
        paragraphs: activeNote.paragraphs,
        customSections: activeNote.customSections
      };

      const response = await NotesAPI.update(activeNote.id, saveData);
      if (response.ok) {
        // Update local data
        this.tm.notes[this.tm.activeNote].title = title;

        // Show saved status
        this.showSaveStatus("Saved");

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
      console.error("Error auto-saving note:", error);
      this.showSaveStatus("Error");
    }
  }

  select(noteIndex) {
    this.tm.activeNote = noteIndex;
    // Sync enhancedMode with the selected note's mode
    const note = this.tm.notes[noteIndex];
    if (note) {
      this.tm.enhancedMode = note.mode === 'enhanced';
    }
    this.renderView();
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
      basicBtn.classList.remove("bg-gray-900", "dark:bg-gray-100", "text-white", "dark:text-gray-900");
      basicBtn.classList.add("bg-white", "dark:bg-gray-600", "text-gray-700", "dark:text-gray-300", "border", "border-gray-300", "dark:border-gray-500", "hover:bg-gray-100", "dark:hover:bg-gray-500");
      enhancedBtn.classList.remove("bg-white", "dark:bg-gray-600", "text-gray-700", "dark:text-gray-300", "border", "border-gray-300", "dark:border-gray-500", "hover:bg-gray-100", "dark:hover:bg-gray-500");
      enhancedBtn.classList.add("bg-purple-600", "text-white");
    } else {
      basicBtn.classList.remove("bg-white", "dark:bg-gray-600", "text-gray-700", "dark:text-gray-300", "border", "border-gray-300", "dark:border-gray-500", "hover:bg-gray-100", "dark:hover:bg-gray-500");
      basicBtn.classList.add("bg-gray-900", "dark:bg-gray-100", "text-white", "dark:text-gray-900");
      enhancedBtn.classList.remove("bg-purple-600", "text-white");
      enhancedBtn.classList.add("bg-white", "dark:bg-gray-600", "text-gray-700", "dark:text-gray-300", "border", "border-gray-300", "dark:border-gray-500", "hover:bg-gray-100", "dark:hover:bg-gray-500");
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

    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      const note = this.tm.notes[this.tm.activeNote];
      await NotesAPI.delete(note.id);
      this.tm.activeNote = null;
      await this.load();
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  }

  bindEvents() {
    // Add note buttons (header and inline tab)
    document
      .getElementById("addNoteBtn")
      .addEventListener("click", () => this.openModal());
    document
      .getElementById("addNoteTabBtn")
      .addEventListener("click", () => this.openModal());

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

    // Delete note
    document
      .getElementById("deleteNoteBtn")
      .addEventListener("click", () => this.deleteCurrent());

    // Auto-save events for note editing
    document
      .getElementById("activeNoteTitle")
      .addEventListener("input", () => this.scheduleAutoSave());
    document
      .getElementById("activeNoteEditor")
      .addEventListener("input", () => this.scheduleAutoSave());

    // Close modal on background click
    document.getElementById("noteModal").addEventListener("click", (e) => {
      if (e.target.id === "noteModal") {
        this.closeModal();
      }
    });
  }
}
