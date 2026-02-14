// Timeline View Module
import { getPriorityColor } from '../utils.js';

/**
 * Gantt chart view - task scheduling based on effort and dependencies
 */
export class TimelineView {
  /** @param {TaskManager} taskManager */
  constructor(taskManager) {
    this.tm = taskManager;
  }

  async render() {
    await this.tm.loadProjectConfig();
    this.updateConfig();
    this.generate();
  }

  updateConfig() {
    // Show read-only config in timeline view
    document.getElementById("timelineStartDate").value =
      this.tm.projectConfig?.startDate || "";
    document.getElementById("timelineWorkingDays").value =
      this.tm.projectConfig?.workingDaysPerWeek || 5;
  }

  async updateWorkingDays(workingDays) {
    if (this.tm.projectConfig) {
      this.tm.projectConfig.workingDaysPerWeek = workingDays;
      // Update both UI fields to keep them in sync
      document.getElementById("workingDays").value = workingDays;
      document.getElementById("timelineWorkingDays").value = workingDays;
      await this.tm.saveProjectConfig();
      this.generate(); // Refresh timeline with new working days
    }
  }

  generate() {
    const timelineContent = document.getElementById("timelineContent");

    if (!this.tm.projectConfig || !this.tm.projectConfig.startDate) {
      timelineContent.innerHTML =
        '<div class="text-center text-gray-500 dark:text-gray-400 py-8">Please configure project start date first</div>';
      return;
    }

    // Count tasks without effort numbers
    const tasksWithoutEffort = this.getTasksWithoutEffort();

    // Calculate task scheduling based on dependencies and effort
    const scheduledTasks = this.calculateTaskSchedule();

    let html = '<div class="timeline-chart">';

    // Add warning banner if there are tasks without effort
    if (tasksWithoutEffort.length > 0) {
      html +=
        '<div class="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">';
      html += '<div class="flex items-center">';
      html +=
        '<svg class="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">';
      html +=
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"></path>';
      html += "</svg>";
      html += `<span class="text-sm font-medium text-yellow-800 dark:text-yellow-200">${tasksWithoutEffort.length} task${tasksWithoutEffort.length !== 1 ? "s" : ""} without effort estimates (not shown in timeline)</span>`;
      html += "</div>";
      html += '<div class="mt-2 text-xs text-yellow-700 dark:text-yellow-300">';
      html +=
        "Tasks missing effort: " +
        tasksWithoutEffort.map((t) => `${t.title} (${t.id})`).join(", ");
      html += "</div>";
      html += "</div>";
    }

    if (scheduledTasks.length === 0) {
      html +=
        '<div class="text-center text-gray-500 dark:text-gray-400 py-8">No tasks with effort estimates found</div>';
    } else {
      html += this.generateHeader(scheduledTasks);
      html += this.generateRows(scheduledTasks);
    }

    html += "</div>";

    timelineContent.innerHTML = html;
  }

  getTasksWithoutEffort() {
    const tasksWithoutEffort = [];

    const collectTasks = (tasks) => {
      for (const task of tasks) {
        if (!task.config.effort || task.config.effort <= 0) {
          tasksWithoutEffort.push(task);
        }
        if (task.children && task.children.length > 0) {
          collectTasks(task.children);
        }
      }
    };

    collectTasks(this.tm.tasks);
    return tasksWithoutEffort;
  }

