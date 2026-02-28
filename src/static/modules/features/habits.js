// Habit Tracker Module
// Card grid with per-card heatmap, streak counters, and mark-done button.

import { HabitsAPI } from "../api.js";
import { escapeHtml } from "../utils.js";

// ---------------------------------------------------------------
// Date helpers (JS-side — mirrors the server-side logic)
// ---------------------------------------------------------------

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayISO() {
  return toISODate(new Date());
}

// ---------------------------------------------------------------
// Heatmap builder
// Generates 84 cells: 12 weeks × 7 days, column-first (Mon=row0).
// The CSS uses grid-auto-flow:column so cells fill column by column.
// ---------------------------------------------------------------

function buildHeatmapHTML(completions) {
  const completionSet = new Set(completions);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find Monday of current week
  const dow = today.getDay(); // 0=Sun
  const daysFromMonday = (dow + 6) % 7;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - daysFromMonday);

  // Grid start = Monday 11 weeks before current Monday
  const startDate = new Date(currentMonday);
  startDate.setDate(currentMonday.getDate() - 11 * 7);

  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const cells = [];

  for (let i = 0; i < 84; i++) {
    const cellDate = new Date(startDate);
    cellDate.setDate(startDate.getDate() + i);

    const dateStr = toISODate(cellDate);
    const isFuture = cellDate > today;
    const isDone = completionSet.has(dateStr);
    const dayLabel = DAY_LABELS[i % 7];
    const title = `${dateStr} (${dayLabel})${isDone ? " — done" : ""}`;

    let cls = "habit-heatmap-cell";
    if (isFuture) cls += " future";
    else if (isDone) cls += " done";

    cells.push(`<div class="${cls}" title="${escapeHtml(title)}"></div>`);
  }

  return cells.join("");
}

// ---------------------------------------------------------------
// Module
// ---------------------------------------------------------------

export class HabitsModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
  }

  async load() {
    try {
      this.taskManager.habits = await HabitsAPI.fetchAll();
      this.renderView();
    } catch (error) {
      console.error("Error loading habits:", error);
    }
  }

  renderView() {
    const container = document.getElementById("habitsContainer");
    const emptyState = document.getElementById("emptyHabitsState");
    if (!container) return;

    const habits = this.taskManager.habits || [];

    if (habits.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");
    container.innerHTML = habits.map((h) => this._renderCard(h)).join("");
  }

  _renderCard(habit) {
    const today = todayISO();
    const isDoneToday = habit.completions.includes(today);
    const freqLabel = habit.frequency === "weekly" ? "Weekly" : "Daily";

    const description = habit.description
      ? `<p class="habit-card-description">${escapeHtml(habit.description)}</p>`
      : "";

    const markBtnLabel = isDoneToday ? "Done today" : "Mark done today";
    const markBtnDisabled = isDoneToday ? "disabled" : "";
    const markBtnClass = isDoneToday
      ? "habit-mark-btn done-today"
      : "habit-mark-btn";

    return `
      <div class="habit-card" onclick="taskManager.habitSidenavModule.openView('${habit.id}')">
        <div class="habit-card-header">
          <span class="habit-card-name">${escapeHtml(habit.name)}</span>
          <span class="habit-freq-badge">${freqLabel}</span>
        </div>
        <div class="habit-stats-row">
          <div class="habit-stat">
            <span class="habit-stat-value">${habit.streakCount}</span>
            <span class="habit-stat-label">Streak</span>
          </div>
          <div class="habit-stat">
            <span class="habit-stat-value">${habit.longestStreak}</span>
            <span class="habit-stat-label">Best</span>
          </div>
        </div>
        <div class="habit-heatmap">${buildHeatmapHTML(habit.completions)}</div>
        ${description}
        <button
          class="${markBtnClass}"
          ${markBtnDisabled}
          onclick="event.stopPropagation(); taskManager.habitSidenavModule.handleComplete('${habit.id}')"
        >${markBtnLabel}</button>
      </div>
    `;
  }

  bindEvents() {
    document.getElementById("addHabitBtn")?.addEventListener(
      "click",
      () => this.taskManager.habitSidenavModule.openNew(),
    );
  }
}
