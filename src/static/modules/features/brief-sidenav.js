// Brief Sidenav Module
// Slide-in panel for Brief (RACI) with inline item management

import { Sidenav } from "../ui/sidenav.js";
import { BriefAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { escapeHtml } from "../utils.js";

export class BriefSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingBriefId = null;
    this.currentBrief = null;
    this.autoSaveTimeout = null;

    this.sections = [
      "summary",
      "mission",
      "responsible",
      "accountable",
      "consulted",
      "informed",
      "highLevelBudget",
      "highLevelTimeline",
      "culture",
      "changeCapacity",
      "guidingPrinciples",
    ];

    this.sectionNames = {
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
  }

  bindEvents() {
    document.getElementById("briefSidenavClose")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("briefSidenavCancel")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("briefSidenavDelete")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );

    document.getElementById("briefSidenavTitle")?.addEventListener(
      "input",
      () => this.scheduleAutoSave(),
    );
    document.getElementById("briefSidenavDate")?.addEventListener(
      "change",
      () => this.scheduleAutoSave(),
    );

    this.sections.forEach((section) => {
      document.getElementById(`briefSidenav_add_${section}`)?.addEventListener(
        "click",
        () => {
          this.showAddItemInput(section);
        },
      );
    });
  }

  openNew() {
    this.editingBriefId = null;
    this.currentBrief = {
      title: "",
      date: new Date().toISOString().split("T")[0],
    };
    this.sections.forEach((s) => this.currentBrief[s] = []);

    document.getElementById("briefSidenavHeader").textContent = "New Brief";
    this.fillForm();
    document.getElementById("briefSidenavDelete").classList.add("hidden");
    Sidenav.open("briefSidenav");
  }

  openEdit(briefId) {
    const brief = this.tm.briefs.find((b) => b.id === briefId);
    if (!brief) return;

    this.editingBriefId = briefId;
    this.currentBrief = JSON.parse(JSON.stringify(brief));

    document.getElementById("briefSidenavHeader").textContent = "Edit Brief";
    this.fillForm();
    document.getElementById("briefSidenavDelete").classList.remove("hidden");
    Sidenav.open("briefSidenav");
  }

  close() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }
    Sidenav.close("briefSidenav");
    this.editingBriefId = null;
    this.currentBrief = null;
  }

  fillForm() {
    document.getElementById("briefSidenavTitle").value =
      this.currentBrief.title || "";
    document.getElementById("briefSidenavDate").value =
      this.currentBrief.date || "";
    this.sections.forEach((s) => this.renderSection(s));
  }

  renderSection(section) {
    const container = document.getElementById(`briefSidenav_${section}`);
    if (!container) return;

    const items = this.currentBrief[section] || [];

    container.innerHTML = items.length === 0
      ? '<div class="text-gray-400 dark:text-gray-500 text-sm italic py-1">No items</div>'
      : items.map((item, idx) => `
        <div class="flex items-start gap-2 py-1 group">
          <span class="flex-1 text-sm text-gray-700 dark:text-gray-300">${
        escapeHtml(item)
      }</span>
          <button onclick="taskManager.briefSidenavModule.removeItem('${section}', ${idx})"
                  class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      `).join("");
  }

  showAddItemInput(section) {
    const container = document.getElementById(`briefSidenav_${section}`);
    const existingInput = container.querySelector(".brief-add-input");
    if (existingInput) {
      existingInput.querySelector("input").focus();
      return;
    }

    const inputHtml = `
      <div class="brief-add-input flex gap-2 mt-1">
        <input type="text" class="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
               placeholder="Enter item..." autofocus>
        <button type="button" class="px-2 py-1 text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded">Add</button>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", inputHtml);

    const inputWrapper = container.querySelector(".brief-add-input");
    const input = inputWrapper.querySelector("input");
    const addBtn = inputWrapper.querySelector("button");

    const addItem = () => {
      const text = input.value.trim();
      if (text) {
        this.currentBrief[section].push(text);
        this.renderSection(section);
        this.scheduleAutoSave();
      }
      inputWrapper.remove();
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addItem();
      if (e.key === "Escape") inputWrapper.remove();
    });
    addBtn.addEventListener("click", addItem);
    input.focus();
  }

  removeItem(section, index) {
    this.currentBrief[section].splice(index, 1);
    this.renderSection(section);
    this.scheduleAutoSave();
  }

  scheduleAutoSave() {
    if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
    this.showSaveStatus("Saving...");
    this.autoSaveTimeout = setTimeout(() => this.save(), 1000);
  }

  async save() {
    this.currentBrief.title = document.getElementById("briefSidenavTitle").value
      .trim();
    this.currentBrief.date = document.getElementById("briefSidenavDate").value;

    if (!this.currentBrief.title) {
      this.showSaveStatus("Title required");
      return;
    }

    try {
      if (this.editingBriefId) {
        await BriefAPI.update(this.editingBriefId, this.currentBrief);
        this.showSaveStatus("Saved");
      } else {
        const response = await BriefAPI.create(this.currentBrief);
        const result = await response.json();
        this.editingBriefId = result.id;
        this.currentBrief.id = result.id;
        this.showSaveStatus("Created");
        document.getElementById("briefSidenavHeader").textContent =
          "Edit Brief";
        document.getElementById("briefSidenavDelete").classList.remove(
          "hidden",
        );
      }
      await this.tm.briefModule.load();
    } catch (error) {
      console.error("Error saving Brief:", error);
      this.showSaveStatus("Error");
      showToast("Error saving Brief", "error");
    }
  }

  async handleDelete() {
    if (!this.editingBriefId) return;
    if (
      !confirm(`Delete "${this.currentBrief.title}"? This cannot be undone.`)
    ) return;

    try {
      await BriefAPI.delete(this.editingBriefId);
      showToast("Brief deleted", "success");
      await this.tm.briefModule.load();
      this.close();
    } catch (error) {
      console.error("Error deleting Brief:", error);
      showToast("Error deleting Brief", "error");
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById("briefSidenavSaveStatus");
    if (!statusEl) return;

    statusEl.textContent = text;
    statusEl.classList.remove(
      "hidden",
      "text-green-600",
      "text-red-500",
      "text-gray-500",
    );

    if (text === "Saved" || text === "Created") {
      statusEl.classList.add("text-green-600", "dark:text-green-400");
    } else if (text === "Error" || text === "Title required") {
      statusEl.classList.add("text-red-500");
    } else {
      statusEl.classList.add("text-gray-500", "dark:text-gray-400");
    }

    if (text === "Saved" || text === "Created" || text === "Error") {
      setTimeout(() => statusEl.classList.add("hidden"), 2000);
    }
  }
}

export default BriefSidenavModule;
