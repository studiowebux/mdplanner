import { LeanCanvasAPI } from "../api.js";

/**
 * LeanCanvasModule - Handles Lean Canvas (startup-focused business model)
 */
export class LeanCanvasModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
  }

  async load() {
    try {
      this.taskManager.leanCanvases = await LeanCanvasAPI.fetchAll();
      this.renderSelector();
      if (
        this.taskManager.leanCanvases.length > 0 &&
        !this.taskManager.selectedLeanCanvasId
      ) {
        this.select(this.taskManager.leanCanvases[0].id);
      } else if (this.taskManager.selectedLeanCanvasId) {
        this.select(this.taskManager.selectedLeanCanvasId);
      } else {
        this.renderView(null);
      }
    } catch (error) {
      console.error("Error loading lean canvases:", error);
    }
  }

  renderSelector() {
    const selector = document.getElementById("leanCanvasSelector");
    selector.innerHTML = '<option value="">Select Canvas</option>';
    this.taskManager.leanCanvases.forEach((canvas) => {
      const option = document.createElement("option");
      option.value = canvas.id;
      option.textContent = `${canvas.title} (${canvas.date})`;
      selector.appendChild(option);
    });
  }

  select(canvasId) {
    this.taskManager.selectedLeanCanvasId = canvasId;
    const selector = document.getElementById("leanCanvasSelector");
    selector.value = canvasId || "";

    const canvas = this.taskManager.leanCanvases.find((c) => c.id === canvasId);
    this.renderView(canvas);

    const editBtn = document.getElementById("editLeanCanvasBtn");
    const deleteBtn = document.getElementById("deleteLeanCanvasBtn");
    if (canvas) {
      editBtn.classList.remove("hidden");
      deleteBtn.classList.remove("hidden");
    } else {
      editBtn.classList.add("hidden");
      deleteBtn.classList.add("hidden");
    }
  }

  renderView(canvas) {
    const emptyState = document.getElementById("emptyLeanCanvasState");
    const grid = document.getElementById("leanCanvasGrid");

    if (!canvas) {
      emptyState.classList.remove("hidden");
      grid.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    grid.classList.remove("hidden");

    const sections = [
      { key: "problem", el: "leanProblem" },
      { key: "solution", el: "leanSolution" },
      { key: "uniqueValueProp", el: "leanUniqueValueProp" },
      { key: "unfairAdvantage", el: "leanUnfairAdvantage" },
      { key: "customerSegments", el: "leanCustomerSegments" },
      { key: "existingAlternatives", el: "leanExistingAlternatives" },
      { key: "keyMetrics", el: "leanKeyMetrics" },
      { key: "highLevelConcept", el: "leanHighLevelConcept" },
      { key: "channels", el: "leanChannels" },
      { key: "earlyAdopters", el: "leanEarlyAdopters" },
      { key: "costStructure", el: "leanCostStructure" },
      { key: "revenueStreams", el: "leanRevenueStreams" },
    ];

    sections.forEach(({ key, el }) => {
      const ul = document.getElementById(el);
      ul.innerHTML = (canvas[key] || [])
        .map(
          (item, idx) => `
        <li class="flex justify-between items-start group">
          <span class="break-words flex-1">${item}</span>
          <button onclick="taskManager.removeLeanCanvasItem('${key}', ${idx})" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-1 flex-shrink-0">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </li>
      `,
        )
        .join("");
    });
  }

  openModal(id = null) {
    this.taskManager.editingLeanCanvasId = id;
    const modal = document.getElementById("leanCanvasModal");
    const title = document.getElementById("leanCanvasModalTitle");
    document.getElementById("leanCanvasTitle").value = "";
    document.getElementById("leanCanvasDate").value = new Date()
      .toISOString()
      .split("T")[0];

    if (id) {
      title.textContent = "Edit Lean Canvas";
      const canvas = this.taskManager.leanCanvases.find((c) => c.id === id);
      if (canvas) {
        document.getElementById("leanCanvasTitle").value = canvas.title;
        document.getElementById("leanCanvasDate").value = canvas.date;
      }
    } else {
      title.textContent = "New Lean Canvas";
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.getElementById("leanCanvasTitle").focus();
  }

  closeModal() {
    const modal = document.getElementById("leanCanvasModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.taskManager.editingLeanCanvasId = null;
  }

  async save(e) {
    e.preventDefault();
    const title = document.getElementById("leanCanvasTitle").value.trim();
    const date = document.getElementById("leanCanvasDate").value;

    if (!title) return;

    try {
      if (this.taskManager.editingLeanCanvasId) {
        const canvas = this.taskManager.leanCanvases.find(
          (c) => c.id === this.taskManager.editingLeanCanvasId,
        );
        await LeanCanvasAPI.update(this.taskManager.editingLeanCanvasId, {
          ...canvas,
          title,
          date,
        });
      } else {
        await LeanCanvasAPI.create({ title, date });
      }
      this.closeModal();
      await this.load();
    } catch (error) {
      console.error("Error saving lean canvas:", error);
    }
  }

  editSelected() {
    if (this.taskManager.selectedLeanCanvasId) {
      this.taskManager.leanCanvasSidenavModule.openEdit(this.taskManager.selectedLeanCanvasId);
    }
  }

  async deleteSelected() {
    if (!this.taskManager.selectedLeanCanvasId) return;
    if (!confirm("Delete this Lean Canvas?")) return;
    try {
      await LeanCanvasAPI.delete(this.taskManager.selectedLeanCanvasId);
      this.taskManager.selectedLeanCanvasId = null;
      await this.load();
    } catch (error) {
      console.error("Error deleting lean canvas:", error);
    }
  }

  openItemModal(section) {
    this.taskManager.leanCanvasSection = section;
    const modal = document.getElementById("leanCanvasItemModal");
    const title = document.getElementById("leanCanvasItemModalTitle");
    const sectionNames = {
      problem: "Problem",
      solution: "Solution",
      uniqueValueProp: "Unique Value Proposition",
      unfairAdvantage: "Unfair Advantage",
      customerSegments: "Customer Segments",
      existingAlternatives: "Existing Alternatives",
      keyMetrics: "Key Metrics",
      highLevelConcept: "High-Level Concept",
      channels: "Channels",
      earlyAdopters: "Early Adopters",
      costStructure: "Cost Structure",
      revenueStreams: "Revenue Streams",
    };
    title.textContent = `Add ${sectionNames[section]}`;
    document.getElementById("leanCanvasItemText").value = "";
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.getElementById("leanCanvasItemText").focus();
  }

  closeItemModal() {
    const modal = document.getElementById("leanCanvasItemModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.taskManager.leanCanvasSection = null;
  }

  async saveItem(e) {
    e.preventDefault();
    if (
      !this.taskManager.selectedLeanCanvasId ||
      !this.taskManager.leanCanvasSection
    ) {
      return;
    }

    const text = document.getElementById("leanCanvasItemText").value.trim();
    if (!text) return;

    const canvas = this.taskManager.leanCanvases.find(
      (c) => c.id === this.taskManager.selectedLeanCanvasId,
    );
    if (!canvas) return;

    canvas[this.taskManager.leanCanvasSection].push(text);

    try {
      await LeanCanvasAPI.update(this.taskManager.selectedLeanCanvasId, canvas);
      this.closeItemModal();
      this.renderView(canvas);
    } catch (error) {
      console.error("Error saving lean canvas item:", error);
    }
  }

  async removeItem(section, index) {
    if (!this.taskManager.selectedLeanCanvasId) return;
    const canvas = this.taskManager.leanCanvases.find(
      (c) => c.id === this.taskManager.selectedLeanCanvasId,
    );
    if (!canvas) return;

    canvas[section].splice(index, 1);

    try {
      await LeanCanvasAPI.update(this.taskManager.selectedLeanCanvasId, canvas);
      this.renderView(canvas);
    } catch (error) {
      console.error("Error removing lean canvas item:", error);
    }
  }

  bindEvents() {
    // View button
    document
      .getElementById("leanCanvasViewBtn")
      .addEventListener("click", () => {
        this.taskManager.switchView("leanCanvas");
        document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
      });

    // Add Lean Canvas button - opens sidenav
    document
      .getElementById("addLeanCanvasBtn")
      .addEventListener("click", () => this.taskManager.leanCanvasSidenavModule.openNew());

    // Cancel Lean Canvas modal
    document
      .getElementById("cancelLeanCanvasBtn")
      .addEventListener("click", () => this.closeModal());

    // Lean Canvas form submission
    document
      .getElementById("leanCanvasForm")
      .addEventListener("submit", (e) => this.save(e));

    // Selector change
    document
      .getElementById("leanCanvasSelector")
      .addEventListener("change", (e) => this.select(e.target.value));

    // Edit and delete buttons
    document
      .getElementById("editLeanCanvasBtn")
      .addEventListener("click", () => this.editSelected());
    document
      .getElementById("deleteLeanCanvasBtn")
      .addEventListener("click", () => this.deleteSelected());

    // Item modal events
    document
      .getElementById("cancelLeanCanvasItemBtn")
      .addEventListener("click", () => this.closeItemModal());
    document
      .getElementById("leanCanvasItemForm")
      .addEventListener("submit", (e) => this.saveItem(e));

    // Add buttons for each section
    document.querySelectorAll(".lean-add-btn").forEach(btn => {
      btn.addEventListener("click", () => this.openItemModal(btn.dataset.section));
    });

    // Close modals on background click
    document.getElementById("leanCanvasModal").addEventListener("click", (e) => {
      if (e.target.id === "leanCanvasModal") {
        this.closeModal();
      }
    });
    document.getElementById("leanCanvasItemModal").addEventListener("click", (e) => {
      if (e.target.id === "leanCanvasItemModal") {
        this.closeItemModal();
      }
    });
  }
}
