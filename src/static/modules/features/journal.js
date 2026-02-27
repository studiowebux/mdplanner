// Journal Module
// Reverse-chronological journal entry list grouped by month

import { JournalAPI } from "../api.js";
import { escapeHtml } from "../utils.js";

const MOOD_LABELS = {
  great: "Great",
  good: "Good",
  neutral: "Neutral",
  bad: "Bad",
  terrible: "Terrible",
};

export class JournalModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
  }

  async load() {
    try {
      this.taskManager.journal = await JournalAPI.fetchAll();
      this.renderView();
    } catch (error) {
      console.error("Error loading journal:", error);
    }
  }

  renderView() {
    const container = document.getElementById("journalContainer");
    const emptyState = document.getElementById("emptyJournalState");
    if (!container) return;

    const entries = this.taskManager.journal || [];

    if (entries.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");

    // Group entries by YYYY-MM (month)
    const groups = new Map();
    for (const entry of entries) {
      const month = entry.date.slice(0, 7); // YYYY-MM
      if (!groups.has(month)) groups.set(month, []);
      groups.get(month).push(entry);
    }

    container.innerHTML = [...groups.entries()]
      .map(([month, monthEntries]) => {
        const label = this._formatMonthLabel(month);
        const cards = monthEntries
          .map((entry) => this._renderCard(entry))
          .join("");
        return `
        <div class="journal-month-group">
          <div class="journal-month-header">${escapeHtml(label)}</div>
          ${cards}
        </div>
      `;
      })
      .join("");
  }

  _formatMonthLabel(yyyymm) {
    const [year, month] = yyyymm.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }

  _renderCard(entry) {
    const datetime = entry.time
      ? `${escapeHtml(entry.date)} at ${escapeHtml(entry.time)}`
      : escapeHtml(entry.date);

    const titleLine = entry.title
      ? `<div class="journal-entry-title">${escapeHtml(entry.title)}</div>`
      : "";

    const moodBadge = entry.mood
      ? `<span class="journal-mood-badge journal-mood-${entry.mood}">${MOOD_LABELS[entry.mood] ?? entry.mood}</span>`
      : "";

    const tags =
      (entry.tags || []).length > 0
        ? `<div class="journal-entry-tags">${entry.tags
            .map(
              (t) => `<span class="journal-tag">${escapeHtml(t)}</span>`,
            )
            .join("")}</div>`
        : "";

    const preview = entry.body
      ? `<div class="journal-entry-preview">${escapeHtml(entry.body.slice(0, 140))}${entry.body.length > 140 ? "…" : ""}</div>`
      : "";

    return `
      <div class="journal-entry-card" onclick="taskManager.journalSidenavModule.openView('${entry.id}')">
        <div class="journal-entry-card-header">
          <div class="journal-entry-meta-row">
            <span class="journal-entry-datetime">${datetime}</span>
            ${moodBadge}
          </div>
          ${titleLine}
        </div>
        ${tags}
        ${preview}
      </div>
    `;
  }

  bindEvents() {
    document.getElementById("addJournalEntryBtn")?.addEventListener(
      "click",
      () => this.taskManager.journalSidenavModule.openNew(),
    );
  }
}