  calculateTaskSchedule() {
    const allTasks = [];

    // Collect all tasks with effort estimates
    const collectTasks = (tasks) => {
      for (const task of tasks) {
        if (task.config.effort && task.config.effort > 0 && !task.completed) {
          allTasks.push(task);
        }
        if (task.children && task.children.length > 0) {
          collectTasks(task.children);
        }
      }
    };

    collectTasks(this.tm.tasks);

    const scheduled = new Map(); // taskId -> scheduled task
    const projectStartDate = new Date(this.tm.projectConfig.startDate);

    // Recursive function to calculate start date for a task
    const calculateTaskStartDate = (task) => {
      if (scheduled.has(task.id)) {
        return scheduled.get(task.id);
      }

      const blockedBy = task.config.blocked_by || [];
      let taskStartDate = new Date(projectStartDate);

      if (blockedBy.length > 0) {
        // Find the latest end date among all blocking tasks that are still incomplete
        let latestEndDate = new Date(projectStartDate);
        let hasIncompleteDependencies = false;

        for (const depId of blockedBy) {
          // Find dependency in incomplete tasks with effort
          const depTask = allTasks.find((t) => t.id === depId);
          if (depTask && depTask.config.effort > 0) {
            hasIncompleteDependencies = true;
            const depScheduled = calculateTaskStartDate(depTask);
            if (depScheduled.endDate > latestEndDate) {
              latestEndDate = new Date(depScheduled.endDate);
            }
          }
          // Note: Completed dependencies are automatically ignored since they're not in allTasks
        }

        // Only adjust start date if there are still incomplete dependencies
        if (hasIncompleteDependencies) {
          // Start this task the day after the latest blocking task ends
          taskStartDate = new Date(latestEndDate);
          taskStartDate.setDate(taskStartDate.getDate() + 1);
        }
        // If all dependencies are completed, task starts at project start date (taskStartDate remains unchanged)
      }

      // Handle tasks with no effort but due dates
      let endDate;
      let duration;
      if (!task.config.effort || task.config.effort === 0) {
        if (task.config.due_date) {
          endDate = new Date(task.config.due_date);
          taskStartDate = new Date(task.config.due_date);
          duration = 0;
        } else {
          endDate = new Date(taskStartDate);
          duration = 0;
        }
      } else {
        endDate = this.addWorkingDays(taskStartDate, task.config.effort);
        duration = task.config.effort;
      }

      const scheduledTask = {
        ...task,
        startDate: taskStartDate,
        endDate,
        duration,
        blockedBy: blockedBy,
        isDueDateOnly: !task.config.effort || task.config.effort === 0,
      };

      scheduled.set(task.id, scheduledTask);
      return scheduledTask;
    };

    // Calculate schedule for all tasks
    const result = [];
    for (const task of allTasks) {
      result.push(calculateTaskStartDate(task));
    }

    // Sort to group dependencies visually
    return this.sortTasksForVisualGrouping(result);
  }

  sortTasksForVisualGrouping(tasks) {
    // Create a dependency map to understand relationships
    const dependencyMap = new Map(); // taskId -> array of tasks that depend on it
    const dependentMap = new Map(); // taskId -> array of tasks this task depends on

    // Build dependency relationships
    tasks.forEach((task) => {
      dependentMap.set(task.id, task.config.blocked_by || []);

      // For each dependency, add this task to its dependents list
      (task.config.blocked_by || []).forEach((depId) => {
        if (!dependencyMap.has(depId)) {
          dependencyMap.set(depId, []);
        }
        dependencyMap.get(depId).push(task.id);
      });
    });

    // Create groups of related tasks
    const groups = [];
    const processed = new Set();

    tasks.forEach((task) => {
      if (processed.has(task.id)) return;

      // Start a new dependency chain
      const group = [];
      const toProcess = [task.id];
      const groupSet = new Set();

      while (toProcess.length > 0) {
        const currentId = toProcess.pop();
        if (groupSet.has(currentId)) continue;

        groupSet.add(currentId);
        const currentTask = tasks.find((t) => t.id === currentId);
        if (currentTask) {
          group.push(currentTask);
          processed.add(currentId);

          // Add dependencies and dependents to the same group
          const deps = dependentMap.get(currentId) || [];
          const dependents = dependencyMap.get(currentId) || [];

          deps.forEach((depId) => {
            if (!groupSet.has(depId)) toProcess.push(depId);
          });
          dependents.forEach((depId) => {
            if (!groupSet.has(depId)) toProcess.push(depId);
          });
        }
      }

      // Sort group by start date and dependency order
      group.sort((a, b) => {
        // First sort by start date
        const dateCompare = a.startDate - b.startDate;
        if (dateCompare !== 0) return dateCompare;

        // If same start date, put dependencies before dependents
        if (a.config.blocked_by && a.config.blocked_by.includes(b.id)) return 1;
        if (b.config.blocked_by && b.config.blocked_by.includes(a.id))
          return -1;

        return 0;
      });

      groups.push(group);
    });

    // Sort groups by earliest start date in each group
    groups.sort((a, b) => {
      const minDateA = Math.min(...a.map((t) => t.startDate));
      const minDateB = Math.min(...b.map((t) => t.startDate));
      return minDateA - minDateB;
    });

    // Flatten groups back into a single array
    return groups.flat();
  }

