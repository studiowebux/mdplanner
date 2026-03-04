// Habit Tracker Module
// Card grid with per-card heatmap, streak counters, and mark-done button.

import { HabitsAPI } from "../api.js";
import { escapeHtml } from "../utils.js";
import { showToast } from "../ui/toast.js";

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

function buildHeatmapHTML(completions, dayNotes, habitId) {
  const completionSet = new Set(completions);
  const noteMap = dayNotes || {};
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
    const note = noteMap[dateStr] || "";
    const dayLabel = DAY_LABELS[i % 7];

    const noteText = note ? ` — ${note}` : "";
    const title = `${dateStr} (${dayLabel})${isDone ? " — done" : ""}${noteText}`;

    let cls = "habit-heatmap-cell";
    if (isFuture) cls += " future";
    else if (isDone) cls += " done";
    if (!isFuture && habitId) cls += " clickable";
    if (note && !isFuture) cls += " has-note";

    const dataAttrs = (!isFuture && habitId)
      ? ` data-habit-id="${habitId}" data-date="${dateStr}" data-done="${isDone}" data-note="${escapeHtml(note)}"`
      : "";

    // Inline onclick stops propagation at the cell level so the enclosing
    // habit-card onclick (which opens the sidenav) does not fire.
    const onclickAttr = (!isFuture && habitId)
      ? ` onclick="event.stopPropagation(); taskManager.habitsModule._openDayPopup(event, this.dataset.habitId, this.dataset.date, this.dataset.done === 'true', this.dataset.note || '', this)"`
      : "";

    cells.push(`<div class="${cls}" title="${escapeHtml(title)}"${dataAttrs}${onclickAttr}></div>`);
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
    const now = new Date();
    this.currentCalYear = now.getFullYear();
    this.currentCalMonth = now.getMonth(); // 0-indexed
    this._notePopup = null; // active note popup element
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

  // Calendar view: rows = habits, columns = days of selected month
  _renderCalendar(container, habits) {
    const year = this.currentCalYear;
    const month = this.currentCalMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const todayDay = isCurrentMonth ? today.getDate() : -1;

    const monthLabel = new Date(year, month, 1).toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    // Header row — day numbers
    let headerCells = `<th class="cal-habit-col"></th>`;
    for (let d = 1; d <= daysInMonth; d++) {
      headerCells += `<th class="cal-day-cell${d === todayDay ? " cal-today" : ""}">${d}</th>`;
    }

    // Data rows — one per habit
    const rows = habits.map((h) => {
      const completionSet = new Set(h.completions || []);
      const dayNotes = h.dayNotes || {};
      let cells = `<td class="cal-habit-name" title="${escapeHtml(h.name)}">${escapeHtml(h.name)}</td>`;
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const isFuture = isCurrentMonth && d > today.getDate();
        const isDone = completionSet.has(dateStr);
        const note = dayNotes[dateStr] || "";
        let cls = "cal-cell";
        if (isDone) cls += " cal-done";
        else if (isFuture) cls += " cal-future";
        if (note) cls += " cal-has-note";

        const tooltip = [
          h.name,
          dateStr,
          isDone ? "done" : (isFuture ? "future" : "not done"),
          note ? `Note: ${note}` : "",
        ].filter(Boolean).join(" — ");

        const dataAttrs = `data-habit-id="${escapeHtml(h.id)}" data-date="${dateStr}" data-done="${isDone}" data-note="${escapeHtml(note)}"`;
        const clickAttr = `onclick="taskManager.habitsModule._openDayPopup(event, this.dataset.habitId, this.dataset.date, this.dataset.done === 'true', this.dataset.note || '', this)"`;
        cls += " cal-clickable";

        cells += `<td class="${cls}" title="${escapeHtml(tooltip)}" ${dataAttrs} ${clickAttr}>${isDone ? (note ? "★" : "•") : ""}</td>`;
      }
      return `<tr class="cal-row">${cells}</tr>`;
    }).join("");

    container.className = "habits-calendar-wrap";
    container.innerHTML = `
      <div class="cal-month-nav">
        <button class="cal-nav-btn" id="calPrevMonth" title="Previous month">&#8592;</button>
        <span class="cal-month-label">${escapeHtml(monthLabel)}</span>
        <button class="cal-nav-btn" id="calNextMonth" title="Next month">&#8594;</button>
      </div>
      <div class="cal-table-wrap">
        <table class="cal-table">
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    document.getElementById("calPrevMonth")?.addEventListener("click", () => {
      this.currentCalMonth--;
      if (this.currentCalMonth < 0) { this.currentCalMonth = 11; this.currentCalYear--; }
      this.renderView();
    });
    document.getElementById("calNextMonth")?.addEventListener("click", () => {
      this.currentCalMonth++;
      if (this.currentCalMonth > 11) { this.currentCalMonth = 0; this.currentCalYear++; }
      this.renderView();
    });
  }

  // Open inline day popup on any non-future cell: toggle done + edit note.
  // cellEl is optional: when called via delegated listener, pass the actual cell
  // element since event.currentTarget will be the container.
  _openDayPopup(event, habitId, date, isDone, currentNote, cellEl) {
    event.stopPropagation();
    this._closeNotePopup();

    const cell = cellEl || event.currentTarget;
    const popup = document.createElement("div");
    popup.className = "cal-note-popup";
    popup.innerHTML = `
      <div class="cal-note-popup-header">${escapeHtml(date)}</div>
      <label class="cal-done-toggle">
        <input type="checkbox" id="calDoneCheck" ${isDone ? "checked" : ""}> Done on this day
      </label>
      <textarea class="cal-note-textarea" rows="3" placeholder="Add a note for this day...">${escapeHtml(currentNote || "")}</textarea>
      <div class="cal-note-popup-actions">
        <button class="cal-note-save btn-primary">Save</button>
        <button class="cal-note-cancel btn-ghost">Cancel</button>
      </div>
    `;

    // Position near the cell
    const rect = cell.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    popup.style.position = "absolute";
    popup.style.top = `${rect.bottom + scrollTop + 4}px`;
    popup.style.left = `${Math.min(rect.left, window.innerWidth - 260)}px`;

    document.body.appendChild(popup);
    this._notePopup = popup;
    popup.querySelector(".cal-note-textarea")?.focus();

    popup.querySelector(".cal-note-save")?.addEventListener("click", async () => {
      const newDone = popup.querySelector("#calDoneCheck").checked;
      const note = popup.querySelector(".cal-note-textarea").value.trim();
      try {
        if (newDone !== isDone) {
          if (newDone) {
            await HabitsAPI.markComplete(habitId, date);
          } else {
            await HabitsAPI.unmarkComplete(habitId, date);
          }
        }
        if (note !== (currentNote || "")) {
          await HabitsAPI.setDayNote(habitId, date, note);
        }
      } catch (err) {
        showToast("Failed to save", "error");
        console.error("[Habits] day popup save error:", err);
        return;
      }
      this.taskManager.habits = await HabitsAPI.fetchAll();
      this.renderView();
      // Refresh sidenav if the same habit is open in view mode
      const sidenav = this.taskManager.habitSidenavModule;
      if (sidenav?.editingId === habitId) {
        const updated = (this.taskManager.habits || []).find((h) => h.id === habitId);
        if (updated) sidenav._renderViewContent(updated);
      }
      showToast("Saved");
      this._closeNotePopup();
    });

    popup.querySelector(".cal-note-cancel")?.addEventListener("click", () => {
      this._closeNotePopup();
    });

    // Close on outside click
    const outsideClick = (e) => {
      if (!popup.contains(e.target)) {
        this._closeNotePopup();
        document.removeEventListener("click", outsideClick);
      }
    };
    setTimeout(() => document.addEventListener("click", outsideClick), 0);
  }

  _closeNotePopup() {
    if (this._notePopup) {
      this._notePopup.remove();
      this._notePopup = null;
    }
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
        <div class="habit-heatmap">${buildHeatmapHTML(habit.completions, habit.dayNotes, habit.id)}</div>
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
    // View toggle is now in the HTML — just bind the click handler.
    document.querySelector(".habits-view-toggle")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-habits-view]");
      if (!btn) return;
      this.currentView = btn.dataset.habitsView;
      this.renderView();
    });

    document.getElementById("addHabitBtn")?.addEventListener(
      "click",
      () => this.taskManager.habitSidenavModule.openNew(),
    );
  }
}
