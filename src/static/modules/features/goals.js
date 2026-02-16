import { GoalsAPI, ProjectAPI } from "../api.js";

/**
 * GoalsModule - Handles goal CRUD and filtering
 */
export class GoalsModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
  }

  async load() {
    try {
      const projectInfo = await ProjectAPI.getInfo();
      this.taskManager.goals = projectInfo.goals || [];
      this.renderView();
    } catch (error) {
      console.error("Error loading goals:", error);
      this.taskManager.goals = [];
      this.renderView();
    }
  }

  renderView() {
    const container = document.getElementById("goalsContainer");
    const emptyState = document.getElementById("emptyGoalsState");

    const filteredGoals = this.getFiltered();

    if (filteredGoals.length === 0) {
      emptyState.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState.classList.add("hidden");

    container.innerHTML = filteredGoals
      .map(
        (goal) => `
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-6">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2">
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">${goal.title}</h3>
                            <span class="px-2 py-1 text-xs font-medium rounded-full ${this.getTypeStyle(goal.type)}">
                                ${goal.type}
                            </span>
                            <span class="px-2 py-1 text-xs font-medium rounded-full ${this.getStatusStyle(goal.status)}">
                                ${goal.status}
                            </span>
                        </div>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">${goal.description}</p>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <span class="font-medium text-gray-700 dark:text-gray-300">KPI:</span>
                                <span class="text-gray-600 dark:text-gray-400">${goal.kpi}</span>
                            </div>
                            <div>
                                <span class="font-medium text-gray-700 dark:text-gray-300">Start:</span>
                                <span class="text-gray-600 dark:text-gray-400">${goal.startDate}</span>
                            </div>
                            <div>
                                <span class="font-medium text-gray-700 dark:text-gray-300">End:</span>
                                <span class="text-gray-600 dark:text-gray-400">${goal.endDate}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex space-x-2 ml-4">
                        <button onclick="taskManager.goalSidenavModule.openEdit('${goal.id}')" class="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button onclick="taskManager.deleteGoal(${this.taskManager.goals.indexOf(goal)})" class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `,
      )
      .join("");
  }

  getFiltered() {
    if (this.taskManager.currentGoalFilter === "all") {
      return this.taskManager.goals;
    }
    return this.taskManager.goals.filter(
      (goal) => goal.type === this.taskManager.currentGoalFilter,
    );
  }

  getTypeStyle(type) {
    return type === "enterprise"
      ? "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900"
      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600";
  }

  getStatusStyle(status) {
    const styles = {
      planning:
        "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
      "on-track":
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      "at-risk":
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      late: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      success:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
      failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return styles[status] || styles["planning"];
  }

  filter(type) {
    this.taskManager.currentGoalFilter = type;

    // Update filter button styles
    const filters = [
      "allGoalsFilter",
      "enterpriseGoalsFilter",
      "projectGoalsFilter",
    ];
    filters.forEach((filterId) => {
      const btn = document.getElementById(filterId);
      if (
        (filterId === "allGoalsFilter" && type === "all") ||
        (filterId === "enterpriseGoalsFilter" && type === "enterprise") ||
        (filterId === "projectGoalsFilter" && type === "project")
      ) {
        btn.className =
          "px-3 py-1 rounded-md text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600";
      } else {
        btn.className =
          "px-3 py-1 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100";
      }
    });

    this.renderView();
  }

  openModal() {
    this.taskManager.editingGoal = null;
    document.getElementById("goalModalTitle").textContent = "Add Goal";
    document.getElementById("goalTitle").value = "";
    document.getElementById("goalType").value = "project";
    document.getElementById("goalStatus").value = "planning";
    document.getElementById("goalKpi").value = "";
    document.getElementById("goalStartDate").value = "";
    document.getElementById("goalEndDate").value = "";
    document.getElementById("goalDescription").value = "";
    document.getElementById("goalModal").classList.remove("hidden");
    document.getElementById("goalModal").classList.add("flex");
  }

  closeModal() {
    document.getElementById("goalModal").classList.add("hidden");
    document.getElementById("goalModal").classList.remove("flex");
  }

  async handleSubmit(e) {
    e.preventDefault();

    const goalData = {
      title: document.getElementById("goalTitle").value,
      type: document.getElementById("goalType").value,
      status: document.getElementById("goalStatus").value,
      kpi: document.getElementById("goalKpi").value,
      startDate: document.getElementById("goalStartDate").value,
      endDate: document.getElementById("goalEndDate").value,
      description: document.getElementById("goalDescription").value,
    };

    try {
      if (this.taskManager.editingGoal !== null) {
        // Update existing goal using backend ID
        const goal = this.taskManager.goals[this.taskManager.editingGoal];
        await GoalsAPI.update(goal.id, goalData);
      } else {
        // Create new goal
        await GoalsAPI.create(goalData);
      }

      this.closeModal();
      await this.load();
      // Force re-render with current filter
      this.renderView();
    } catch (error) {
      console.error("Error saving goal:", error);
    }
  }

  edit(goalIndex) {
    const goal = this.taskManager.goals[goalIndex];
    if (!goal) return;

    this.taskManager.editingGoal = goalIndex;
    document.getElementById("goalModalTitle").textContent = "Edit Goal";
    document.getElementById("goalTitle").value = goal.title;
    document.getElementById("goalType").value = goal.type;
    document.getElementById("goalStatus").value = goal.status;
    document.getElementById("goalKpi").value = goal.kpi;
    document.getElementById("goalStartDate").value = goal.startDate;
    document.getElementById("goalEndDate").value = goal.endDate;
    document.getElementById("goalDescription").value = goal.description;
    document.getElementById("goalModal").classList.remove("hidden");
    document.getElementById("goalModal").classList.add("flex");
  }

  async delete(goalIndex) {
    if (!confirm("Are you sure you want to delete this goal?")) return;

    try {
      const goal = this.taskManager.goals[goalIndex];
      await GoalsAPI.delete(goal.id);
      await this.load();
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
  }

  bindEvents() {
    // Add goal button - opens sidenav
    document
      .getElementById("addGoalBtn")
      .addEventListener("click", () => this.taskManager.goalSidenavModule.openNew());

    // Cancel goal modal
    document
      .getElementById("cancelGoalBtn")
      .addEventListener("click", () => this.closeModal());

    // Goal form submission
    document
      .getElementById("goalForm")
      .addEventListener("submit", (e) => this.handleSubmit(e));

    // Goal filters
    document
      .getElementById("allGoalsFilter")
      .addEventListener("click", () => this.filter("all"));
    document
      .getElementById("enterpriseGoalsFilter")
      .addEventListener("click", () => this.filter("enterprise"));
    document
      .getElementById("projectGoalsFilter")
      .addEventListener("click", () => this.filter("project"));

    // Close modal on background click
    document.getElementById("goalModal").addEventListener("click", (e) => {
      if (e.target.id === "goalModal") {
        this.closeModal();
      }
    });
  }
}
