import { SwotAPI } from "../api.js";
import { escapeHtml } from "../utils.js";

/**
 * SwotModule - Handles SWOT Analysis (Strengths, Weaknesses, Opportunities, Threats)
 */
export class SwotModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
  }

  async load() {
    try {
      this.taskManager.swotAnalyses = await SwotAPI.fetchAll();
      this.renderSelector();
      if (
        this.taskManager.swotAnalyses.length > 0 &&
        !this.taskManager.selectedSwotId
      ) {
        this.select(this.taskManager.swotAnalyses[0].id);
      } else if (this.taskManager.selectedSwotId) {
        this.select(this.taskManager.selectedSwotId);
      } else {
        this.renderView(null);
      }
    } catch (error) {
      console.error("Error loading SWOT analyses:", error);
    }
  }

  renderSelector() {
    const selector = document.getElementById("swotSelector");
    selector.innerHTML = '<option value="">Select Analysis</option>';
    this.taskManager.swotAnalyses.forEach((swot) => {
      const option = document.createElement("option");
      option.value = swot.id;
      option.textContent = `${swot.title} (${swot.date})`;
      selector.appendChild(option);
    });
  }

  select(swotId) {
    this.taskManager.selectedSwotId = swotId;
    const selector = document.getElementById("swotSelector");
    selector.value = swotId || "";

    const swot = this.taskManager.swotAnalyses.find((s) => s.id === swotId);
    this.renderView(swot);

    const editBtn = document.getElementById("editSwotBtn");
    const deleteBtn = document.getElementById("deleteSwotBtn");
    if (swot) {
      editBtn.classList.remove("hidden");
      deleteBtn.classList.remove("hidden");
    } else {
      editBtn.classList.add("hidden");
      deleteBtn.classList.add("hidden");
    }
  }

  renderView(swot) {
    const emptyState = document.getElementById("emptySwotState");
    const grid = document.getElementById("swotGrid");

    if (!swot) {
      emptyState.classList.remove("hidden");
      grid.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    grid.classList.remove("hidden");

    const renderItems = (items, quadrant) => {
      if (!items || items.length === 0) {
        return '<li class="text-gray-400 dark:text-gray-500 italic">No items yet</li>';
      }
      return items
        .map(
          (item, idx) => `
        <li class="flex justify-between items-start group">
          <span>${escapeHtml(item)}</span>
          <button onclick="taskManager.removeSwotItem('${quadrant}', ${idx})" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-2">x</button>
        </li>
      `,
        )
        .join("");
    };

    document.getElementById("swotStrengths").innerHTML = renderItems(
      swot.strengths,
      "strengths",
    );
    document.getElementById("swotWeaknesses").innerHTML = renderItems(
      swot.weaknesses,
      "weaknesses",
    );
    document.getElementById("swotOpportunities").innerHTML = renderItems(
      swot.opportunities,
      "opportunities",
    );
    document.getElementById("swotThreats").innerHTML = renderItems(
      swot.threats,
      "threats",
    );
  }

  openModal(id = null) {
    this.taskManager.editingSwotId = id;
    const modal = document.getElementById("swotModal");
    const title = document.getElementById("swotModalTitle");
    const form = document.getElementById("swotForm");

    form.reset();
    document.getElementById("swotDate").value = new Date()
      .toISOString()
      .split("T")[0];

    if (id) {
      title.textContent = "Edit SWOT Analysis";
      const swot = this.taskManager.swotAnalyses.find((s) => s.id === id);
      if (swot) {
        document.getElementById("swotTitle").value = swot.title;
        document.getElementById("swotDate").value = swot.date;
      }
    } else {
      title.textContent = "New SWOT Analysis";
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closeModal() {
    const modal = document.getElementById("swotModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.taskManager.editingSwotId = null;
  }

  async save(e) {
    e.preventDefault();
    const data = {
      title: document.getElementById("swotTitle").value,
      date: document.getElementById("swotDate").value,
    };

    try {
      if (this.taskManager.editingSwotId) {
        await SwotAPI.update(this.taskManager.editingSwotId, data);
      } else {
        const response = await SwotAPI.create(data);
        const result = await response.json();
        this.taskManager.selectedSwotId = result.id;
      }
      this.closeModal();
      await this.load();
    } catch (error) {
      console.error("Error saving SWOT:", error);
    }
  }

  editSelected() {
    if (this.taskManager.selectedSwotId) {
      this.taskManager.swotSidenavModule.openEdit(
        this.taskManager.selectedSwotId,
      );
    }
  }

  async deleteSelected() {
    if (!this.taskManager.selectedSwotId) return;
    if (!confirm("Delete this SWOT analysis?")) return;
    try {
      await SwotAPI.delete(this.taskManager.selectedSwotId);
      this.taskManager.selectedSwotId = null;
      await this.load();
    } catch (error) {
      console.error("Error deleting SWOT:", error);
    }
  }

  openItemModal(quadrant) {
    this.taskManager.swotItemQuadrant = quadrant;
    const modal = document.getElementById("swotItemModal");
    const title = document.getElementById("swotItemModalTitle");
    const quadrantNames = {
      strengths: "Strength",
      weaknesses: "Weakness",
      opportunities: "Opportunity",
      threats: "Threat",
    };
    title.textContent = `Add ${quadrantNames[quadrant]}`;
    document.getElementById("swotItemText").value = "";
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.getElementById("swotItemText").focus();
  }

  closeItemModal() {
    const modal = document.getElementById("swotItemModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.taskManager.swotItemQuadrant = null;
  }

  async saveItem(e) {
    e.preventDefault();
    if (
      !this.taskManager.selectedSwotId ||
      !this.taskManager.swotItemQuadrant
    ) {
      return;
    }

    const text = document.getElementById("swotItemText").value.trim();
    if (!text) return;

    const swot = this.taskManager.swotAnalyses.find(
      (s) => s.id === this.taskManager.selectedSwotId,
    );
    if (!swot) return;

    swot[this.taskManager.swotItemQuadrant].push(text);

    try {
      await SwotAPI.update(this.taskManager.selectedSwotId, swot);
      this.closeItemModal();
      this.renderView(swot);
    } catch (error) {
      console.error("Error saving SWOT item:", error);
    }
  }

  async removeItem(quadrant, index) {
    if (!this.taskManager.selectedSwotId) return;
    const swot = this.taskManager.swotAnalyses.find(
      (s) => s.id === this.taskManager.selectedSwotId,
    );
    if (!swot) return;

    swot[quadrant].splice(index, 1);

    try {
      await SwotAPI.update(this.taskManager.selectedSwotId, swot);
      this.renderView(swot);
    } catch (error) {
      console.error("Error removing SWOT item:", error);
    }
  }

  bindEvents() {
    // View button
    document
      .getElementById("swotViewBtn")
      .addEventListener("click", () => {
        this.taskManager.switchView("swot");
        document.getElementById("viewSelectorDropdown")?.classList.add(
          "hidden",
        );
      });

    // Add SWOT button - opens sidenav
    document
      .getElementById("addSwotBtn")
      .addEventListener(
        "click",
        () => this.taskManager.swotSidenavModule.openNew(),
      );

    // Cancel SWOT modal
    document
      .getElementById("cancelSwotBtn")
      .addEventListener("click", () => this.closeModal());

    // SWOT form submission
    document
      .getElementById("swotForm")
      .addEventListener("submit", (e) => this.save(e));

    // Selector change
    document
      .getElementById("swotSelector")
      .addEventListener("change", (e) => this.select(e.target.value));

    // Edit and delete buttons
    document
      .getElementById("editSwotBtn")
      .addEventListener("click", () => this.editSelected());
    document
      .getElementById("deleteSwotBtn")
      .addEventListener("click", () => this.deleteSelected());

    // Item modal events
    document
      .getElementById("cancelSwotItemBtn")
      .addEventListener("click", () => this.closeItemModal());
    document
      .getElementById("swotItemForm")
      .addEventListener("submit", (e) => this.saveItem(e));

    // Add buttons for each quadrant
    document.querySelectorAll(".swot-add-btn").forEach((btn) => {
      btn.addEventListener(
        "click",
        () => this.openItemModal(btn.dataset.quadrant),
      );
    });

    // Close modals on background click
    document.getElementById("swotModal").addEventListener("click", (e) => {
      if (e.target.id === "swotModal") {
        this.closeModal();
      }
    });
    document.getElementById("swotItemModal").addEventListener("click", (e) => {
      if (e.target.id === "swotItemModal") {
        this.closeItemModal();
      }
    });
  }
}
