// Meeting Sidenav Module
// Slide-in panel for meeting creation and editing with action item management

import { Sidenav } from "../ui/sidenav.js";
import { MeetingsAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { showConfirm } from "../ui/confirm.js";
import { escapeHtml } from "../utils.js";

export class MeetingSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingMeetingId = null;
    this.currentMeeting = null;
    this.attendeeNames = [];
    this._dropdowns = []; // fixed-position dropdowns appended to body
  }

  // --- Custom autocomplete (position:fixed, appended to body) ---
  // Returns a hide() function. getNames() is called on each keystroke.
  _bindAutocomplete(inputEl, getNames, onSelect) {
    const dropdown = document.createElement("ul");
    dropdown.className = "meeting-autocomplete-dropdown";
    dropdown.style.cssText = "position:fixed;display:none;";
    document.body.appendChild(dropdown);
    this._dropdowns.push(dropdown);

    const hide = () => {
      dropdown.style.display = "none";
    };

    const show = () => {
      const query = inputEl.value.toLowerCase().trim();
      const names = getNames();
      const matches = names
        .filter((n) => !query || n.toLowerCase().includes(query))
        .slice(0, 8);

      if (matches.length === 0) {
        hide();
        return;
      }

      dropdown.innerHTML = matches
        .map((n) =>
          `<li class="meeting-autocomplete-item">${escapeHtml(n)}</li>`
        )
        .join("");

      // Position: prefer below, flip above if not enough room
      const rect = inputEl.getBoundingClientRect();
      const estHeight = Math.min(matches.length * 32 + 8, 160);
      dropdown.style.left = `${rect.left}px`;
      dropdown.style.width = `${rect.width}px`;
      if (window.innerHeight - rect.bottom >= estHeight) {
        dropdown.style.top = `${rect.bottom + 2}px`;
        dropdown.style.bottom = "auto";
      } else {
        dropdown.style.top = "auto";
        dropdown.style.bottom = `${window.innerHeight - rect.top + 2}px`;
      }
      dropdown.style.display = "block";

      dropdown.querySelectorAll(".meeting-autocomplete-item").forEach((item) => {
        item.addEventListener("mousedown", (e) => {
          e.preventDefault(); // keep focus on input so blur doesn't race
          onSelect(item.textContent);
          hide();
        });
      });
    };

    inputEl.addEventListener("input", show);
    inputEl.addEventListener("focus", show);
    inputEl.addEventListener("blur", () => setTimeout(hide, 150));

    return hide;
  }

  bindEvents() {
    document.getElementById("meetingSidenavClose")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("meetingSidenavCancel")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("meetingSidenavDelete")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );

    // Save button
    document.getElementById("meetingSidenavSave")?.addEventListener(
      "click",
      () => this.save(),
    );

    // Attendee tag picker
    const attendeePicker = document.getElementById(
      "meetingSidenavAttendeePicker",
    );
    const attendeeInput = document.getElementById(
      "meetingSidenavAttendeeInput",
    );

    attendeePicker?.addEventListener("click", () => attendeeInput?.focus());

    attendeeInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        this.commitAttendeeInput();
      } else if (
        e.key === "Backspace" && attendeeInput.value === "" &&
        this.attendeeNames.length > 0
      ) {
        this.removeAttendee(this.attendeeNames.length - 1);
      }
    });

    // Commit on blur (user clicks away after typing free text)
    attendeeInput?.addEventListener("blur", () => {
      setTimeout(() => {
        if (attendeeInput.value.trim()) this.commitAttendeeInput();
      }, 160); // after autocomplete mousedown has fired
    });

    // Attendee autocomplete
    if (attendeeInput) {
      this._bindAutocomplete(
        attendeeInput,
        () =>
          [...this.tm.peopleMap.values()]
            .map((p) => p.name)
            .filter((n) => n && !this.attendeeNames.includes(n))
            .sort(),
        (name) => {
          this.addAttendee(name);
          attendeeInput.value = "";
        },
      );
    }

    // Action item inputs
    const actionInput = document.getElementById("meetingSidenavActionInput");
    actionInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.addActionFromInputs();
      }
    });

    const ownerInput = document.getElementById("meetingSidenavActionOwner");
    ownerInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.addActionFromInputs();
      }
    });

    // Owner autocomplete
    if (ownerInput) {
      this._bindAutocomplete(
        ownerInput,
        () =>
          [...this.tm.peopleMap.values()]
            .map((p) => p.name)
            .filter(Boolean)
            .sort(),
        (name) => {
          ownerInput.value = name;
        },
      );
    }

    document.getElementById("meetingSidenavActionAdd")?.addEventListener(
      "click",
      () => this.addActionFromInputs(),
    );
  }

  openNew() {
    this.editingMeetingId = null;
    this.currentMeeting = {
      title: "",
      date: new Date().toISOString().split("T")[0],
      attendees: [],
      agenda: "",
      notes: "",
      actions: [],
    };
    this.attendeeNames = [];

    document.getElementById("meetingSidenavHeader").textContent = "New Meeting";
    this.clearForm();
    document.getElementById("meetingSidenavDelete").classList.add("hidden");

    Sidenav.open("meetingSidenav");
    document.getElementById("meetingSidenavTitle")?.focus();
  }

  openEdit(meetingId) {
    const meeting = this.tm.meetings.find((m) => m.id === meetingId);
    if (!meeting) return;

    this.editingMeetingId = meetingId;
    this.currentMeeting = JSON.parse(JSON.stringify(meeting));
    this.attendeeNames = [...(meeting.attendees || [])];

    document.getElementById("meetingSidenavHeader").textContent =
      "Edit Meeting";
    this.fillForm();
    document.getElementById("meetingSidenavDelete").classList.remove("hidden");

    Sidenav.open("meetingSidenav");
  }

  close() {
    // Hide all custom autocomplete dropdowns
    for (const el of this._dropdowns) el.style.display = "none";
    Sidenav.close("meetingSidenav");
    this.editingMeetingId = null;
    this.currentMeeting = null;
    this.attendeeNames = [];
  }

  // --- Attendee tag picker ---

  commitAttendeeInput() {
    const input = document.getElementById("meetingSidenavAttendeeInput");
    if (!input) return;
    const name = input.value.trim().replace(/,$/, "");
    if (name) {
      this.addAttendee(name);
      input.value = "";
    }
  }

  addAttendee(name) {
    if (!name || this.attendeeNames.includes(name)) return;
    this.attendeeNames.push(name);
    this.renderAttendeeTags();
  }

  removeAttendee(index) {
    this.attendeeNames.splice(index, 1);
    this.renderAttendeeTags();
  }

  renderAttendeeTags() {
    const picker = document.getElementById("meetingSidenavAttendeePicker");
    const input = document.getElementById("meetingSidenavAttendeeInput");
    if (!picker || !input) return;

    // Remove existing chips (keep the input element)
    picker.querySelectorAll(".attendee-chip").forEach((c) => c.remove());

    // Re-insert chips before the input
    for (let i = 0; i < this.attendeeNames.length; i++) {
      const chip = document.createElement("span");
      chip.className = "attendee-chip";
      chip.innerHTML =
        `${escapeHtml(this.attendeeNames[i])}<button class="attendee-chip-remove" type="button" aria-label="Remove ${escapeHtml(this.attendeeNames[i])}">×</button>`;
      chip.querySelector(".attendee-chip-remove").addEventListener(
        "click",
        (e) => {
          e.stopPropagation();
          this.removeAttendee(i);
        },
      );
      picker.insertBefore(chip, input);
    }
  }

  // --- Form helpers ---

  clearForm() {
    document.getElementById("meetingSidenavTitle").value = "";
    document.getElementById("meetingSidenavDate").value =
      new Date().toISOString().split("T")[0];
    document.getElementById("meetingSidenavAgenda").value = "";
    document.getElementById("meetingSidenavNotes").value = "";
    document.getElementById("meetingSidenavActionInput").value = "";
    document.getElementById("meetingSidenavActionOwner").value = "";
    document.getElementById("meetingSidenavActionDue").value = "";
    this.attendeeNames = [];
    this.renderAttendeeTags();
    this.renderActions([]);
  }

  fillForm() {
    document.getElementById("meetingSidenavTitle").value =
      this.currentMeeting.title || "";
    document.getElementById("meetingSidenavDate").value =
      this.currentMeeting.date || new Date().toISOString().split("T")[0];
    document.getElementById("meetingSidenavAgenda").value =
      this.currentMeeting.agenda || "";
    document.getElementById("meetingSidenavNotes").value =
      this.currentMeeting.notes || "";
    document.getElementById("meetingSidenavActionInput").value = "";
    document.getElementById("meetingSidenavActionOwner").value = "";
    document.getElementById("meetingSidenavActionDue").value = "";
    this.renderAttendeeTags();
    this.renderActions(this.currentMeeting.actions || []);
  }

  renderActions(actions) {
    const container = document.getElementById("meetingSidenavActionList");
    if (!container) return;

    if (actions.length === 0) {
      container.innerHTML =
        '<div class="meeting-action-empty">No action items yet</div>';
      return;
    }

    container.innerHTML = actions.map((action, i) => `
      <div class="meeting-action-row ${action.status === "done" ? "meeting-action-done" : ""}">
        <button class="meeting-action-toggle" data-index="${i}" title="${action.status === "done" ? "Mark open" : "Mark done"}">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${
      action.status === "done"
        ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>'
        : '<circle cx="12" cy="12" r="9" stroke-width="2"/>'
    }
          </svg>
        </button>
        <div class="meeting-action-content">
          <span class="meeting-action-desc">${escapeHtml(action.description)}</span>
          <div class="meeting-action-meta">
            ${action.owner ? `<span class="meeting-action-owner">@${escapeHtml(action.owner)}</span>` : ""}
            ${action.due ? `<span class="meeting-action-due ${isOverdue(action) ? "meeting-action-overdue" : ""}">${action.due}</span>` : ""}
          </div>
        </div>
        <button class="meeting-action-delete" data-index="${i}" title="Remove">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `).join("");

    container.querySelectorAll(".meeting-action-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index, 10);
        const action = this.currentMeeting.actions[idx];
        action.status = action.status === "done" ? "open" : "done";
        this.renderActions(this.currentMeeting.actions);
      });
    });

    container.querySelectorAll(".meeting-action-delete").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index, 10);
        this.currentMeeting.actions.splice(idx, 1);
        this.renderActions(this.currentMeeting.actions);
      });
    });
  }

  addActionFromInputs() {
    const descInput = document.getElementById("meetingSidenavActionInput");
    const ownerInput = document.getElementById("meetingSidenavActionOwner");
    const dueInput = document.getElementById("meetingSidenavActionDue");

    const description = descInput?.value.trim();
    if (!description) return;

    const action = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      description,
      owner: ownerInput?.value.trim() || undefined,
      due: dueInput?.value || undefined,
      status: "open",
    };

    if (!this.currentMeeting.actions) this.currentMeeting.actions = [];
    this.currentMeeting.actions.push(action);
    this.renderActions(this.currentMeeting.actions);

    // Clear inputs
    descInput.value = "";
    if (ownerInput) ownerInput.value = "";
    if (dueInput) dueInput.value = "";
    descInput.focus();
  }

  getFormData() {
    return {
      title: document.getElementById("meetingSidenavTitle").value.trim(),
      date: document.getElementById("meetingSidenavDate").value,
      attendees: this.attendeeNames.length > 0
        ? [...this.attendeeNames]
        : undefined,
      agenda:
        document.getElementById("meetingSidenavAgenda").value.trim() ||
        undefined,
      notes:
        document.getElementById("meetingSidenavNotes").value.trim() ||
        undefined,
      actions: this.currentMeeting.actions ?? [],
    };
  }

  async save() {
    const data = this.getFormData();

    if (!data.title) {
      this.showSaveStatus("Title required");
      return;
    }

    Object.assign(this.currentMeeting, data);

    try {
      if (this.editingMeetingId) {
        await MeetingsAPI.update(this.editingMeetingId, data);
        this.showSaveStatus("Saved");
      } else {
        const res = await MeetingsAPI.create(data);
        const result = await res.json();
        this.editingMeetingId = result.id;
        this.currentMeeting.id = result.id;
        document.getElementById("meetingSidenavHeader").textContent =
          "Edit Meeting";
        document.getElementById("meetingSidenavDelete").classList.remove(
          "hidden",
        );
        this.showSaveStatus("Created");
      }

      await this.tm.meetingsModule.load();
    } catch (error) {
      console.error("Error saving meeting:", error);
      this.showSaveStatus("Error");
      showToast("Error saving meeting", "error");
    }
  }

  async handleDelete() {
    if (!this.editingMeetingId) return;
    const ok = await showConfirm(
      `Delete "${this.currentMeeting.title}"? This cannot be undone.`,
    );
    if (!ok) return;

    try {
      await MeetingsAPI.delete(this.editingMeetingId);
      showToast("Meeting deleted", "success");
      await this.tm.meetingsModule.load();
      this.close();
    } catch (error) {
      console.error("Error deleting meeting:", error);
      showToast("Error deleting meeting", "error");
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById("meetingSidenavSaveStatus");
    if (!statusEl) return;

    statusEl.textContent = text;
    statusEl.classList.remove(
      "hidden",
      "sidenav-status-saved",
      "sidenav-status-saving",
      "sidenav-status-error",
    );

    if (text === "Saved" || text === "Created") {
      statusEl.classList.add("sidenav-status-saved");
    } else if (text === "Error" || text === "Title required") {
      statusEl.classList.add("sidenav-status-error");
    } else {
      statusEl.classList.add("sidenav-status-saving");
    }

    if (text === "Saved" || text === "Created" || text === "Error") {
      setTimeout(() => statusEl.classList.add("hidden"), 2000);
    }
  }
}

function isOverdue(action) {
  if (!action.due || action.status === "done") return false;
  return action.due < new Date().toISOString().split("T")[0];
}
