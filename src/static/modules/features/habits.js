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
    this.currentView = "card"; // "card" | "calendar"
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
      container.className = "habits-grid";
      this._syncToggleUI();
      return;
    }

    emptyState?.classList.add("hidden");
    this._syncToggleUI();

    if (this.currentView === "calendar") {
      this._renderCalendar(container, habits);
    } else {
      container.className = "habits-grid";
      container.innerHTML = habits.map((h) => this._renderCard(h)).join("");
    }
  }

  // Sync the active state on toggle buttons after view change
  _syncToggleUI() {
    document.querySelectorAll(".habits-toggle-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.habitsView === this.currentView);
    });
  }

  // Calendar view: rows = habits, columns = days of current month
  _renderCalendar(container, habits) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayDay = today.getDate();
    const monthLabel = today.toLocaleString("default", { month: "long", year: "numeric" });

    // Header row — day numbers
    let headerCells = `<th class="cal-habit-col"></th>`;
    for (let d = 1; d <= daysInMonth; d++) {
      headerCells += `<th class="cal-day-cell${d === todayDay ? " cal-today" : ""}">${d}</th>`;
    }

    // Data rows — one per habit
    const rows = habits.map((h) => {
      const completionSet = new Set(h.completions || []);
      let cells = `<td class="cal-habit-name" title="${escapeHtml(h.name)}">${escapeHtml(h.name)}</td>`;
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const isFuture = d > todayDay;
        const isDone = completionSet.has(dateStr);
        let cls = "cal-cell";
        if (isDone) cls += " cal-done";
        else if (isFuture) cls += " cal-future";
        cells += `<td class="${cls}" title="${dateStr}">${isDone ? "•" : ""}</td>`;
      }
      return `<tr class="cal-row">${cells}</tr>`;
    }).join("");

    container.className = "habits-calendar-wrap";
    container.innerHTML = `
      <p class="cal-month-label">${escapeHtml(monthLabel)}</p>
      <div class="cal-table-wrap">
        <table class="cal-table">
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
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
    // Inject view toggle (Cards / Calendar) into the habits header once
    const header = document.querySelector(".habits-view-header");
    if (header && !header.querySelector(".habits-view-toggle")) {
      const toggle = document.createElement("div");
      toggle.className = "habits-view-toggle";
      toggle.innerHTML = `
        <button class="habits-toggle-btn active" data-habits-view="card">Cards</button>
        <button class="habits-toggle-btn" data-habits-view="calendar">Calendar</button>
      `;
      // Insert before the Add button
      const addBtn = header.querySelector("#addHabitBtn");
      header.insertBefore(toggle, addBtn);

      toggle.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-habits-view]");
        if (!btn) return;
        this.currentView = btn.dataset.habitsView;
        this.renderView();
      });
    }

    document.getElementById("addHabitBtn")?.addEventListener(
      "click",
      () => this.taskManager.habitSidenavModule.openNew(),
    );
  }
}
