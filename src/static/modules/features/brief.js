import { BriefAPI } from "../api.js";
import { escapeHtml } from "../utils.js";

/**
 * BriefModule - Handles Brief documents (project brief with RACI sections)
 */
export class BriefModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
  }

  async load() {
    try {
      this.taskManager.briefs = await BriefAPI.fetchAll();
      this.renderSelector();
      if (
        this.taskManager.briefs.length > 0 &&
        !this.taskManager.selectedBriefId
      ) {
        this.select(this.taskManager.briefs[0].id);
      } else if (this.taskManager.selectedBriefId) {
        this.select(this.taskManager.selectedBriefId);
      }
    } catch (error) {
      console.error("Error loading briefs:", error);
    }
  }

  renderSelector() {
    const selector = document.getElementById("briefSelector");
    if (!selector) return;
    selector.innerHTML = '<option value="">Select Brief</option>';
    this.taskManager.briefs.forEach((brief) => {
      const option = document.createElement("option");
      option.value = brief.id;
      option.textContent = `${brief.title} (${brief.date})`;
      if (brief.id === this.taskManager.selectedBriefId) option.selected = true;
      selector.appendChild(option);
    });
  }

  select(briefId) {
    this.taskManager.selectedBriefId = briefId;
    const selector = document.getElementById("briefSelector");
    if (selector) selector.value = briefId || "";

    const brief = this.taskManager.briefs.find((b) => b.id === briefId);
    const editBtn = document.getElementById("editBriefBtn");
    const deleteBtn = document.getElementById("deleteBriefBtn");

    if (brief) {
      editBtn?.classList.remove("hidden");
      deleteBtn?.classList.remove("hidden");
      this.renderGrid(brief);
    } else {
      editBtn?.classList.add("hidden");
      deleteBtn?.classList.add("hidden");
      document.getElementById("briefGrid")?.classList.add("hidden");
      document.getElementById("emptyBriefState")?.classList.remove("hidden");
    }
  }

  renderGrid(brief) {
    const grid = document.getElementById("briefGrid");
    const emptyState = document.getElementById("emptyBriefState");

    if (!brief) {
      grid?.classList.add("hidden");
      emptyState?.classList.remove("hidden");
      return;
    }

    grid?.classList.remove("hidden");
    emptyState?.classList.add("hidden");

    const sectionMapping = {
      summary: "briefSummary",
      mission: "briefMission",
      responsible: "briefResponsible",
      accountable: "briefAccountable",
      consulted: "briefConsulted",
      informed: "briefInformed",
      highLevelBudget: "briefBudget",
      highLevelTimeline: "briefTimeline",
      culture: "briefCulture",
      changeCapacity: "briefChangeCapacity",
      guidingPrinciples: "briefGuidingPrinciples",
    };

    for (const [key, elementId] of Object.entries(sectionMapping)) {
      const ul = document.getElementById(elementId);
      if (!ul) continue;
      ul.innerHTML = "";
      const items = brief[key] || [];
      items.forEach((item, idx) => {
        const li = document.createElement("li");
        li.className = "group flex items-start gap-2 py-1";
        li.innerHTML = `
          <span class="flex-1 text-sm text-gray-700 dark:text-gray-300">${escapeHtml(item)}</span>
          <button onclick="taskManager.removeBriefItem('${key}', ${idx})" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-1 flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        `;
        ul.appendChild(li);
      });
    }
  }

  openModal(editId = null) {
    this.taskManager.editingBriefId = editId;
    const modal = document.getElementById("briefModal");
    const title = document.getElementById("briefModalTitle");
    const titleInput = document.getElementById("briefTitle");
    const dateInput = document.getElementById("briefDate");

    if (editId) {
      const brief = this.taskManager.briefs.find((b) => b.id === editId);
      if (brief) {
        title.textContent = "Edit Brief";
        titleInput.value = brief.title;
        dateInput.value = brief.date;
      }
    } else {
      title.textContent = "New Brief";
      titleInput.value = "";
      dateInput.value = new Date().toISOString().split("T")[0];
    }
    modal?.classList.remove("hidden");
    modal?.classList.add("flex");
  }

  closeModal() {
    const modal = document.getElementById("briefModal");
    modal?.classList.add("hidden");
    modal?.classList.remove("flex");
    this.taskManager.editingBriefId = null;
  }

  async save(e) {
    e.preventDefault();
    const title = document.getElementById("briefTitle").value.trim();
    const date = document.getElementById("briefDate").value;

    if (!title) return;

    try {
      if (this.taskManager.editingBriefId) {
        const brief = this.taskManager.briefs.find(
          (b) => b.id === this.taskManager.editingBriefId,
        );
        if (brief) {
          brief.title = title;
          brief.date = date;
          await BriefAPI.update(this.taskManager.editingBriefId, brief);
        }
      } else {
        const response = await BriefAPI.create({ title, date });
        const newBrief = await response.json();
        this.taskManager.selectedBriefId = newBrief.id;
      }
      this.closeModal();
      await this.load();
    } catch (error) {
      console.error("Error saving brief:", error);
    }
  }

  edit() {
    if (this.taskManager.selectedBriefId) {
      this.openModal(this.taskManager.selectedBriefId);
    }
  }

  async delete() {
    if (!this.taskManager.selectedBriefId) return;
    if (!confirm("Are you sure you want to delete this brief?")) return;
    try {
      await BriefAPI.delete(this.taskManager.selectedBriefId);
      this.taskManager.selectedBriefId = null;
      await this.load();
    } catch (error) {
      console.error("Error deleting brief:", error);
    }
  }

  openItemModal(section) {
    this.taskManager.briefSection = section;
    const modal = document.getElementById("briefItemModal");
    const sectionTitle = document.getElementById("briefItemSectionTitle");
    const input = document.getElementById("briefItemText");

    const sectionNames = {
      summary: "Summary",
      mission: "Mission",
      responsible: "Responsible",
      accountable: "Accountable",
      consulted: "Consulted",
      informed: "Informed",
      highLevelBudget: "High Level Budget",
      highLevelTimeline: "High Level Timeline",
      culture: "Culture",
      changeCapacity: "Change Capacity",
      guidingPrinciples: "Guiding Principles",
    };

    sectionTitle.textContent = sectionNames[section] || section;
    input.value = "";
    modal?.classList.remove("hidden");
    input.focus();
  }

  closeItemModal() {
    document.getElementById("briefItemModal")?.classList.add("hidden");
    this.taskManager.briefSection = null;
  }

  async saveItem(e) {
    e.preventDefault();
    if (
      !this.taskManager.selectedBriefId ||
      !this.taskManager.briefSection
    ) {
      return;
    }

    const text = document.getElementById("briefItemText").value.trim();
    if (!text) return;

    const brief = this.taskManager.briefs.find(
      (b) => b.id === this.taskManager.selectedBriefId,
    );
    if (!brief) return;

    brief[this.taskManager.briefSection].push(text);

    try {
      await BriefAPI.update(this.taskManager.selectedBriefId, brief);
      this.closeItemModal();
      this.renderGrid(brief);
    } catch (error) {
      console.error("Error saving brief item:", error);
    }
  }

  async removeItem(section, index) {
    if (!this.taskManager.selectedBriefId) return;
    const brief = this.taskManager.briefs.find(
      (b) => b.id === this.taskManager.selectedBriefId,
    );
    if (!brief) return;

    brief[section].splice(index, 1);

    try {
      await BriefAPI.update(this.taskManager.selectedBriefId, brief);
      this.renderGrid(brief);
    } catch (error) {
      console.error("Error removing brief item:", error);
    }
  }

  bindEvents() {
    // View button
    document
      .getElementById("briefViewBtn")
      .addEventListener("click", () => {
        this.taskManager.switchView("brief");
        document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
      });

    // Add Brief button
    document
      .getElementById("addBriefBtn")
      .addEventListener("click", () => this.openModal());

    // Cancel Brief modal
    document
      .getElementById("cancelBriefBtn")
      .addEventListener("click", () => this.closeModal());

    // Brief form submission
    document
      .getElementById("briefForm")
      .addEventListener("submit", (e) => this.save(e));

    // Selector change
    document
      .getElementById("briefSelector")
      .addEventListener("change", (e) => this.select(e.target.value));

    // Edit and delete buttons
    document
      .getElementById("editBriefBtn")
      .addEventListener("click", () => this.edit());
    document
      .getElementById("deleteBriefBtn")
      .addEventListener("click", () => this.delete());

    // Item modal events
    document
      .getElementById("cancelBriefItemBtn")
      .addEventListener("click", () => this.closeItemModal());
    document
      .getElementById("briefItemForm")
      .addEventListener("submit", (e) => this.saveItem(e));

    // Add buttons for each section
    document.querySelectorAll(".brief-add-btn").forEach(btn => {
      btn.addEventListener("click", () => this.openItemModal(btn.dataset.section));
    });

    // Close modals on background click
    document.getElementById("briefModal")?.addEventListener("click", (e) => {
      if (e.target.id === "briefModal") {
        this.closeModal();
      }
    });
    document.getElementById("briefItemModal")?.addEventListener("click", (e) => {
      if (e.target.id === "briefItemModal") {
        this.closeItemModal();
      }
    });
  }
}
