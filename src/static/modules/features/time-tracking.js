import { TimeTrackingAPI } from "../api.js";

/**
 * TimeTrackingModule - Handles time entry tracking for tasks
 */
export class TimeTrackingModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
  }

  async load() {
    try {
      this.taskManager.timeEntries = await TimeTrackingAPI.fetchAll();
      this.renderView();
    } catch (error) {
      console.error("Error loading time entries:", error);
    }
  }

  renderView() {
    const container = document.getElementById("timeTrackingContainer");
    const emptyState = document.getElementById("emptyTimeTrackingState");

    const allEntries = [];
    const taskIds = Object.keys(this.taskManager.timeEntries || {});

    for (const taskId of taskIds) {
      const entries = this.taskManager.timeEntries[taskId] || [];
      for (const entry of entries) {
        allEntries.push({ ...entry, taskId });
      }
    }

    if (allEntries.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      document.getElementById("globalTotalHours").textContent = "0";
      document.getElementById("weeklyHours").textContent = "0h";
      document.getElementById("monthlyHours").textContent = "0h";
      document.getElementById("hoursByPerson").textContent = "No data";
      return;
    }

    emptyState?.classList.add("hidden");

    // Calculate totals
    const totalHours = allEntries.reduce((sum, e) => sum + e.hours, 0);
    document.getElementById("globalTotalHours").textContent =
      totalHours.toFixed(1);

    // Weekly hours
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weeklyTotal = allEntries
      .filter((e) => new Date(e.date) >= weekStart)
      .reduce((sum, e) => sum + e.hours, 0);
    document.getElementById("weeklyHours").textContent =
      weeklyTotal.toFixed(1) + "h";

    // Monthly hours
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyTotal = allEntries
      .filter((e) => new Date(e.date) >= monthStart)
      .reduce((sum, e) => sum + e.hours, 0);
    document.getElementById("monthlyHours").textContent =
      monthlyTotal.toFixed(1) + "h";

    // Hours by person
    const byPerson = {};
    for (const entry of allEntries) {
      const person = entry.person || "Unassigned";
      byPerson[person] = (byPerson[person] || 0) + entry.hours;
    }
    const personList = Object.entries(byPerson)
      .map(([name, hours]) => `${name}: ${hours.toFixed(1)}h`)
      .join(", ");
    document.getElementById("hoursByPerson").textContent =
      personList || "No data";

    // Group entries by task
    const groupedByTask = {};
    for (const entry of allEntries) {
      if (!groupedByTask[entry.taskId]) {
        groupedByTask[entry.taskId] = [];
      }
      groupedByTask[entry.taskId].push(entry);
    }

    // Find task names
    const taskMap = {};
    const findTask = (tasks, id) => {
      for (const task of tasks) {
        if (task.id === id) return task;
        if (task.children) {
          const found = findTask(task.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    for (const taskId of Object.keys(groupedByTask)) {
      const task = findTask(this.taskManager.tasks, taskId);
      taskMap[taskId] = task?.title || taskId;
    }

    container.innerHTML = Object.entries(groupedByTask)
      .map(([taskId, entries]) => {
        const taskTotal = entries.reduce((sum, e) => sum + e.hours, 0);
        return `
      <div class="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
        <div class="px-4 py-3 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
          <span class="font-medium text-gray-900 dark:text-gray-100">${taskMap[taskId]}</span>
          <span class="text-sm text-gray-600 dark:text-gray-400">${taskTotal.toFixed(1)}h total</span>
        </div>
        <div class="divide-y divide-gray-100 dark:divide-gray-600">
          ${entries
            .map(
              (e) => `
            <div class="px-4 py-2 flex justify-between items-center text-sm">
              <div>
                <span class="text-gray-900 dark:text-gray-100">${e.date}</span>
                <span class="text-gray-500 dark:text-gray-400 ml-2">${e.hours}h</span>
                ${e.person ? `<span class="text-gray-400 dark:text-gray-500 ml-2">by ${e.person}</span>` : ""}
              </div>
              <div class="flex items-center gap-2">
                ${e.description ? `<span class="text-gray-500 dark:text-gray-400">${e.description}</span>` : ""}
                <button onclick="taskManager.deleteTimeEntryFromView('${taskId}', '${e.id}')" class="text-red-500 hover:text-red-700 text-xs">Delete</button>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
      })
      .join("");
  }

  async deleteFromView(taskId, entryId) {
    if (!confirm("Delete this time entry?")) return;
    try {
      await TimeTrackingAPI.delete(taskId, entryId);
      await this.load();
    } catch (error) {
      console.error("Error deleting time entry:", error);
    }
  }

  showForm() {
    document.getElementById("addTimeEntryForm").classList.remove("hidden");
    document.getElementById("timeEntryDate").value = new Date()
      .toISOString()
      .split("T")[0];
    document.getElementById("timeEntryHours").value = "";
    document.getElementById("timeEntryPerson").value = "";
    document.getElementById("timeEntryDescription").value = "";
  }

  hideForm() {
    document.getElementById("addTimeEntryForm").classList.add("hidden");
  }

  async save() {
    if (!this.taskManager.editingTask?.id) return;

    const date = document.getElementById("timeEntryDate").value;
    const hours = parseFloat(document.getElementById("timeEntryHours").value);
    const person = document.getElementById("timeEntryPerson").value.trim();
    const description = document
      .getElementById("timeEntryDescription")
      .value.trim();

    if (!date || !hours || hours <= 0) {
      alert("Please enter a valid date and hours");
      return;
    }

    try {
      await TimeTrackingAPI.create(this.taskManager.editingTask.id, {
        date,
        hours,
        person,
        description,
      });
      this.hideForm();
      await this.loadForTask(this.taskManager.editingTask.id);
    } catch (error) {
      console.error("Error saving time entry:", error);
    }
  }

  async loadForTask(taskId) {
    try {
      const entries = await TimeTrackingAPI.fetchForTask(taskId);
      this.renderForTask(entries);
    } catch (error) {
      console.error("Error loading task time entries:", error);
    }
  }

  renderForTask(entries) {
    const container = document.getElementById("timeEntriesList");
    const totalDisplay = document.getElementById("totalHoursValue");

    if (!entries || entries.length === 0) {
      container.innerHTML =
        '<div class="text-sm text-gray-500 dark:text-gray-400">No time entries yet</div>';
      totalDisplay.textContent = "0";
      return;
    }

    const total = entries.reduce((sum, e) => sum + e.hours, 0);
    totalDisplay.textContent = total.toFixed(1);

    container.innerHTML = entries
      .map(
        (e) => `
      <div class="flex justify-between items-center text-sm bg-gray-50 dark:bg-gray-700 rounded px-2 py-1">
        <div>
          <span>${e.date}</span>
          <span class="font-medium ml-2">${e.hours}h</span>
          ${e.person ? `<span class="text-gray-500 ml-2">by ${e.person}</span>` : ""}
        </div>
        <div class="flex items-center gap-2">
          ${e.description ? `<span class="text-gray-400 truncate max-w-32">${e.description}</span>` : ""}
          <button type="button" onclick="taskManager.deleteTaskTimeEntry('${e.id}')" class="text-red-500 hover:text-red-700">x</button>
        </div>
      </div>
    `,
      )
      .join("");
  }

  async deleteForTask(entryId) {
    if (!this.taskManager.editingTask?.id) return;
    try {
      await TimeTrackingAPI.delete(this.taskManager.editingTask.id, entryId);
      await this.loadForTask(this.taskManager.editingTask.id);
    } catch (error) {
      console.error("Error deleting time entry:", error);
    }
  }

  bindEvents() {
    // View button
    document
      .getElementById("timeTrackingViewBtn")
      .addEventListener("click", () => {
        this.taskManager.switchView("timeTracking");
        document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
      });

    // Add time entry button
    document
      .getElementById("addTimeEntryBtn")
      .addEventListener("click", () => this.showForm());

    // Cancel time entry
    document
      .getElementById("cancelTimeEntryBtn")
      .addEventListener("click", () => this.hideForm());

    // Save time entry
    document
      .getElementById("saveTimeEntryBtn")
      .addEventListener("click", () => this.save());
  }
}
