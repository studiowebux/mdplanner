// Journal Sidenav Module
// Slide-in panel for journal entry creation and editing.
// Supports a read-only view mode (rendered markdown) and an edit mode.

import { Sidenav } from "../ui/sidenav.js";
import { JournalAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { showConfirm } from "../ui/confirm.js";
import { escapeHtml } from "../utils.js";

const MOOD_LABELS = {
  great: "Great",
  good: "Good",
  neutral: "Neutral",
  bad: "Bad",
  terrible: "Terrible",
};

export class JournalSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingId = null;
  }

  bindEvents() {
    document.getElementById("journalSidenavClose")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("journalSidenavCancel")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("journalSidenavSave")?.addEventListener(
      "click",
      () => this.handleSave(),
    );
    document.getElementById("journalSidenavDelete")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );
    document.getElementById("journalSidenavEditBtn")?.addEventListener(
      "click",
      () => this._switchToEdit(),
    );
  }

  /** Open in read-only view mode. Card clicks use this. */
  openView(entryId) {
    const entry = (this.tm.journal || []).find((e) => e.id === entryId);
    if (!entry) return;

    this.editingId = entryId;

    const dateLabel = entry.time
      ? `${entry.date} at ${entry.time}`
      : entry.date;
    document.getElementById("journalSidenavHeader").textContent =
      entry.title || dateLabel;

    this._renderViewContent(entry);
    this._showViewMode();

    document.getElementById("journalSidenavDelete").classList.remove("hidden");
    Sidenav.open("journalSidenav");
  }

  /** Open directly in edit mode (used internally after switching from view). */
  openEdit(entryId) {
    const entry = (this.tm.journal || []).find((e) => e.id === entryId);
    if (!entry) return;

    this.editingId = entryId;
    document.getElementById("journalSidenavHeader").textContent =
      "Edit Journal Entry";
    this._fillForm(entry);
    this._showEditMode();

    document.getElementById("journalSidenavDelete").classList.remove("hidden");
    Sidenav.open("journalSidenav");
  }

  openNew() {
    this.editingId = null;
    document.getElementById("journalSidenavHeader").textContent =
      "New Journal Entry";
    this._clearForm();
    const now = new Date();
    document.getElementById("journalSidenavDate").value =
      now.toISOString().split("T")[0];
    document.getElementById("journalSidenavTime").value =
      now.toTimeString().slice(0, 5);
    document.getElementById("journalSidenavDelete").classList.add("hidden");
    this._showEditMode();
    Sidenav.open("journalSidenav");
    document.getElementById("journalSidenavBody")?.focus();
  }

  close() {
    Sidenav.close("journalSidenav");
    this.editingId = null;
  }

  // ------------------------------------------------------------------
  // Private: mode switching
  // ------------------------------------------------------------------

  _showViewMode() {
    document.getElementById("journalSidenavViewSection").classList.remove(
      "hidden",
    );
    document.getElementById("journalSidenavFormSection").classList.add(
      "hidden",
    );
    document.getElementById("journalSidenavCancel").classList.add("hidden");
    document.getElementById("journalSidenavEditBtn").classList.remove("hidden");
    document.getElementById("journalSidenavSave").classList.add("hidden");
  }

  _showEditMode() {
    document.getElementById("journalSidenavViewSection").classList.add(
      "hidden",
    );
    document.getElementById("journalSidenavFormSection").classList.remove(
      "hidden",
    );
    document.getElementById("journalSidenavCancel").classList.remove("hidden");
    document.getElementById("journalSidenavEditBtn").classList.add("hidden");
    document.getElementById("journalSidenavSave").classList.remove("hidden");
  }

  _switchToEdit() {
    const entry = (this.tm.journal || []).find((e) => e.id === this.editingId);
    if (!entry) return;

    document.getElementById("journalSidenavHeader").textContent =
      "Edit Journal Entry";
    this._fillForm(entry);
    this._showEditMode();
    document.getElementById("journalSidenavBody")?.focus();
  }

  // ------------------------------------------------------------------
  // Private: view rendering
  // ------------------------------------------------------------------

  _renderViewContent(entry) {
    const meta = document.getElementById("journalViewMeta");
    const body = document.getElementById("journalViewBody");

    const datetime = entry.time
      ? `${escapeHtml(entry.date)} at ${escapeHtml(entry.time)}`
      : escapeHtml(entry.date);

    const moodBadge = entry.mood
      ? `<span class="journal-mood-badge journal-mood-${entry.mood}">${MOOD_LABELS[entry.mood] ?? escapeHtml(entry.mood)}</span>`
      : "";

    const tagsHtml =
      (entry.tags || []).length > 0
        ? `<div class="journal-entry-tags">${entry.tags.map((t) => `<span class="journal-tag">${escapeHtml(t)}</span>`).join("")}</div>`
        : "";

    meta.innerHTML = `
      <div class="journal-view-meta-row">
        <span class="journal-entry-datetime">${datetime}</span>
        ${moodBadge}
      </div>
      ${tagsHtml}
    `;

    if (entry.body && entry.body.trim()) {
      // marked is globally available via vendor/marked/marked.min.js
      body.innerHTML = marked.parse(entry.body);
    } else {
      body.innerHTML = `<p style="color: var(--text-tertiary); font-style: italic;">No content.</p>`;
    }
  }

  // ------------------------------------------------------------------
  // Private: form helpers
  // ------------------------------------------------------------------

  _clearForm() {
    document.getElementById("journalSidenavDate").value = "";
    document.getElementById("journalSidenavTime").value = "";
    document.getElementById("journalSidenavTitle").value = "";
    document.getElementById("journalSidenavMood").value = "";
    document.getElementById("journalSidenavTags").value = "";
    document.getElementById("journalSidenavBody").value = "";
  }

  _fillForm(entry) {
    document.getElementById("journalSidenavDate").value = entry.date || "";
    document.getElementById("journalSidenavTime").value = entry.time || "";
    document.getElementById("journalSidenavTitle").value = entry.title || "";
    document.getElementById("journalSidenavMood").value = entry.mood || "";
    document.getElementById("journalSidenavTags").value = (entry.tags || [])
      .join(", ");
    document.getElementById("journalSidenavBody").value = entry.body || "";
  }

  _collectForm() {
    const tagsRaw = document.getElementById("journalSidenavTags").value;
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    return {
      date: document.getElementById("journalSidenavDate").value ||
        new Date().toISOString().split("T")[0],
      time: document.getElementById("journalSidenavTime").value || undefined,
      title: document.getElementById("journalSidenavTitle").value.trim() ||
        undefined,
      mood: document.getElementById("journalSidenavMood").value || undefined,
      tags: tags.length > 0 ? tags : undefined,
      body: document.getElementById("journalSidenavBody").value,
    };
  }

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  async handleSave() {
    const data = this._collectForm();

    if (this.editingId) {
      const res = await JournalAPI.update(this.editingId, data);
      if (!res.ok) {
        showToast("Failed to save entry", "error");
        return;
      }
    } else {
      const res = await JournalAPI.create(data);
      if (!res.ok) {
        showToast("Failed to create entry", "error");
        return;
      }
      const json = await res.json();
      this.editingId = json.id;
    }

    this.tm.journal = await JournalAPI.fetchAll();
    this.tm.journalModule.renderView();
    showToast("Entry saved");

    // After save, switch to view mode to show the rendered result
    const saved = (this.tm.journal || []).find((e) => e.id === this.editingId);
    if (saved) {
      const dateLabel = saved.time
        ? `${saved.date} at ${saved.time}`
        : saved.date;
      document.getElementById("journalSidenavHeader").textContent =
        saved.title || dateLabel;
      this._renderViewContent(saved);
      this._showViewMode();
      document.getElementById("journalSidenavDelete").classList.remove(
        "hidden",
      );
    }
  }

  async handleDelete() {
    if (!this.editingId) return;
    const confirmed = await showConfirm("Delete this journal entry?");
    if (!confirmed) return;

    const res = await JournalAPI.delete(this.editingId);
    if (!res.ok) {
      showToast("Failed to delete entry", "error");
      return;
    }

    this.tm.journal = await JournalAPI.fetchAll();
    this.tm.journalModule.renderView();
    this.close();
    showToast("Entry deleted");
  }
}
