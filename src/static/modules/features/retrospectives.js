import { RetrospectivesAPI } from "../api.js";

/**
 * RetrospectivesModule - Handles retrospective CRUD (Continue/Stop/Start format)
 */
export class RetrospectivesModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
  }

  async load() {
    try {
      this.taskManager.retrospectives = await RetrospectivesAPI.fetchAll();
      this.renderView();
    } catch (error) {
      console.error("Error loading retrospectives:", error);
    }
  }

  renderView() {
    const container = document.getElementById("retrospectivesContainer");
    const emptyState = document.getElementById("emptyRetrospectivesState");

    if (
      !this.taskManager.retrospectives ||
      this.taskManager.retrospectives.length === 0
    ) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");
    container.innerHTML = this.taskManager.retrospectives
      .map((retro) => {
        const statusColor =
          retro.status === "open"
            ? "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600"
            : "bg-gray-900 text-white dark:bg-gray-600 dark:text-white";
        return `
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden">
        <div class="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
          <div>
            <h3 class="font-medium text-gray-900 dark:text-gray-100">${retro.title}</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">${retro.date}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-1 text-xs rounded-full ${statusColor}">${retro.status}</span>
            <button onclick="taskManager.openRetrospectiveModal('${retro.id}')" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Edit</button>
          </div>
        </div>
        <div class="p-4 space-y-3">
          <div>
            <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Continue</h4>
            <ul class="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              ${retro.continue.length > 0 ? retro.continue.map((item) => `<li class="flex items-start"><span class="text-gray-900 dark:text-gray-100 mr-2">+</span>${item}</li>`).join("") : '<li class="text-gray-400 italic">No items</li>'}
            </ul>
          </div>
          <div>
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stop</h4>
            <ul class="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              ${retro.stop.length > 0 ? retro.stop.map((item) => `<li class="flex items-start"><span class="text-gray-500 dark:text-gray-400 mr-2">-</span>${item}</li>`).join("") : '<li class="text-gray-400 dark:text-gray-500 italic">No items</li>'}
            </ul>
          </div>
          <div>
            <h4 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Start</h4>
            <ul class="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              ${retro.start.length > 0 ? retro.start.map((item) => `<li class="flex items-start"><span class="text-gray-400 dark:text-gray-500 mr-2">*</span>${item}</li>`).join("") : '<li class="text-gray-400 dark:text-gray-500 italic">No items</li>'}
            </ul>
          </div>
        </div>
        <div class="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600 flex justify-end">
          <button onclick="taskManager.deleteRetrospective('${retro.id}')" class="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">Delete</button>
        </div>
      </div>
    `;
      })
      .join("");
  }

  openModal(id = null) {
    this.taskManager.editingRetrospectiveId = id;
    const modal = document.getElementById("retrospectiveModal");
    const title = document.getElementById("retrospectiveModalTitle");
    const form = document.getElementById("retrospectiveForm");

    form.reset();
    document.getElementById("retrospectiveDate").value = new Date()
      .toISOString()
      .split("T")[0];

    if (id) {
      title.textContent = "Edit Retrospective";
      const retro = this.taskManager.retrospectives.find((r) => r.id === id);
      if (retro) {
        document.getElementById("retrospectiveTitle").value = retro.title;
        document.getElementById("retrospectiveDate").value = retro.date;
        document.getElementById("retrospectiveStatus").value = retro.status;
        document.getElementById("retrospectiveContinue").value =
          retro.continue.join("\n");
        document.getElementById("retrospectiveStop").value =
          retro.stop.join("\n");
        document.getElementById("retrospectiveStart").value =
          retro.start.join("\n");
      }
    } else {
      title.textContent = "Add Retrospective";
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closeModal() {
    const modal = document.getElementById("retrospectiveModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.taskManager.editingRetrospectiveId = null;
  }

  async save(e) {
    e.preventDefault();
    const parseItems = (text) =>
      text
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s);
    const data = {
      title: document.getElementById("retrospectiveTitle").value,
      date: document.getElementById("retrospectiveDate").value,
      status: document.getElementById("retrospectiveStatus").value,
      continue: parseItems(
        document.getElementById("retrospectiveContinue").value,
      ),
      stop: parseItems(document.getElementById("retrospectiveStop").value),
      start: parseItems(document.getElementById("retrospectiveStart").value),
    };

    try {
      if (this.taskManager.editingRetrospectiveId) {
        await RetrospectivesAPI.update(
          this.taskManager.editingRetrospectiveId,
          data,
        );
      } else {
        await RetrospectivesAPI.create(data);
      }
      this.closeModal();
      await this.load();
    } catch (error) {
      console.error("Error saving retrospective:", error);
    }
  }

  async delete(id) {
    if (!confirm("Delete this retrospective?")) return;
    try {
      await RetrospectivesAPI.delete(id);
      await this.load();
    } catch (error) {
      console.error("Error deleting retrospective:", error);
    }
  }

  bindEvents() {
    // View button
    document
      .getElementById("retrospectivesViewBtn")
      .addEventListener("click", () => {
        this.taskManager.switchView("retrospectives");
        document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
      });

    // Add retrospective button
    document
      .getElementById("addRetrospectiveBtn")
      .addEventListener("click", () => this.openModal());

    // Cancel retrospective modal
    document
      .getElementById("cancelRetrospectiveBtn")
      .addEventListener("click", () => this.closeModal());

    // Retrospective form submission
    document
      .getElementById("retrospectiveForm")
      .addEventListener("submit", (e) => this.save(e));

    // Close modal on background click
    document.getElementById("retrospectiveModal").addEventListener("click", (e) => {
      if (e.target.id === "retrospectiveModal") {
        this.closeModal();
      }
    });
  }
}
