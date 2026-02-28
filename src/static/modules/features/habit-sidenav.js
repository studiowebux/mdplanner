// Habit Sidenav Module
// Slide-in panel for habit creation, editing, and viewing.
// Supports a read-only view mode (heatmap + streaks) and an edit mode.

import { Sidenav } from "../ui/sidenav.js";
import { HabitsAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { showConfirm } from "../ui/confirm.js";
import { escapeHtml } from "../utils.js";

// ---------------------------------------------------------------
// Date helpers
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

// Heatmap builder — full 12-week view for sidenav
function buildHeatmapHTML(completions) {
  const completionSet = new Set(completions);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dow = today.getDay();
  const daysFromMonday = (dow + 6) % 7;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - daysFromMonday);

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
// Target-days checkboxes helpers
// ---------------------------------------------------------------

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function renderTargetDaysCheckboxes(selected = []) {
  return DAYS.map(
    (day) =>
      `<label class="habit-day-checkbox">
        <input type="checkbox" name="habitTargetDay" value="${day}" ${selected.includes(day) ? "checked" : ""}>
        ${day}
      </label>`,
  ).join("");
}

function collectTargetDays() {
  const boxes = document.querySelectorAll(
    "input[name='habitTargetDay']:checked",
  );
  return [...boxes].map((b) => b.value);
}

// ---------------------------------------------------------------
// Module
// ---------------------------------------------------------------

export class HabitSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingId = null;
  }

  bindEvents() {
    document.getElementById("habitSidenavClose")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("habitSidenavCancel")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("habitSidenavSave")?.addEventListener(
      "click",
      () => this.handleSave(),
    );
    document.getElementById("habitSidenavDelete")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );
    document.getElementById("habitSidenavEditBtn")?.addEventListener(
      "click",
      () => this._switchToEdit(),
    );
    document.getElementById("habitSidenavCompleteBtn")?.addEventListener(
      "click",
      () => {
        if (this.editingId) this.handleComplete(this.editingId);
      },
    );

    // Show/hide target-days when frequency changes
    document.getElementById("habitSidenavFrequency")?.addEventListener(
      "change",
      () => this._toggleTargetDaysVisibility(),
    );
  }

  /** Open in view mode (card clicks use this). */
  openView(habitId) {
    const habit = (this.tm.habits || []).find((h) => h.id === habitId);
    if (!habit) return;

    this.editingId = habitId;
    document.getElementById("habitSidenavHeader").textContent = habit.name;

    this._renderViewContent(habit);
    this._showViewMode();
    document.getElementById("habitSidenavDelete").classList.remove("hidden");
    Sidenav.open("habitSidenav");
  }

  openNew() {
    this.editingId = null;
    document.getElementById("habitSidenavHeader").textContent = "New Habit";
    this._clearForm();
    document.getElementById("habitSidenavDelete").classList.add("hidden");
    this._showEditMode();
    Sidenav.open("habitSidenav");
    document.getElementById("habitSidenavName")?.focus();
  }

  close() {
    Sidenav.close("habitSidenav");
    this.editingId = null;
  }

  // ------------------------------------------------------------------
  // Private: mode switching
  // ------------------------------------------------------------------

  _showViewMode() {
    document
      .getElementById("habitSidenavViewSection")
      .classList.remove("hidden");
    document.getElementById("habitSidenavFormSection").classList.add("hidden");
    document.getElementById("habitSidenavCancel").classList.add("hidden");
    document.getElementById("habitSidenavEditBtn").classList.remove("hidden");
    document.getElementById("habitSidenavSave").classList.add("hidden");
  }

  _showEditMode() {
    document.getElementById("habitSidenavViewSection").classList.add("hidden");
    document
      .getElementById("habitSidenavFormSection")
      .classList.remove("hidden");
    document.getElementById("habitSidenavCancel").classList.remove("hidden");
    document.getElementById("habitSidenavEditBtn").classList.add("hidden");
    document.getElementById("habitSidenavSave").classList.remove("hidden");
  }

  _switchToEdit() {
    const habit = (this.tm.habits || []).find((h) => h.id === this.editingId);
    if (!habit) return;

    document.getElementById("habitSidenavHeader").textContent = "Edit Habit";
    this._fillForm(habit);
    this._showEditMode();
    document.getElementById("habitSidenavName")?.focus();
  }

  // ------------------------------------------------------------------
  // Private: view rendering
  // ------------------------------------------------------------------

  _renderViewContent(habit) {
    const viewSection = document.getElementById("habitSidenavViewSection");
    if (!viewSection) return;

    const today = todayISO();
    const isDoneToday = habit.completions.includes(today);
    const freqLabel = habit.frequency === "weekly" ? "Weekly" : "Daily";

    const targetDaysHtml =
      habit.frequency === "weekly" && habit.targetDays?.length
        ? `<span class="habit-freq-badge">${habit.targetDays.join(", ")}</span>`
        : "";

    const completeBtn = `
      <button
        id="habitSidenavCompleteBtn"
        class="habit-mark-btn${isDoneToday ? " done-today" : ""}"
        ${isDoneToday ? "disabled" : ""}
      >${isDoneToday ? "Done today" : "Mark done today"}</button>
    `;

    const notesHtml =
      habit.notes && habit.notes.trim()
        ? `<div class="habit-view-body">${typeof marked !== "undefined" ? marked.parse(habit.notes) : escapeHtml(habit.notes)}</div>`
        : "";

    viewSection.innerHTML = `
      <div class="sidenav-section">
        <div class="habit-view-meta">
          <span class="habit-freq-badge">${freqLabel}</span>
          ${targetDaysHtml}
        </div>
        <div class="habit-view-streaks">
          <div class="habit-stat">
            <span class="habit-stat-value">${habit.streakCount}</span>
            <span class="habit-stat-label">Streak</span>
          </div>
          <div class="habit-stat">
            <span class="habit-stat-value">${habit.longestStreak}</span>
            <span class="habit-stat-label">Best</span>
          </div>
          <div class="habit-stat">
            <span class="habit-stat-value">${habit.completions.length}</span>
            <span class="habit-stat-label">Total</span>
          </div>
        </div>
        <div class="habit-view-heatmap-label">Last 12 weeks</div>
        <div class="habit-heatmap">${buildHeatmapHTML(habit.completions)}</div>
        ${completeBtn}
        ${notesHtml}
      </div>
    `;

    // Re-bind the complete button that was just rendered
    document.getElementById("habitSidenavCompleteBtn")?.addEventListener(
      "click",
      () => {
        if (this.editingId) this.handleComplete(this.editingId);
      },
    );
  }

  // ------------------------------------------------------------------
  // Private: form helpers
  // ------------------------------------------------------------------

  _clearForm() {
    document.getElementById("habitSidenavName").value = "";
    document.getElementById("habitSidenavDescription").value = "";
    document.getElementById("habitSidenavFrequency").value = "daily";
    document.getElementById("habitSidenavNotes").value = "";
    this._renderTargetDays([]);
    this._toggleTargetDaysVisibility();
  }

  _fillForm(habit) {
    document.getElementById("habitSidenavName").value = habit.name || "";
    document.getElementById("habitSidenavDescription").value =
      habit.description || "";
    document.getElementById("habitSidenavFrequency").value =
      habit.frequency || "daily";
    document.getElementById("habitSidenavNotes").value = habit.notes || "";
    this._renderTargetDays(habit.targetDays || []);
    this._toggleTargetDaysVisibility();
  }

  _renderTargetDays(selected) {
    const container = document.getElementById("habitTargetDaysContainer");
    if (container) {
      container.innerHTML = renderTargetDaysCheckboxes(selected);
    }
  }

  _toggleTargetDaysVisibility() {
    const freq = document.getElementById("habitSidenavFrequency")?.value;
    const row = document.getElementById("habitTargetDaysRow");
    if (row) row.classList.toggle("hidden", freq !== "weekly");
  }

  _collectForm() {
    const freq =
      document.getElementById("habitSidenavFrequency")?.value || "daily";
    return {
      name: document.getElementById("habitSidenavName").value.trim(),
      description:
        document.getElementById("habitSidenavDescription").value.trim() ||
        undefined,
      frequency: freq,
      targetDays: freq === "weekly" ? collectTargetDays() : undefined,
      notes:
        document.getElementById("habitSidenavNotes").value.trim() || undefined,
    };
  }

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  async handleComplete(habitId) {
    const res = await HabitsAPI.markComplete(habitId);
    if (!res.ok) {
      showToast("Failed to mark habit as done", "error");
      return;
    }

    this.tm.habits = await HabitsAPI.fetchAll();
    this.tm.habitsModule.renderView();

    // Refresh sidenav view if open
    if (this.editingId === habitId) {
      const updated = (this.tm.habits || []).find((h) => h.id === habitId);
      if (updated) {
        this._renderViewContent(updated);
        this._showViewMode();
      }
    }

    showToast("Habit marked as done");
  }

  async handleSave() {
    const data = this._collectForm();
    if (!data.name) {
      showToast("Habit name is required", "error");
      return;
    }

    if (this.editingId) {
      const res = await HabitsAPI.update(this.editingId, data);
      if (!res.ok) {
        showToast("Failed to save habit", "error");
        return;
      }
    } else {
      const res = await HabitsAPI.create({ ...data, completions: [] });
      if (!res.ok) {
        showToast("Failed to create habit", "error");
        return;
      }
      const json = await res.json();
      this.editingId = json.id;
    }

    this.tm.habits = await HabitsAPI.fetchAll();
    this.tm.habitsModule.renderView();
    showToast("Habit saved");

    // Switch to view mode after save
    const saved = (this.tm.habits || []).find((h) => h.id === this.editingId);
    if (saved) {
      document.getElementById("habitSidenavHeader").textContent = saved.name;
      this._renderViewContent(saved);
      this._showViewMode();
      document.getElementById("habitSidenavDelete").classList.remove("hidden");
    }
  }

  async handleDelete() {
    if (!this.editingId) return;
    const confirmed = await showConfirm("Delete this habit?");
    if (!confirmed) return;

    const res = await HabitsAPI.delete(this.editingId);
    if (!res.ok) {
      showToast("Failed to delete habit", "error");
      return;
    }

    this.tm.habits = await HabitsAPI.fetchAll();
    this.tm.habitsModule.renderView();
    this.close();
    showToast("Habit deleted");
  }
}
