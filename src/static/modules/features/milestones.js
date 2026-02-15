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
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-medium text-gray-900 dark:text-gray-100">${m.name}</h3>
          <span class="px-2 py-1 text-xs rounded ${m.status === "completed" ? "bg-gray-900 text-white dark:bg-gray-600 dark:text-white" : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600"}">${m.status}</span>
        </div>
        ${m.target ? `<p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Target: ${new Date(m.target).toLocaleDateString()}</p>` : ""}
        <div class="mb-2">
          <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>${m.completedCount}/${m.taskCount} tasks</span>
            <span>${m.progress}%</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div class="bg-gray-900 dark:bg-gray-100 h-2 rounded-full" style="width: ${m.progress}%"></div>
          </div>
        </div>
        ${m.description ? `<p class="text-sm text-gray-600 dark:text-gray-300 mt-2">${m.description}</p>` : ""}
        <div class="flex justify-end space-x-2 mt-3">
          <button onclick="taskManager.openMilestoneModal('${m.id}')" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Edit</button>
          <button onclick="taskManager.deleteMilestone('${m.id}')" class="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">Delete</button>
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
        document.getElementById("milestoneDescription").value =
          m.description || "";
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
      description:
        document.getElementById("milestoneDescription").value || null,
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
      .addEventListener("click", () => this.taskManager.switchView("milestones"));

    // Add milestone button
    document
      .getElementById("addMilestoneBtn")
      .addEventListener("click", () => this.openModal());

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
