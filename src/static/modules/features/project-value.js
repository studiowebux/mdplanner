import { ProjectValueAPI } from "../api.js";

/**
 * ProjectValueModule - Handles Project Value Board (4-block canvas)
 */
export class ProjectValueModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
  }

  async load() {
    try {
      this.taskManager.projectValueBoards = await ProjectValueAPI.fetchAll();
      this.renderSelector();
      if (
        this.taskManager.projectValueBoards.length > 0 &&
        !this.taskManager.selectedProjectValueId
      ) {
        this.select(this.taskManager.projectValueBoards[0].id);
      } else if (this.taskManager.selectedProjectValueId) {
        this.select(this.taskManager.selectedProjectValueId);
      } else {
        this.renderView(null);
      }
    } catch (error) {
      console.error("Error loading project value boards:", error);
    }
  }

  renderSelector() {
    const selector = document.getElementById("projectValueSelector");
    selector.innerHTML = '<option value="">Select Board</option>';
    this.taskManager.projectValueBoards.forEach((board) => {
      const option = document.createElement("option");
      option.value = board.id;
      option.textContent = `${board.title} (${board.date})`;
      selector.appendChild(option);
    });
  }

  select(boardId) {
    this.taskManager.selectedProjectValueId = boardId;
    const selector = document.getElementById("projectValueSelector");
    selector.value = boardId || "";

    const board = this.taskManager.projectValueBoards.find(
      (b) => b.id === boardId,
    );
    this.renderView(board);

    const editBtn = document.getElementById("editProjectValueBtn");
    const deleteBtn = document.getElementById("deleteProjectValueBtn");
    if (board) {
      editBtn.classList.remove("hidden");
      deleteBtn.classList.remove("hidden");
    } else {
      editBtn.classList.add("hidden");
      deleteBtn.classList.add("hidden");
    }
  }

  renderView(board) {
    const emptyState = document.getElementById("emptyProjectValueState");
    const grid = document.getElementById("projectValueGrid");

    if (!board) {
      emptyState.classList.remove("hidden");
      grid.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    grid.classList.remove("hidden");

    const sections = [
      { key: "customerSegments", el: "pvbCustomerSegments" },
      { key: "problem", el: "pvbProblem" },
      { key: "solution", el: "pvbSolution" },
      { key: "benefit", el: "pvbBenefit" },
    ];

    sections.forEach(({ key, el }) => {
      const ul = document.getElementById(el);
      ul.innerHTML = (board[key] || [])
        .map(
          (item, idx) => `
        <li class="flex justify-between items-start group">
          <span class="break-words flex-1">${item}</span>
          <button onclick="taskManager.removeProjectValueItem('${key}', ${idx})" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-1 flex-shrink-0">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </li>
      `,
        )
        .join("");
    });
  }

  openModal(id = null) {
    this.taskManager.editingProjectValueId = id;
    const modal = document.getElementById("projectValueModal");
    const title = document.getElementById("projectValueModalTitle");
    document.getElementById("projectValueTitle").value = "";
    document.getElementById("projectValueDate").value = new Date()
      .toISOString()
      .split("T")[0];

    if (id) {
      title.textContent = "Edit Project Value Board";
      const board = this.taskManager.projectValueBoards.find(
        (b) => b.id === id,
      );
      if (board) {
        document.getElementById("projectValueTitle").value = board.title;
        document.getElementById("projectValueDate").value = board.date;
      }
    } else {
      title.textContent = "New Project Value Board";
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.getElementById("projectValueTitle").focus();
  }

  closeModal() {
    const modal = document.getElementById("projectValueModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.taskManager.editingProjectValueId = null;
  }

  async save(e) {
    e.preventDefault();
    const title = document.getElementById("projectValueTitle").value.trim();
    const date = document.getElementById("projectValueDate").value;

    if (!title) return;

    try {
      if (this.taskManager.editingProjectValueId) {
        const board = this.taskManager.projectValueBoards.find(
          (b) => b.id === this.taskManager.editingProjectValueId,
        );
        await ProjectValueAPI.update(this.taskManager.editingProjectValueId, {
          ...board,
          title,
          date,
        });
      } else {
        await ProjectValueAPI.create({ title, date });
      }
      this.closeModal();
      await this.load();
    } catch (error) {
      console.error("Error saving project value board:", error);
    }
  }

  editSelected() {
    if (this.taskManager.selectedProjectValueId) {
      this.taskManager.projectValueSidenavModule.openEdit(this.taskManager.selectedProjectValueId);
    }
  }

  async deleteSelected() {
    if (!this.taskManager.selectedProjectValueId) return;
    if (!confirm("Delete this Project Value Board?")) return;
    try {
      await ProjectValueAPI.delete(this.taskManager.selectedProjectValueId);
      this.taskManager.selectedProjectValueId = null;
      await this.load();
    } catch (error) {
      console.error("Error deleting project value board:", error);
    }
  }

  openItemModal(section) {
    this.taskManager.projectValueSection = section;
    const modal = document.getElementById("projectValueItemModal");
    const title = document.getElementById("projectValueItemModalTitle");
    const sectionNames = {
      customerSegments: "Customer Segments",
      problem: "Problem",
      solution: "Solution",
      benefit: "Benefit",
    };
    title.textContent = `Add ${sectionNames[section]}`;
    document.getElementById("projectValueItemText").value = "";
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.getElementById("projectValueItemText").focus();
  }

  closeItemModal() {
    const modal = document.getElementById("projectValueItemModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.taskManager.projectValueSection = null;
  }

  async saveItem(e) {
    e.preventDefault();
    if (
      !this.taskManager.selectedProjectValueId ||
      !this.taskManager.projectValueSection
    ) {
      return;
    }

    const text = document.getElementById("projectValueItemText").value.trim();
    if (!text) return;

    const board = this.taskManager.projectValueBoards.find(
      (b) => b.id === this.taskManager.selectedProjectValueId,
    );
    if (!board) return;

    board[this.taskManager.projectValueSection].push(text);

    try {
      await ProjectValueAPI.update(
        this.taskManager.selectedProjectValueId,
        board,
      );
      this.closeItemModal();
      this.renderView(board);
    } catch (error) {
      console.error("Error saving project value item:", error);
    }
  }

  async removeItem(section, index) {
    if (!this.taskManager.selectedProjectValueId) return;
    const board = this.taskManager.projectValueBoards.find(
      (b) => b.id === this.taskManager.selectedProjectValueId,
    );
    if (!board) return;

    board[section].splice(index, 1);

    try {
      await ProjectValueAPI.update(
        this.taskManager.selectedProjectValueId,
        board,
      );
      this.renderView(board);
    } catch (error) {
      console.error("Error removing project value item:", error);
    }
  }

  bindEvents() {
    // View button
    document
      .getElementById("projectValueViewBtn")
      .addEventListener("click", () => {
        this.taskManager.switchView("projectValue");
        document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
      });

    // Add Project Value button
    document
      .getElementById("addProjectValueBtn")
      .addEventListener("click", () => this.taskManager.projectValueSidenavModule.openNew());

    // Cancel Project Value modal
    document
      .getElementById("cancelProjectValueBtn")
      .addEventListener("click", () => this.closeModal());

    // Project Value form submission
    document
      .getElementById("projectValueForm")
      .addEventListener("submit", (e) => this.save(e));

    // Selector change
    document
      .getElementById("projectValueSelector")
      .addEventListener("change", (e) => this.select(e.target.value));

    // Edit and delete buttons
    document
      .getElementById("editProjectValueBtn")
      .addEventListener("click", () => this.editSelected());
    document
      .getElementById("deleteProjectValueBtn")
      .addEventListener("click", () => this.deleteSelected());

    // Item modal events
    document
      .getElementById("cancelProjectValueItemBtn")
      .addEventListener("click", () => this.closeItemModal());
    document
      .getElementById("projectValueItemForm")
      .addEventListener("submit", (e) => this.saveItem(e));

    // Add buttons for each section
    document.querySelectorAll(".pvb-add-btn").forEach(btn => {
      btn.addEventListener("click", () => this.openItemModal(btn.dataset.section));
    });

    // Close modals on background click
    document.getElementById("projectValueModal").addEventListener("click", (e) => {
      if (e.target.id === "projectValueModal") {
        this.closeModal();
      }
    });
    document.getElementById("projectValueItemModal").addEventListener("click", (e) => {
      if (e.target.id === "projectValueItemModal") {
        this.closeItemModal();
      }
    });
  }
}
