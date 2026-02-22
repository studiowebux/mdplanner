import { MilestonesAPI } from "../api.js";

/**
 * MilestonesModule - Handles milestone CRUD operations
 */
export class MilestonesModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
  }

  async load() {
    try {
      this.taskManager.milestones = await MilestonesAPI.fetchAll();
      this.renderView();
    } catch (error) {
      console.error("Error loading milestones:", error);
    }
  }

  renderView() {
    const container = document.getElementById("milestonesContainer");
    const emptyState = document.getElementById("emptyMilestonesState");

    if (
      !this.taskManager.milestones ||
      this.taskManager.milestones.length === 0
    ) {
      emptyState.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState.classList.add("hidden");
    container.innerHTML = this.taskManager.milestones
      .map(
        (m) => `
      <div class="bg-secondary rounded-lg p-4 border border-default">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-medium text-primary">${m.name}</h3>
          <span class="px-2 py-1 text-xs rounded ${
          m.status === "completed"
            ? "bg-inverse text-inverse"
            : "bg-tertiary text-primary border border-default"
        }">${m.status}</span>
        </div>
        ${
          m.target
            ? `<p class="text-sm text-muted mb-2">Target: ${
              new Date(m.target).toLocaleDateString()
            }</p>`
            : ""
        }
        <div class="mb-2">
          <div class="flex justify-between text-xs text-muted mb-1">
            <span>${m.completedCount}/${m.taskCount} tasks</span>
            <span>${m.progress}%</span>
          </div>
          <div class="w-full bg-active rounded-full h-2">
            <div class="bg-inverse h-2 rounded-full" style="width: ${m.progress}%"></div>
          </div>
        </div>
        ${
          m.description
            ? `<p class="text-sm text-secondary mt-2">${m.description}</p>`
            : ""
        }
        <div class="flex justify-end space-x-2 mt-3">
          <button onclick="taskManager.milestoneSidenavModule.openEdit('${m.id}')" class="text-sm text-secondary hover:text-primary">Edit</button>
          <button onclick="taskManager.deleteMilestone('${m.id}')" class="text-sm text-error hover:text-error-text">Delete</button>
        </div>
      </div>
    `,
      )
      .join("");
  }

  openModal(id = null) {
    this.taskManager.editingMilestoneId = id;
    const modal = document.getElementById("milestoneModal");
    const title = document.getElementById("milestoneModalTitle");
    const form = document.getElementById("milestoneForm");

    form.reset();
    title.textContent = id ? "Edit Milestone" : "Add Milestone";

    if (id && this.taskManager.milestones) {
      const m = this.taskManager.milestones.find((x) => x.id === id);
      if (m) {
        document.getElementById("milestoneName").value = m.name;
        document.getElementById("milestoneTarget").value = m.target || "";
        document.getElementById("milestoneStatus").value = m.status;
        document.getElementById("milestoneDescription").value = m.description ||
          "";
      }
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closeModal() {
    const modal = document.getElementById("milestoneModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.taskManager.editingMilestoneId = null;
  }

  async save(e) {
    e.preventDefault();
    const data = {
      name: document.getElementById("milestoneName").value,
      target: document.getElementById("milestoneTarget").value || null,
      status: document.getElementById("milestoneStatus").value,
      description: document.getElementById("milestoneDescription").value ||
        null,
    };

    try {
      if (this.taskManager.editingMilestoneId) {
        await MilestonesAPI.update(this.taskManager.editingMilestoneId, data);
      } else {
        await MilestonesAPI.create(data);
      }
      this.closeModal();
      await this.load();
    } catch (error) {
      console.error("Error saving milestone:", error);
    }
  }

  async delete(id) {
    if (!confirm("Delete this milestone?")) return;
    try {
      await MilestonesAPI.delete(id);
      await this.load();
    } catch (error) {
      console.error("Error deleting milestone:", error);
    }
  }

  bindEvents() {
    // View button
    document
      .getElementById("milestonesViewBtn")
      .addEventListener(
        "click",
        () => this.taskManager.switchView("milestones"),
      );

    // Add milestone button - opens sidenav
    document
      .getElementById("addMilestoneBtn")
      .addEventListener(
        "click",
        () => this.taskManager.milestoneSidenavModule.openNew(),
      );

    // Cancel milestone modal
    document
      .getElementById("cancelMilestoneBtn")
      .addEventListener("click", () => this.closeModal());

    // Milestone form submission
    document
      .getElementById("milestoneForm")
      .addEventListener("submit", (e) => this.save(e));

    // Close modal on background click
    document.getElementById("milestoneModal").addEventListener("click", (e) => {
      if (e.target.id === "milestoneModal") {
        this.closeModal();
      }
    });
  }
}
