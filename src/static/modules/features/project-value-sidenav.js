// Project Value Board Sidenav Module
// Slide-in panel for Project Value Board with inline item management

import { Sidenav } from "../ui/sidenav.js";
import { ProjectValueAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { escapeHtml } from "../utils.js";

export class ProjectValueSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingBoardId = null;
    this.currentBoard = null;
    this.autoSaveTimeout = null;

    this.sections = ["customerSegments", "problem", "solution", "benefit"];

    this.sectionNames = {
      customerSegments: "Customer Segments",
      problem: "Problem",
      solution: "Solution",
      benefit: "Benefit",
    };
  }

  bindEvents() {
    document.getElementById("pvbSidenavClose")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("pvbSidenavCancel")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("pvbSidenavDelete")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );

    document.getElementById("pvbSidenavTitle")?.addEventListener(
      "input",
      () => this.scheduleAutoSave(),
    );
    document.getElementById("pvbSidenavDate")?.addEventListener(
      "change",
      () => this.scheduleAutoSave(),
    );

    this.sections.forEach((section) => {
      document.getElementById(`pvbSidenav_add_${section}`)?.addEventListener(
        "click",
        () => {
          this.showAddItemInput(section);
        },
      );
    });
  }

  openNew() {
    this.editingBoardId = null;
    this.currentBoard = {
      title: "",
      date: new Date().toISOString().split("T")[0],
    };
    this.sections.forEach((s) => this.currentBoard[s] = []);

    document.getElementById("pvbSidenavHeader").textContent =
      "New Project Value Board";
    this.fillForm();
    document.getElementById("pvbSidenavDelete").classList.add("hidden");
    Sidenav.open("pvbSidenav");
  }

  openEdit(boardId) {
    const board = this.tm.projectValueBoards.find((b) => b.id === boardId);
    if (!board) return;

    this.editingBoardId = boardId;
    this.currentBoard = JSON.parse(JSON.stringify(board));

    document.getElementById("pvbSidenavHeader").textContent =
      "Edit Project Value Board";
    this.fillForm();
    document.getElementById("pvbSidenavDelete").classList.remove("hidden");
    Sidenav.open("pvbSidenav");
  }

  close() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }
    Sidenav.close("pvbSidenav");
    this.editingBoardId = null;
    this.currentBoard = null;
  }

  fillForm() {
    document.getElementById("pvbSidenavTitle").value =
      this.currentBoard.title || "";
    document.getElementById("pvbSidenavDate").value = this.currentBoard.date ||
      "";
    this.sections.forEach((s) => this.renderSection(s));
  }

  renderSection(section) {
    const container = document.getElementById(`pvbSidenav_${section}`);
    if (!container) return;

    const items = this.currentBoard[section] || [];

    container.innerHTML = items.length === 0
      ? '<div class="text-gray-400 dark:text-gray-500 text-sm italic py-1">No items</div>'
      : items.map((item, idx) => `
        <div class="flex items-start gap-2 py-1 group">
          <span class="flex-1 text-sm text-gray-700 dark:text-gray-300">${
        escapeHtml(item)
      }</span>
          <button onclick="taskManager.projectValueSidenavModule.removeItem('${section}', ${idx})"
                  class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      `).join("");
  }

  showAddItemInput(section) {
    const container = document.getElementById(`pvbSidenav_${section}`);
    const existingInput = container.querySelector(".pvb-add-input");
    if (existingInput) {
      existingInput.querySelector("input").focus();
      return;
    }

    const inputHtml = `
      <div class="pvb-add-input flex gap-2 mt-1">
        <input type="text" class="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
               placeholder="Enter item..." autofocus>
        <button type="button" class="px-2 py-1 text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded">Add</button>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", inputHtml);

    const inputWrapper = container.querySelector(".pvb-add-input");
    const input = inputWrapper.querySelector("input");
    const addBtn = inputWrapper.querySelector("button");

    const addItem = () => {
      const text = input.value.trim();
      if (text) {
        this.currentBoard[section].push(text);
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
    this.currentBoard[section].splice(index, 1);
    this.renderSection(section);
    this.scheduleAutoSave();
  }

  scheduleAutoSave() {
    if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
    this.showSaveStatus("Saving...");
    this.autoSaveTimeout = setTimeout(() => this.save(), 1000);
  }

  async save() {
    this.currentBoard.title = document.getElementById("pvbSidenavTitle").value
      .trim();
    this.currentBoard.date = document.getElementById("pvbSidenavDate").value;

    if (!this.currentBoard.title) {
      this.showSaveStatus("Title required");
      return;
    }

    try {
      if (this.editingBoardId) {
        await ProjectValueAPI.update(this.editingBoardId, this.currentBoard);
        this.showSaveStatus("Saved");
      } else {
        const response = await ProjectValueAPI.create(this.currentBoard);
        const result = await response.json();
        this.editingBoardId = result.id;
        this.currentBoard.id = result.id;
        this.showSaveStatus("Created");
        document.getElementById("pvbSidenavHeader").textContent =
          "Edit Project Value Board";
        document.getElementById("pvbSidenavDelete").classList.remove("hidden");
      }
      await this.tm.projectValueModule.load();
    } catch (error) {
      console.error("Error saving Project Value Board:", error);
      this.showSaveStatus("Error");
      showToast("Error saving Project Value Board", "error");
    }
  }

  async handleDelete() {
    if (!this.editingBoardId) return;
    if (
      !confirm(`Delete "${this.currentBoard.title}"? This cannot be undone.`)
    ) return;

    try {
      await ProjectValueAPI.delete(this.editingBoardId);
      showToast("Project Value Board deleted", "success");
      await this.tm.projectValueModule.load();
      this.close();
    } catch (error) {
      console.error("Error deleting Project Value Board:", error);
      showToast("Error deleting Project Value Board", "error");
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById("pvbSidenavSaveStatus");
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

export default ProjectValueSidenavModule;
