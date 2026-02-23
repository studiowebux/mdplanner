// Meetings Module
// Meeting list view with action items tracker

import { MeetingsAPI, TasksAPI } from "../api.js";
import { escapeHtml, markdownToHtml } from "../utils.js";

export class MeetingsModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
    this.activeTab = "meetings"; // "meetings" | "actions"
    this.ownerFilter = "";
  }

  async load() {
    try {
      this.taskManager.meetings = await MeetingsAPI.fetchAll();
      this.renderView();
    } catch (error) {
      console.error("Error loading meetings:", error);
    }
  }

  renderView() {
    if (this.activeTab === "meetings") {
      this.renderMeetings();
    } else {
      this.renderActions();
    }
  }

  renderMeetings() {
    const container = document.getElementById("meetingsContainer");
    const emptyState = document.getElementById("emptyMeetingsState");
    if (!container) return;

    const meetings = this.taskManager.meetings || [];

    if (meetings.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");

    container.innerHTML = meetings.map((meeting) => {
      const openActions = (meeting.actions || []).filter((a) =>
        a.status === "open"
      );
      const doneActions = (meeting.actions || []).filter((a) =>
        a.status === "done"
      );
      const attendeeList = (meeting.attendees || []).join(", ");

      const badges = meeting.actions && meeting.actions.length > 0
        ? `<div class="flex gap-2">
            ${openActions.length > 0 ? `<span class="meeting-badge meeting-badge-open">${openActions.length} open</span>` : ""}
            ${doneActions.length > 0 ? `<span class="meeting-badge meeting-badge-done">${doneActions.length} done</span>` : ""}
           </div>`
        : `<div></div>`;

      return `
        <div class="meeting-card" onclick="taskManager.meetingSidenavModule.openEdit('${meeting.id}')">
          <div class="meeting-card-header">
            <div class="meeting-card-title-row">
              <h3 class="meeting-card-title">${escapeHtml(meeting.title)}</h3>
              <span class="meeting-card-date">${meeting.date}</span>
            </div>
            ${attendeeList ? `<div class="meeting-card-attendees">${escapeHtml(attendeeList)}</div>` : ""}
            ${meeting.agenda ? `<div class="meeting-card-agenda">${escapeHtml(meeting.agenda)}</div>` : ""}
          </div>
          <div class="meeting-card-footer">
            ${badges}
            <button class="meeting-card-view-btn" onclick="event.stopPropagation(); taskManager.meetingsModule.openReadOnlyView('${meeting.id}')" title="View notes">
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  renderActions() {
    const container = document.getElementById("meetingsActionsContainer");
    const emptyState = document.getElementById("emptyMeetingsActionsState");
    if (!container) return;

    const meetings = this.taskManager.meetings || [];
    const filter = this.ownerFilter.toLowerCase();

    // Collect all open action items across all meetings
    const allActions = [];
    for (const meeting of meetings) {
      for (const action of (meeting.actions || [])) {
        if (action.status === "open") {
          if (!filter || (action.owner || "").toLowerCase().includes(filter)) {
            allActions.push({
              ...action,
              meetingTitle: meeting.title,
              meetingId: meeting.id,
            });
          }
        }
      }
    }

    // Sort: overdue first, then by due date, then undated
    const today = new Date().toISOString().split("T")[0];
    allActions.sort((a, b) => {
      const aOverdue = a.due && a.due < today;
      const bOverdue = b.due && b.due < today;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      if (a.due && b.due) return a.due.localeCompare(b.due);
      if (a.due) return -1;
      if (b.due) return 1;
      return 0;
    });

    if (allActions.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");

    container.innerHTML = allActions.map((action) => {
      const overdue = action.due && action.due < today;
      return `
        <div class="meeting-action-item ${overdue ? "meeting-action-item-overdue" : ""}">
          <div class="meeting-action-item-desc">${escapeHtml(action.description)}</div>
          <div class="meeting-action-item-meta">
            <span class="meeting-action-item-source" onclick="taskManager.meetingSidenavModule.openEdit('${action.meetingId}')">
              ${escapeHtml(action.meetingTitle)}
            </span>
            ${action.owner ? `<span class="meeting-action-item-owner">@${escapeHtml(action.owner)}</span>` : ""}
            ${action.due ? `<span class="meeting-action-item-due ${overdue ? "meeting-action-item-due-overdue" : ""}">${action.due}</span>` : ""}
            <button class="meeting-action-promote-btn"
              data-description="${escapeHtml(action.description)}"
              data-owner="${escapeHtml(action.owner || "")}"
              data-due="${escapeHtml(action.due || "")}"
              data-meeting="${escapeHtml(action.meetingTitle)}"
              onclick="event.stopPropagation(); taskManager.meetingsModule.promoteToTask(this)">
              Promote to task
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  // Read-only modal view for meeting notes
  openReadOnlyView(meetingId) {
    const meeting = this.taskManager.meetings?.find((m) => m.id === meetingId);
    if (!meeting) return;

    const modal = document.getElementById("meetingViewModal");
    if (!modal) return;

    // Title
    document.getElementById("meetingViewTitle").textContent = meeting.title;

    // Meta: date + attendees
    const metaEl = document.getElementById("meetingViewMeta");
    const attendeeStr = (meeting.attendees || []).join(", ");
    metaEl.innerHTML = `
      <span>${escapeHtml(meeting.date)}</span>
      ${attendeeStr ? `<span>${escapeHtml(attendeeStr)}</span>` : ""}
    `;

    // Agenda
    const agendaEl = document.getElementById("meetingViewAgenda");
    if (meeting.agenda) {
      agendaEl.innerHTML = `
        <div class="meeting-view-section">
          <div class="meeting-view-section-title">Agenda</div>
          <div class="meeting-view-agenda">${escapeHtml(meeting.agenda)}</div>
        </div>
      `;
    } else {
      agendaEl.innerHTML = "";
    }

    // Notes (rendered markdown)
    const notesEl = document.getElementById("meetingViewNotes");
    if (meeting.notes) {
      notesEl.innerHTML = `
        <div class="meeting-view-section">
          <div class="meeting-view-section-title">Notes</div>
          ${markdownToHtml(meeting.notes)}
        </div>
      `;
    } else {
      notesEl.innerHTML = "";
    }

    // Action items
    const actionsEl = document.getElementById("meetingViewActions");
    const actions = meeting.actions || [];
    if (actions.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      actionsEl.innerHTML = `
        <div class="meeting-view-section">
          <div class="meeting-view-section-title">Action Items</div>
          <div class="meeting-view-actions-list">
            ${actions.map((a, idx) => {
        const overdue = a.status !== "done" && a.due && a.due < today;
        return `
                <div class="meeting-view-action-row ${a.status === "done" ? "meeting-view-action-done" : ""}">
                  <div class="meeting-view-action-status"></div>
                  <span class="meeting-view-action-desc">${escapeHtml(a.description)}</span>
                  <div class="meeting-view-action-meta">
                    ${a.owner ? `<span>@${escapeHtml(a.owner)}</span>` : ""}
                    ${a.due ? `<span class="${overdue ? "meeting-view-action-overdue" : ""}">${a.due}</span>` : ""}
                    ${a.status !== "done" ? `<button class="meeting-action-promote-btn" data-description="${escapeHtml(a.description)}" data-owner="${escapeHtml(a.owner || "")}" data-due="${escapeHtml(a.due || "")}" data-meeting="${escapeHtml(meeting.title)}" onclick="taskManager.meetingsModule.promoteToTask(this)">Promote to task</button>` : ""}
                  </div>
                </div>
              `;
      }).join("")}
          </div>
        </div>
      `;
    } else {
      actionsEl.innerHTML = "";
    }

    modal.classList.remove("hidden");
  }

  async promoteToTask(btn) {
    const { description, owner, due, meeting } = btn.dataset;
    btn.disabled = true;
    btn.textContent = "Creating...";
    try {
      const payload = {
        title: description,
        section: "Backlog",
        config: {
          ...(owner ? { assignee: owner } : {}),
          ...(due ? { due_date: due } : {}),
        },
        description: [`Promoted from meeting: ${meeting}`],
      };
      const res = await TasksAPI.create(payload);
      if (res.ok) {
        btn.textContent = "Promoted";
        btn.classList.add("meeting-action-promoted");
      } else {
        btn.textContent = "Failed";
        btn.disabled = false;
      }
    } catch {
      btn.textContent = "Failed";
      btn.disabled = false;
    }
  }

  closeReadOnlyView() {
    document.getElementById("meetingViewModal")?.classList.add("hidden");
  }

  switchTab(tab) {
    this.activeTab = tab;

    document.getElementById("meetingsTabMeetings")?.classList.toggle(
      "active",
      tab === "meetings",
    );
    document.getElementById("meetingsTabActions")?.classList.toggle(
      "active",
      tab === "actions",
    );

    document.getElementById("meetingsList")?.classList.toggle(
      "hidden",
      tab !== "meetings",
    );
    document.getElementById("meetingsActionsList")?.classList.toggle(
      "hidden",
      tab !== "actions",
    );

    this.renderView();
  }

  bindEvents() {
    document.getElementById("meetingsViewBtn")?.addEventListener(
      "click",
      () => {
        this.taskManager.switchView("meetings");
        document.getElementById("viewSelectorDropdown")?.classList.add(
          "hidden",
        );
      },
    );

    document.getElementById("addMeetingBtn")?.addEventListener(
      "click",
      () => this.taskManager.meetingSidenavModule.openNew(),
    );

    document.getElementById("meetingsTabMeetings")?.addEventListener(
      "click",
      () => this.switchTab("meetings"),
    );

    document.getElementById("meetingsTabActions")?.addEventListener(
      "click",
      () => this.switchTab("actions"),
    );

    document.getElementById("meetingsOwnerFilter")?.addEventListener(
      "input",
      (e) => {
        this.ownerFilter = e.target.value;
        this.renderActions();
      },
    );

    // Read-only modal close
    document.getElementById("meetingViewClose")?.addEventListener(
      "click",
      () => this.closeReadOnlyView(),
    );

    document.getElementById("meetingViewModal")?.addEventListener(
      "click",
      (e) => {
        if (e.target.id === "meetingViewModal") this.closeReadOnlyView();
      },
    );

    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        !document.getElementById("meetingViewModal")?.classList.contains(
          "hidden",
        )
      ) {
        this.closeReadOnlyView();
      }
    });
  }
}
