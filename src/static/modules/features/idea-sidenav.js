// Idea Sidenav Module
// Slide-in panel for idea creation and editing with inline Zettelkasten linking

import { Sidenav } from "../ui/sidenav.js";
import { IdeasAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { escapeHtml } from "../utils.js";

export class IdeaSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingIdeaId = null;
    this.currentIdea = null;
    this.autoSaveTimeout = null;
    this.linkSearchFilter = "";
  }

  bindEvents() {
    document.getElementById("ideaSidenavClose")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("ideaSidenavCancel")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("ideaSidenavDelete")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );

    // Auto-save on input changes
    const inputs = [
      "ideaSidenavTitle",
      "ideaSidenavStatus",
      "ideaSidenavCategory",
      "ideaSidenavDescription",
    ];
    inputs.forEach((id) => {
      document.getElementById(id)?.addEventListener(
        "input",
        () => this.scheduleAutoSave(),
      );
      document.getElementById(id)?.addEventListener(
        "change",
        () => this.scheduleAutoSave(),
      );
    });

    // Link section toggle
    document.getElementById("ideaSidenavToggleLinks")?.addEventListener(
      "click",
      () => this.toggleLinksSection(),
    );

    // Link search
    document.getElementById("ideaSidenavLinkSearch")?.addEventListener(
      "input",
      (e) => {
        this.linkSearchFilter = e.target.value;
        this.renderLinkOptions();
      },
    );
  }

  openNew() {
    this.editingIdeaId = null;
    this.currentIdea = {
      title: "",
      status: "new",
      category: "",
      description: "",
      links: [],
      created: new Date().toISOString().split("T")[0],
    };

    document.getElementById("ideaSidenavHeader").textContent = "New Idea";
    this.clearForm();
    this.fillForm();
    document.getElementById("ideaSidenavDelete").classList.add("hidden");

    // Hide links section for new ideas (show after first save)
    document.getElementById("ideaSidenavLinksSection").classList.add("hidden");

    Sidenav.open("ideaSidenav");
    document.getElementById("ideaSidenavTitle")?.focus();
  }

  openEdit(ideaId) {
    const idea = this.tm.ideas.find((i) => i.id === ideaId);
    if (!idea) return;

    this.editingIdeaId = ideaId;
    this.currentIdea = JSON.parse(JSON.stringify(idea)); // Deep copy

    document.getElementById("ideaSidenavHeader").textContent = "Edit Idea";
    this.fillForm();
    document.getElementById("ideaSidenavDelete").classList.remove("hidden");

    // Show links section for existing ideas
    document.getElementById("ideaSidenavLinksSection").classList.remove(
      "hidden",
    );
    this.renderLinkedIdeas();
    this.renderLinkOptions();

    Sidenav.open("ideaSidenav");
  }

  close() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }
    Sidenav.close("ideaSidenav");
    this.editingIdeaId = null;
    this.currentIdea = null;
    this.linkSearchFilter = "";
  }

  clearForm() {
    document.getElementById("ideaSidenavTitle").value = "";
    document.getElementById("ideaSidenavStatus").value = "new";
    document.getElementById("ideaSidenavCategory").value = "";
    document.getElementById("ideaSidenavDescription").value = "";
    document.getElementById("ideaSidenavLinkedList").innerHTML = "";
    document.getElementById("ideaSidenavLinkOptions").innerHTML = "";
    document.getElementById("ideaSidenavLinkSearch").value = "";
  }

  fillForm() {
    document.getElementById("ideaSidenavTitle").value =
      this.currentIdea.title || "";
    document.getElementById("ideaSidenavStatus").value =
      this.currentIdea.status || "new";
    document.getElementById("ideaSidenavCategory").value =
      this.currentIdea.category || "";
    document.getElementById("ideaSidenavDescription").value =
      this.currentIdea.description || "";

    if (this.editingIdeaId) {
      this.renderLinkedIdeas();
      this.renderLinkOptions();
    }
  }

  toggleLinksSection() {
    const content = document.getElementById("ideaSidenavLinksContent");
    const icon = document.getElementById("ideaSidenavToggleLinksIcon");
    content.classList.toggle("hidden");
    icon.classList.toggle("rotate-180");
  }

  renderLinkedIdeas() {
    const container = document.getElementById("ideaSidenavLinkedList");
    if (!container) return;

    const links = this.currentIdea.links || [];

    if (links.length === 0) {
      container.innerHTML =
        '<div class="text-muted text-sm italic py-2">No linked ideas</div>';
      return;
    }

    container.innerHTML = links.map((linkId) => {
      const linkedIdea = this.tm.ideas.find((i) => i.id === linkId);
      if (!linkedIdea) return "";
      return `
        <div class="flex items-center gap-2 py-1 group">
          <span class="flex-1 text-sm text-secondary">
            <span class="font-medium">${escapeHtml(linkedIdea.title)}</span>
            <span class="text-xs text-muted ml-1">(${linkedIdea.status})</span>
          </span>
          <button onclick="taskManager.ideaSidenavModule.removeLink('${linkId}')"
                  class="opacity-0 group-hover:opacity-100 text-muted hover:text-error flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      `;
    }).join("");
  }

  renderLinkOptions() {
    const container = document.getElementById("ideaSidenavLinkOptions");
    if (!container) return;

    const currentId = this.editingIdeaId;
    const currentLinks = this.currentIdea.links || [];
    const filter = this.linkSearchFilter.toLowerCase();

    // Get available ideas (not current, not already linked)
    const available = this.tm.ideas.filter((idea) =>
      idea.id !== currentId &&
      !currentLinks.includes(idea.id) &&
      (filter === "" || idea.title.toLowerCase().includes(filter))
    );

    if (available.length === 0) {
      container.innerHTML = filter
        ? '<div class="text-muted text-sm text-center py-2">No matching ideas</div>'
        : '<div class="text-muted text-sm text-center py-2">All ideas are already linked</div>';
      return;
    }

    container.innerHTML = available.slice(0, 10).map((idea) => `
      <label class="flex items-center gap-2 py-1.5 px-2 hover:bg-tertiary rounded cursor-pointer">
        <input type="checkbox" class="idea-link-checkbox h-4 w-4 rounded border-strong"
               value="${idea.id}">
        <span class="flex-1 text-sm text-secondary">${
      escapeHtml(idea.title)
    }</span>
        <span class="text-xs px-1.5 py-0.5 rounded bg-active text-secondary">${idea.status}</span>
      </label>
    `).join("");

    if (available.length > 10) {
      container.innerHTML +=
        `<div class="text-xs text-muted text-center py-1">Showing 10 of ${available.length} - use search to filter</div>`;
    }

    // Bind checkbox events
    container.querySelectorAll(".idea-link-checkbox").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        if (e.target.checked) {
          this.addLink(e.target.value);
          e.target.checked = false; // Reset checkbox
        }
      });
    });
  }

  addLink(ideaId) {
    if (!this.currentIdea.links) {
      this.currentIdea.links = [];
    }
    if (!this.currentIdea.links.includes(ideaId)) {
      this.currentIdea.links.push(ideaId);
      this.renderLinkedIdeas();
      this.renderLinkOptions();
      this.scheduleAutoSave();
    }
  }

  removeLink(ideaId) {
    this.currentIdea.links = (this.currentIdea.links || []).filter((id) =>
      id !== ideaId
    );
    this.renderLinkedIdeas();
    this.renderLinkOptions();
    this.scheduleAutoSave();
  }

  getFormData() {
    return {
      title: document.getElementById("ideaSidenavTitle").value.trim(),
      status: document.getElementById("ideaSidenavStatus").value,
      category: document.getElementById("ideaSidenavCategory").value.trim() ||
        null,
      description:
        document.getElementById("ideaSidenavDescription").value.trim() || null,
      links: this.currentIdea.links && this.currentIdea.links.length > 0
        ? this.currentIdea.links
        : null,
    };
  }

  scheduleAutoSave() {
    if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
    this.showSaveStatus("Saving...");
    this.autoSaveTimeout = setTimeout(() => this.save(), 1000);
  }

  async save() {
    const data = this.getFormData();

    if (!data.title) {
      this.showSaveStatus("Title required");
      return;
    }

    // Update currentIdea with form data
    Object.assign(this.currentIdea, data);

    try {
      if (this.editingIdeaId) {
        await IdeasAPI.update(this.editingIdeaId, data);
        this.showSaveStatus("Saved");
      } else {
        const response = await IdeasAPI.create(data);
        const result = await response.json();
        this.editingIdeaId = result.id;
        this.currentIdea.id = result.id;
        this.showSaveStatus("Created");

        // Update header and show delete/links
        document.getElementById("ideaSidenavHeader").textContent = "Edit Idea";
        document.getElementById("ideaSidenavDelete").classList.remove("hidden");
        document.getElementById("ideaSidenavLinksSection").classList.remove(
          "hidden",
        );
        this.renderLinkOptions();
      }

      await this.tm.ideasModule.load();
    } catch (error) {
      console.error("Error saving idea:", error);
      this.showSaveStatus("Error");
      showToast("Error saving idea", "error");
    }
  }

  async handleDelete() {
    if (!this.editingIdeaId) return;

    if (
      !confirm(`Delete "${this.currentIdea.title}"? This cannot be undone.`)
    ) return;

    try {
      await IdeasAPI.delete(this.editingIdeaId);
      showToast("Idea deleted", "success");
      await this.tm.ideasModule.load();
      this.close();
    } catch (error) {
      console.error("Error deleting idea:", error);
      showToast("Error deleting idea", "error");
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById("ideaSidenavSaveStatus");
    if (!statusEl) return;

    statusEl.textContent = text;
    statusEl.classList.remove(
      "hidden",
      "sidenav-status-saved",
      "sidenav-status-saving",
      "sidenav-status-error",
    );

    if (text === "Saved" || text === "Created") {
      statusEl.classList.add("sidenav-status-saved");
    } else if (text === "Error" || text === "Title required") {
      statusEl.classList.add("sidenav-status-error");
    } else {
      statusEl.classList.add("sidenav-status-saving");
    }

    if (text === "Saved" || text === "Created" || text === "Error") {
      setTimeout(() => statusEl.classList.add("hidden"), 2000);
    }
  }
}

export default IdeaSidenavModule;
