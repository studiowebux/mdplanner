// Journal Sidenav Module
// Slide-in panel for journal entry creation and editing

import { Sidenav } from "../ui/sidenav.js";
import { JournalAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { showConfirm } from "../ui/confirm.js";

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
      now.toTimeString().slice(0, 5); // HH:MM
    document.getElementById("journalSidenavDelete").classList.add("hidden");
    Sidenav.open("journalSidenav");
    document.getElementById("journalSidenavBody")?.focus();
  }

  openEdit(entryId) {
    const entry = (this.tm.journal || []).find((e) => e.id === entryId);
    if (!entry) return;

    this.editingId = entryId;
    document.getElementById("journalSidenavHeader").textContent =
      "Edit Journal Entry";
    this._fillForm(entry);
    document.getElementById("journalSidenavDelete").classList.remove("hidden");
    Sidenav.open("journalSidenav");
  }

  close() {
    Sidenav.close("journalSidenav");
    this.editingId = null;
  }

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
    document.getElementById("journalSidenavTags").value =
      (entry.tags || []).join(", ");
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
      document.getElementById("journalSidenavHeader").textContent =
        "Edit Journal Entry";
      document.getElementById("journalSidenavDelete").classList.remove(
        "hidden",
      );
    }

    this.tm.journal = await JournalAPI.fetchAll();
    this.tm.journalModule.renderView();
    showToast("Entry saved");
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
