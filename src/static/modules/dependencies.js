// Dependencies Module - Task dependency autocomplete and management

/**
 * Task dependency autocomplete - blocked_by field management
 */
export class DependenciesModule {
  /** @param {TaskManager} taskManager */
  constructor(taskManager) {
    this.tm = taskManager;
  }

  bindEvents() {
    const input = document.getElementById("taskBlockedBy");
    if (input) {
      input.addEventListener("input", (e) => this.handleInput(e));
      input.addEventListener("keydown", (e) => this.handleKeydown(e));
    }
    document.addEventListener("click", (e) => this.handleDocumentClick(e));
  }

  handleInput(e) {
    const input = e.target;
    const dropdown = document.getElementById("dependencyDropdown");
    const searchTerm = input.value.toLowerCase();

    if (searchTerm.length === 0) {
      dropdown.classList.add("hidden");
      return;
    }

    // Get all available tasks (excluding current task and already selected)
    const allTasks = [];
    const collectTasks = (tasks) => {
      for (const task of tasks) {
        if (
          task.id !== this.tm.editingTask?.id &&
          !this.tm.selectedDependencies.includes(task.id)
        ) {
          allTasks.push(task);
        }
        if (task.children && task.children.length > 0) {
          collectTasks(task.children);
        }
      }
    };
    collectTasks(this.tm.tasks);

    // Filter tasks based on search term
    const filteredTasks = allTasks.filter(
      (task) =>
        task.title.toLowerCase().includes(searchTerm) ||
        task.id.toLowerCase().includes(searchTerm),
    );

    // Populate dropdown
    dropdown.innerHTML = "";
    if (filteredTasks.length > 0) {
      filteredTasks.forEach((task) => {
        const option = document.createElement("div");
        option.className =
          "px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 border-b border-gray-100 dark:border-gray-600 last:border-b-0";
        option.innerHTML = `
          <div class="font-medium text-gray-900 dark:text-gray-100">${task.title}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">${task.id} - ${task.section}</div>
        `;
        option.addEventListener("click", () => {
          this.add(task.id);
          input.value = "";
          dropdown.classList.add("hidden");
        });
        dropdown.appendChild(option);
      });
      dropdown.classList.remove("hidden");
    } else {
      dropdown.classList.add("hidden");
    }
  }

  handleKeydown(e) {
    const dropdown = document.getElementById("dependencyDropdown");
    if (e.key === "Escape") {
      dropdown.classList.add("hidden");
      e.target.value = "";
    }
  }

  handleDocumentClick(e) {
    const dropdown = document.getElementById("dependencyDropdown");
    const input = document.getElementById("taskBlockedBy");
    if (dropdown && input && !dropdown.contains(e.target) && e.target !== input) {
      dropdown.classList.add("hidden");
    }
  }

  add(taskId) {
    if (!this.tm.selectedDependencies.includes(taskId)) {
      this.tm.selectedDependencies.push(taskId);
      this.updateSelected();
    }
  }

  remove(taskId) {
    this.tm.selectedDependencies = this.tm.selectedDependencies.filter(
      (id) => id !== taskId,
    );
    this.updateSelected();
  }

  updateSelected() {
    const container = document.getElementById("selectedDependencies");
    if (!container) return;

    container.innerHTML = "";

    this.tm.selectedDependencies.forEach((taskId) => {
      const task = this.tm.tasksModule.findById(taskId);
      const chip = document.createElement("div");
      chip.className =
        "inline-flex items-center px-2 py-1 rounded-full text-xs border border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
      chip.innerHTML = `
        <span>${task ? task.title : taskId}</span>
        <button type="button" class="ml-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200" onclick="taskManager.dependenciesModule.remove('${taskId}')">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      `;
      container.appendChild(chip);
    });
  }
}
