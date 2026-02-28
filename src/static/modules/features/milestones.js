import { MilestonesAPI } from "../api.js";
import { markdownToHtml } from "../utils.js";

/**
 * MilestonesModule - Handles milestone CRUD operations
 */
export class MilestonesModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
    this.currentView = localStorage.getItem("milestonesView") || "table";
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
    const toggle = document.getElementById("milestoneViewToggle");

    if (toggle) toggle.textContent = this.currentView === "table" ? "Card view" : "Table view";

    if (
      !this.taskManager.milestones ||
      this.taskManager.milestones.length === 0
    ) {
      emptyState.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState.classList.add("hidden");

    if (this.currentView === "table") {
      this._renderTable(container);
    } else {
      this._renderCards(container);
    }
  }

  _renderTable(container) {
    container.className = "milestones-table-wrap";
    const rows = this.taskManager.milestones.map((m) => {
      const statusClass = m.status === "completed"
        ? "milestone-status-completed"
        : m.status === "at-risk"
        ? "milestone-status-risk"
        : "milestone-status-active";
      return `
        <tr class="milestones-tr">
          <td class="milestones-td milestones-td-name">${m.name}</td>
          <td class="milestones-td">
            <span class="milestone-status-badge ${statusClass}">${m.status}</span>
          </td>
          <td class="milestones-td">${
        m.target ? new Date(m.target).toLocaleDateString() : "—"
      }</td>
          <td class="milestones-td">
            <div class="milestones-progress-wrap">
              <div class="milestones-progress-bar">
                <div class="milestones-progress-fill" style="width:${m.progress}%"></div>
              </div>
              <span class="milestones-progress-label">${m.progress}%</span>
            </div>
          </td>
          <td class="milestones-td milestones-td-tasks">${m.completedCount}/${m.taskCount}</td>
          <td class="milestones-td milestones-td-actions">
            <button type="button"
                    onclick="taskManager.milestoneSidenavModule.openEdit('${m.id}')"
                    class="btn-ghost">Edit</button>
            <button type="button"
                    onclick="taskManager.deleteMilestone('${m.id}')"
                    class="btn-danger-ghost">Delete</button>
          </td>
        </tr>
      `;
    }).join("");

    container.innerHTML = `
      <table class="milestones-table">
        <thead>
          <tr>
            <th class="milestones-th">Name</th>
            <th class="milestones-th">Status</th>
            <th class="milestones-th">Target</th>
            <th class="milestones-th">Progress</th>
            <th class="milestones-th">Tasks</th>
            <th class="milestones-th"></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  _renderCards(container) {
    container.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";
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
            ? `<div class="mt-2">${markdownToHtml(m.description)}</div>`
            : ""
        }
        <div class="flex justify-end gap-1 mt-3">
          <button type="button" onclick="taskManager.milestoneSidenavModule.openEdit('${m.id}')" class="btn-ghost">Edit</button>
          <button type="button" onclick="taskManager.deleteMilestone('${m.id}')" class="btn-danger-ghost">Delete</button>
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
    document
      .getElementById("milestonesViewBtn")
      .addEventListener(
        "click",
        () => this.taskManager.switchView("milestones"),
      );

    document
      .getElementById("addMilestoneBtn")
      .addEventListener(
        "click",
        () => this.taskManager.milestoneSidenavModule.openNew(),
      );

    document.getElementById("milestoneViewToggle")?.addEventListener(
      "click",
      () => {
        this.currentView = this.currentView === "table" ? "card" : "table";
        localStorage.setItem("milestonesView", this.currentView);
        this.renderView();
      },
    );

    document
      .getElementById("cancelMilestoneBtn")
      .addEventListener("click", () => this.closeModal());

    document
      .getElementById("milestoneForm")
      .addEventListener("submit", (e) => this.save(e));

    document.getElementById("milestoneModal").addEventListener("click", (e) => {
      if (e.target.id === "milestoneModal") this.closeModal();
    });
  }
}