  addWorkingDays(startDate, days) {
    const result = new Date(startDate);
    const workingDaysPerWeek = this.tm.projectConfig.workingDaysPerWeek || 5;
    let addedDays = 0;

    while (addedDays < days) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();

      // Count working days based on configuration
      if (
        workingDaysPerWeek === 7 ||
        (workingDaysPerWeek === 6 && dayOfWeek !== 0) ||
        (workingDaysPerWeek === 5 && dayOfWeek !== 0 && dayOfWeek !== 6)
      ) {
        addedDays++;
      }
    }

    return result;
  }

  generateHeader(scheduledTasks) {
    if (scheduledTasks.length === 0) return "";

    const startDate = new Date(
      Math.min(...scheduledTasks.map((t) => t.startDate)),
    );
    const endDate = new Date(Math.max(...scheduledTasks.map((t) => t.endDate)));

    let html =
      '<div class="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">';
    html +=
      '<div class="w-48 p-3 font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700">Task</div>';
    html += '<div class="flex-1 p-3">';
    html +=
      '<div class="flex justify-between text-sm text-gray-600 dark:text-gray-400">';
    html += `<span>Start: ${startDate.toLocaleDateString()}</span>`;
    html += `<span>End: ${endDate.toLocaleDateString()}</span>`;
    html += "</div>";
    html += "</div>";
    html += "</div>";

    return html;
  }

  generateRows(scheduledTasks) {
    if (scheduledTasks.length === 0) return "";

    const projectStart = new Date(
      Math.min(...scheduledTasks.map((t) => t.startDate)),
    );
    const projectEnd = new Date(
      Math.max(...scheduledTasks.map((t) => t.endDate)),
    );
    const totalDays =
      Math.ceil((projectEnd - projectStart) / (1000 * 60 * 60 * 24)) + 1;

    let html = "";

    scheduledTasks.forEach((task) => {
      const startOffset = Math.ceil(
        (task.startDate - projectStart) / (1000 * 60 * 60 * 24),
      );
      const duration =
        Math.ceil((task.endDate - task.startDate) / (1000 * 60 * 60 * 24)) + 1;
      const widthPercent = (duration / totalDays) * 100;
      const leftPercent = (startOffset / totalDays) * 100;

      const priorityColor = getPriorityColor(task.config.priority);

      // Check if task is overdue
      const isOverdue =
        task.config.due_date && task.endDate > new Date(task.config.due_date);
      const taskBarColor = isOverdue ? "red" : priorityColor;

      html +=
        '<div class="flex border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">';
      html += `<div class="w-48 p-3 border-r border-gray-200 dark:border-gray-700">`;
      html += `<div class="font-medium text-gray-900 dark:text-gray-100 text-sm">${task.title}</div>`;
      html += `<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">ID: ${task.id}</div>`;
      html += `<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">`;
      html += `${task.config.effort} days • ${task.section}`;
      if (task.config.due_date) {
        const dueDate = new Date(task.config.due_date);
        const isOverdue = task.endDate > dueDate;
        html += ` • Due: ${dueDate.toLocaleDateString()}`;
        if (isOverdue) {
          html += ` <span class="text-red-600 dark:text-red-400 font-medium inline-flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> OVERDUE</span>`;
        }
      }
      if (task.config.blocked_by && task.config.blocked_by.length > 0) {
        html += ` • Blocked by: ${task.config.blocked_by.join(", ")}`;
      }
      html += `</div>`;
      html += `</div>`;
      html += `<div class="flex-1 p-3 relative">`;

      // Add dependency arrows if task is blocked
      if (task.config.blocked_by && task.config.blocked_by.length > 0) {
        task.config.blocked_by.forEach((depId) => {
          const depTask = scheduledTasks.find((t) => t.id === depId);
          if (depTask) {
            const depEndOffset = Math.ceil(
              (depTask.endDate - projectStart) / (1000 * 60 * 60 * 24),
            );
            const depEndPercent = (depEndOffset / totalDays) * 100;

            // Draw arrow from dependency end to task start
            const arrowLength = leftPercent - depEndPercent;
            if (arrowLength > 0) {
              html += `<div class="absolute h-0.5 bg-red-400 dark:bg-red-500" style="left: ${depEndPercent}%; width: ${arrowLength}%; top: 50%; z-index: 10;">`;
              html += `<div class="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1">`;
              html += `<svg class="w-3 h-3 text-red-400 dark:text-red-500" fill="currentColor" viewBox="0 0 20 20">`;
              html += `<path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path>`;
              html += `</svg>`;
              html += `</div>`;
              html += `<div class="absolute left-1/2 -top-5 transform -translate-x-1/2 text-xs text-red-600 dark:text-red-400 font-medium">${depId}</div>`;
              html += `</div>`;
            }
          }
        });
      }

      html += `<div class="absolute h-6 bg-${taskBarColor}-400 dark:bg-${taskBarColor}-500 rounded border border-${taskBarColor}-500 dark:border-${taskBarColor}-600${isOverdue ? " animate-pulse" : ""}" style="left: ${leftPercent}%; width: ${widthPercent}%; top: 50%; transform: translateY(-50%); z-index: 20;">`;
      html += `<div class="px-2 py-1 text-xs text-white font-medium truncate">${task.startDate.toLocaleDateString()} - ${task.endDate.toLocaleDateString()}</div>`;
      html += `</div>`;

      // Add per-task due date marker
      if (task.config.due_date) {
        // Parse due date properly for different formats
        let dueDate = new Date(task.config.due_date);

        // If invalid, try fixing incomplete datetime format like "2025-08-21T22"
        if (isNaN(dueDate.getTime())) {
          if (task.config.due_date.match(/^\d{4}-\d{2}-\d{2}T\d{1,2}$/)) {
            dueDate = new Date(task.config.due_date + ":00:00");
          } else if (task.config.due_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dueDate = new Date(task.config.due_date + "T00:00:00");
          }
        }

        if (!isNaN(dueDate.getTime())) {
          const dueDateOffset = Math.ceil(
            (dueDate - projectStart) / (1000 * 60 * 60 * 24),
          );
          const dueDatePercent = (dueDateOffset / totalDays) * 100;

          if (dueDatePercent >= 0 && dueDatePercent <= 100) {
            html += `<div class="absolute w-0.5 bg-orange-500 dark:bg-orange-400" style="left: ${dueDatePercent}%; height: 100%; top: 0; z-index: 25;">`;
            html += `<div class="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs text-orange-600 dark:text-orange-400 font-medium whitespace-nowrap bg-white dark:bg-gray-800 px-1 rounded flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>${dueDate.toLocaleDateString()}</div>`;
            html += `</div>`;
          }
        }
      }
      html += `</div>`;
      html += "</div>";
    });

    return html;
  }
}
