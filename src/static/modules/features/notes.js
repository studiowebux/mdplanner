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

    // Render tabs using linear indexing for stable IDs
    tabNav.innerHTML = this.tm.notes
      .map(
        (note, index) => `
          <button class="py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
            (this.tm.activeNote === null && index === 0) ||
            this.tm.activeNote === index
              ? "border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
          }" onclick="taskManager.selectNote(${index})">
              ${note.title}
          </button>
        `,
      )
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
        btn.classList.add('bg-purple-200', 'dark:bg-purple-800');
        btn.classList.remove('bg-purple-100', 'dark:bg-purple-900');
        btn.title = 'Switch to Simple Mode';
        btnText.textContent = 'Simple';
      } else {
        btn.classList.remove('bg-purple-200', 'dark:bg-purple-800');
        btn.classList.add('bg-purple-100', 'dark:bg-purple-900');
        btn.title = 'Switch to Enhanced Mode';
        btnText.textContent = 'Enhanced';
      }
    }

    // Show/hide appropriate editors
    const enhancedEditor = document.getElementById('enhancedNoteEditor');
    const simpleEditor = document.getElementById('activeNoteBodyContainer');

    if (isEnhanced) {
      enhancedEditor.classList.remove('hidden');
      simpleEditor.classList.add('hidden');
      this.tm.renderParagraphs();
      this.tm.renderCustomSections();
    } else {
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
    const editor = document.getElementById("activeNoteEditor");
    const display = document.getElementById("activeNoteBody");
    const titleInput = document.getElementById("activeNoteTitle");

    if (this.tm.noteEditMode) {
      // Switch to edit mode
      editor.classList.remove("hidden");
      display.classList.add("hidden");
      titleInput.removeAttribute("readonly");
      titleInput.classList.add(
        "border-b",
        "border-gray-300",
        "dark:border-gray-600",
      );
      editor.focus();
    } else {
      // Switch to view mode
      editor.classList.add("hidden");
      display.classList.remove("hidden");
      titleInput.setAttribute("readonly", "true");
      titleInput.classList.remove(
        "border-b",
        "border-gray-300",
        "dark:border-gray-600",
      );
      this.updateDisplay();
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
      const indicator = document.getElementById("saveIndicator");
      indicator.classList.remove("hidden");

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

        // Update tab title if it changed
        this.renderView();
      }

      // Hide indicator after a short delay
      setTimeout(() => {
        indicator.classList.add("hidden");
      }, 1000);
    } catch (error) {
      console.error("Error auto-saving note:", error);
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
    document.getElementById("noteModalTitle").textContent = "Add Note";
    document.getElementById("noteTitle").value = "";
    document.getElementById("noteContent").value = "";
    document.getElementById("noteEnhancedMode").checked = false;
    document.getElementById("noteModal").classList.remove("hidden");
    document.getElementById("noteModal").classList.add("flex");
  }

  closeModal() {
    document.getElementById("noteModal").classList.add("hidden");
    document.getElementById("noteModal").classList.remove("flex");
  }

  async handleSubmit(e) {
    e.preventDefault();

    const title = document.getElementById("noteTitle").value;
    const content = document.getElementById("noteContent").value;
    const enhancedMode = document.getElementById("noteEnhancedMode").checked;

    try {
      let response;
      if (this.tm.editingNote !== null) {
        // Update existing note using backend ID
        const note = this.tm.notes[this.tm.editingNote];
        response = await NotesAPI.update(note.id, { title, content });
      } else {
        // Create new note
        const noteData = { title, content };
        if (enhancedMode) {
          noteData.mode = "enhanced";
          noteData.paragraphs = content ? [{ id: `p-${Date.now()}`, type: "text", content }] : [];
        }
        response = await NotesAPI.create(noteData);
      }

      if (!response.ok) {
        console.error("Failed to save note:", await response.text());
        return;
      }

      this.closeModal();
      await this.load();

      // If enhanced mode was selected, select the new note and enable enhanced mode
      if (enhancedMode && this.tm.editingNote === null) {
        const newNoteIndex = this.tm.notes.length - 1;
        this.tm.activeNote = newNoteIndex;
        this.tm.enhancedMode = true;
        this.renderView();
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
    // Add note button
    document
      .getElementById("addNoteBtn")
      .addEventListener("click", () => this.openModal());

    // Cancel note modal
    document
      .getElementById("cancelNoteBtn")
      .addEventListener("click", () => this.closeModal());

    // Note form submission
    document
      .getElementById("noteForm")
      .addEventListener("submit", (e) => this.handleSubmit(e));

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
