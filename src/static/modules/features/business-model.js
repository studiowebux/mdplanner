import { BusinessModelAPI } from "../api.js";

/**
 * BusinessModelModule - Handles Business Model Canvas (9-block canvas)
 */
export class BusinessModelModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
  }

  async load() {
    try {
      this.taskManager.businessModelCanvases = await BusinessModelAPI
        .fetchAll();
      this.renderSelector();
      if (
        this.taskManager.businessModelCanvases.length > 0 &&
        !this.taskManager.selectedBusinessModelId
      ) {
        this.select(this.taskManager.businessModelCanvases[0].id);
      } else if (this.taskManager.selectedBusinessModelId) {
        this.select(this.taskManager.selectedBusinessModelId);
      } else {
        this.renderView(null);
      }
    } catch (error) {
      console.error("Error loading business model canvases:", error);
    }
  }

  renderSelector() {
    const selector = document.getElementById("businessModelSelector");
    selector.innerHTML = '<option value="">Select Canvas</option>';
    this.taskManager.businessModelCanvases.forEach((canvas) => {
      const option = document.createElement("option");
      option.value = canvas.id;
      option.textContent = `${canvas.title} (${canvas.date})`;
      selector.appendChild(option);
    });
  }

  select(canvasId) {
    this.taskManager.selectedBusinessModelId = canvasId;
    const selector = document.getElementById("businessModelSelector");
    selector.value = canvasId || "";

    const canvas = this.taskManager.businessModelCanvases.find(
      (c) => c.id === canvasId,
    );
    this.renderView(canvas);

    const editBtn = document.getElementById("editBusinessModelBtn");
    const deleteBtn = document.getElementById("deleteBusinessModelBtn");
    if (canvas) {
      editBtn.classList.remove("hidden");
      deleteBtn.classList.remove("hidden");
    } else {
      editBtn.classList.add("hidden");
      deleteBtn.classList.add("hidden");
    }
  }

  renderView(canvas) {
    const emptyState = document.getElementById("emptyBusinessModelState");
    const grid = document.getElementById("businessModelGrid");

    if (!canvas) {
      emptyState.classList.remove("hidden");
      grid.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    grid.classList.remove("hidden");

    const sections = [
      { key: "keyPartners", el: "bmcKeyPartners" },
      { key: "keyActivities", el: "bmcKeyActivities" },
      { key: "keyResources", el: "bmcKeyResources" },
      { key: "valueProposition", el: "bmcValueProposition" },
      { key: "customerRelationships", el: "bmcCustomerRelationships" },
      { key: "channels", el: "bmcChannels" },
      { key: "customerSegments", el: "bmcCustomerSegments" },
      { key: "costStructure", el: "bmcCostStructure" },
      { key: "revenueStreams", el: "bmcRevenueStreams" },
    ];

    sections.forEach(({ key, el }) => {
      const ul = document.getElementById(el);
      ul.innerHTML = (canvas[key] || [])
        .map(
          (item, idx) => `
        <li class="flex justify-between items-start group">
          <span class="break-words flex-1">${item}</span>
          <button onclick="taskManager.removeBusinessModelItem('${key}', ${idx})" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-1 flex-shrink-0">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </li>
      `,
        )
        .join("");
    });
  }

  openModal(id = null) {
    this.taskManager.editingBusinessModelId = id;
    const modal = document.getElementById("businessModelModal");
    const title = document.getElementById("businessModelModalTitle");
    document.getElementById("businessModelTitle").value = "";
    document.getElementById("businessModelDate").value = new Date()
      .toISOString()
      .split("T")[0];

    if (id) {
      title.textContent = "Edit Business Model Canvas";
      const canvas = this.taskManager.businessModelCanvases.find(
        (c) => c.id === id,
      );
      if (canvas) {
        document.getElementById("businessModelTitle").value = canvas.title;
        document.getElementById("businessModelDate").value = canvas.date;
      }
    } else {
      title.textContent = "New Business Model Canvas";
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.getElementById("businessModelTitle").focus();
  }

  closeModal() {
    const modal = document.getElementById("businessModelModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.taskManager.editingBusinessModelId = null;
  }

  async save(e) {
    e.preventDefault();
    const title = document.getElementById("businessModelTitle").value.trim();
    const date = document.getElementById("businessModelDate").value;

    if (!title) return;

    try {
      if (this.taskManager.editingBusinessModelId) {
        const canvas = this.taskManager.businessModelCanvases.find(
          (c) => c.id === this.taskManager.editingBusinessModelId,
        );
        await BusinessModelAPI.update(this.taskManager.editingBusinessModelId, {
          ...canvas,
          title,
          date,
        });
      } else {
        await BusinessModelAPI.create({ title, date });
      }
      this.closeModal();
      await this.load();
    } catch (error) {
      console.error("Error saving business model canvas:", error);
    }
  }

  editSelected() {
    if (this.taskManager.selectedBusinessModelId) {
      this.taskManager.businessModelSidenavModule.openEdit(
        this.taskManager.selectedBusinessModelId,
      );
    }
  }

  async deleteSelected() {
    if (!this.taskManager.selectedBusinessModelId) return;
    if (!confirm("Delete this Business Model Canvas?")) return;
    try {
      await BusinessModelAPI.delete(this.taskManager.selectedBusinessModelId);
      this.taskManager.selectedBusinessModelId = null;
      await this.load();
    } catch (error) {
      console.error("Error deleting business model canvas:", error);
    }
  }

  openItemModal(section) {
    this.taskManager.businessModelSection = section;
    const modal = document.getElementById("businessModelItemModal");
    const title = document.getElementById("businessModelItemModalTitle");
    const sectionNames = {
      keyPartners: "Key Partners",
      keyActivities: "Key Activities",
      keyResources: "Key Resources",
      valueProposition: "Value Proposition",
      customerRelationships: "Customer Relationships",
      channels: "Channels",
      customerSegments: "Customer Segments",
      costStructure: "Cost Structure",
      revenueStreams: "Revenue Streams",
    };
    title.textContent = `Add ${sectionNames[section]}`;
    document.getElementById("businessModelItemText").value = "";
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.getElementById("businessModelItemText").focus();
  }

  closeItemModal() {
    const modal = document.getElementById("businessModelItemModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.taskManager.businessModelSection = null;
  }

  async saveItem(e) {
    e.preventDefault();
    if (
      !this.taskManager.selectedBusinessModelId ||
      !this.taskManager.businessModelSection
    ) {
      return;
    }

    const text = document.getElementById("businessModelItemText").value.trim();
    if (!text) return;

    const canvas = this.taskManager.businessModelCanvases.find(
      (c) => c.id === this.taskManager.selectedBusinessModelId,
    );
    if (!canvas) return;

    canvas[this.taskManager.businessModelSection].push(text);

    try {
      await BusinessModelAPI.update(
        this.taskManager.selectedBusinessModelId,
        canvas,
      );
      this.closeItemModal();
      this.renderView(canvas);
    } catch (error) {
      console.error("Error saving business model item:", error);
    }
  }

  async removeItem(section, index) {
    if (!this.taskManager.selectedBusinessModelId) return;
    const canvas = this.taskManager.businessModelCanvases.find(
      (c) => c.id === this.taskManager.selectedBusinessModelId,
    );
    if (!canvas) return;

    canvas[section].splice(index, 1);

    try {
      await BusinessModelAPI.update(
        this.taskManager.selectedBusinessModelId,
        canvas,
      );
      this.renderView(canvas);
    } catch (error) {
      console.error("Error removing business model item:", error);
    }
  }

  bindEvents() {
    // View button
    document
      .getElementById("businessModelViewBtn")
      .addEventListener("click", () => {
        this.taskManager.switchView("businessModel");
        document.getElementById("viewSelectorDropdown")?.classList.add(
          "hidden",
        );
      });

    // Add Business Model button - opens sidenav
    document
      .getElementById("addBusinessModelBtn")
      .addEventListener(
        "click",
        () => this.taskManager.businessModelSidenavModule.openNew(),
      );

    // Cancel Business Model modal
    document
      .getElementById("cancelBusinessModelBtn")
      .addEventListener("click", () => this.closeModal());

    // Business Model form submission
    document
      .getElementById("businessModelForm")
      .addEventListener("submit", (e) => this.save(e));

    // Selector change
    document
      .getElementById("businessModelSelector")
      .addEventListener("change", (e) => this.select(e.target.value));

    // Edit and delete buttons
    document
      .getElementById("editBusinessModelBtn")
      .addEventListener("click", () => this.editSelected());
    document
      .getElementById("deleteBusinessModelBtn")
      .addEventListener("click", () => this.deleteSelected());

    // Item modal events
    document
      .getElementById("cancelBusinessModelItemBtn")
      .addEventListener("click", () => this.closeItemModal());
    document
      .getElementById("businessModelItemForm")
      .addEventListener("submit", (e) => this.saveItem(e));

    // Add buttons for each section
    document.querySelectorAll(".bmc-add-btn").forEach((btn) => {
      btn.addEventListener(
        "click",
        () => this.openItemModal(btn.dataset.section),
      );
    });

    // Close modals on background click
    document.getElementById("businessModelModal").addEventListener(
      "click",
      (e) => {
        if (e.target.id === "businessModelModal") {
          this.closeModal();
        }
      },
    );
    document.getElementById("businessModelItemModal").addEventListener(
      "click",
      (e) => {
        if (e.target.id === "businessModelItemModal") {
          this.closeItemModal();
        }
      },
    );
  }
}
