// Retrospective Sidenav Module
// Slide-in panel for retrospective creation and editing (Continue/Stop/Start)

import { Sidenav } from "../ui/sidenav.js";
import { RetrospectivesAPI } from "../api.js";
import { showToast } from "../ui/toast.js";

export class RetrospectiveSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingRetroId = null;
    this.autoSaveTimeout = null;
  }

  bindEvents() {
    // Close button
    document.getElementById("retroSidenavClose")?.addEventListener(
      "click",
      () => {
        this.close();
      },
    );

    // Cancel button
    document.getElementById("retroSidenavCancel")?.addEventListener(
      "click",
      () => {
        this.close();
      },
    );

    // Delete button
    document.getElementById("retroSidenavDelete")?.addEventListener(
      "click",
      () => {
        this.handleDelete();
      },
    );

    // Form submit
    document.getElementById("retroSidenavForm")?.addEventListener(
      "submit",
      async (e) => {
        e.preventDefault();
        await this.save();
      },
    );

    // Auto-save on input changes
    const inputs = [
      "retroSidenavTitle",
      "retroSidenavDate",
      "retroSidenavStatus",
      "retroSidenavContinue",
      "retroSidenavStop",
      "retroSidenavStart",
    ];
    inputs.forEach((id) => {
      document.getElementById(id)?.addEventListener("input", () => {
        if (this.editingRetroId) {
          this.scheduleAutoSave();
        }
      });
      document.getElementById(id)?.addEventListener("change", () => {
        if (this.editingRetroId) {
          this.scheduleAutoSave();
        }
      });
    });
  }

  openNew() {
    this.editingRetroId = null;

    // Update header
    document.getElementById("retroSidenavHeader").textContent =
      "New Retrospective";

    // Reset form
    this.clearForm();

    // Hide delete button
    document.getElementById("retroSidenavDelete").classList.add("hidden");

    // Open sidenav
    Sidenav.open("retroSidenav");
  }

  openEdit(retroId) {
    const retro = this.tm.retrospectives.find((r) => r.id === retroId);
    if (!retro) return;

    this.editingRetroId = retroId;

    // Update header
    document.getElementById("retroSidenavHeader").textContent =
      "Edit Retrospective";

    // Fill form
    this.fillForm(retro);

    // Show delete button
    document.getElementById("retroSidenavDelete").classList.remove("hidden");

    // Open sidenav
    Sidenav.open("retroSidenav");
  }

  close() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }

    Sidenav.close("retroSidenav");
    this.editingRetroId = null;
  }

  clearForm() {
    document.getElementById("retroSidenavTitle").value = "";
    document.getElementById("retroSidenavDate").value =
      new Date().toISOString().split("T")[0];
    document.getElementById("retroSidenavStatus").value = "open";
    document.getElementById("retroSidenavContinue").value = "";
    document.getElementById("retroSidenavStop").value = "";
    document.getElementById("retroSidenavStart").value = "";
  }

  fillForm(retro) {
    document.getElementById("retroSidenavTitle").value = retro.title || "";
    document.getElementById("retroSidenavDate").value = retro.date || "";
    document.getElementById("retroSidenavStatus").value = retro.status ||
      "open";
    document.getElementById("retroSidenavContinue").value =
      (retro.continue || []).join("\n");
    document.getElementById("retroSidenavStop").value = (retro.stop || []).join(
      "\n",
    );
    document.getElementById("retroSidenavStart").value = (retro.start || [])
      .join("\n");
  }

  parseItems(text) {
    return text.split("\n").map((s) => s.trim()).filter((s) => s);
  }

  getFormData() {
    return {
      title: document.getElementById("retroSidenavTitle").value.trim(),
      date: document.getElementById("retroSidenavDate").value,
      status: document.getElementById("retroSidenavStatus").value,
      continue: this.parseItems(
        document.getElementById("retroSidenavContinue").value,
      ),
      stop: this.parseItems(document.getElementById("retroSidenavStop").value),
      start: this.parseItems(
        document.getElementById("retroSidenavStart").value,
      ),
    };
  }

  scheduleAutoSave() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.showSaveStatus("Saving...");

    this.autoSaveTimeout = setTimeout(async () => {
      await this.save();
    }, 1000);
  }

  async save() {
    const data = this.getFormData();

    if (!data.title) {
      this.showSaveStatus("Title required");
      return;
    }

    try {
      if (this.editingRetroId) {
        await RetrospectivesAPI.update(this.editingRetroId, data);
        this.showSaveStatus("Saved");
      } else {
        const response = await RetrospectivesAPI.create(data);
        const result = await response.json();
        this.editingRetroId = result.id;
        this.showSaveStatus("Created");

        // Update header and show delete button
        document.getElementById("retroSidenavHeader").textContent =
          "Edit Retrospective";
        document.getElementById("retroSidenavDelete").classList.remove(
          "hidden",
        );
      }

      // Reload and re-render
      await this.tm.retrospectivesModule.load();
    } catch (error) {
      console.error("Error saving retrospective:", error);
      this.showSaveStatus("Error");
      showToast("Error saving retrospective", "error");
    }
  }

  async handleDelete() {
    if (!this.editingRetroId) return;

    const retro = this.tm.retrospectives.find((r) =>
      r.id === this.editingRetroId
    );
    if (!retro) return;

    if (!confirm(`Delete "${retro.title}"? This cannot be undone.`)) return;

    try {
      await RetrospectivesAPI.delete(this.editingRetroId);
      showToast("Retrospective deleted", "success");
      await this.tm.retrospectivesModule.load();
      this.close();
    } catch (error) {
      console.error("Error deleting retrospective:", error);
      showToast("Error deleting retrospective", "error");
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById("retroSidenavSaveStatus");
    if (!statusEl) return;

    statusEl.textContent = text;
    statusEl.classList.remove(
      "hidden",
      "text-green-600",
      "text-red-500",
      "text-gray-500",
    );

    if (text === "Saved" || text === "Created") {
      statusEl.classList.add("text-green-600", "dark:text-green-400");
    } else if (text === "Error" || text === "Title required") {
      statusEl.classList.add("text-red-500");
    } else {
      statusEl.classList.add("text-gray-500", "dark:text-gray-400");
    }

    if (text === "Saved" || text === "Created" || text === "Error") {
      setTimeout(() => {
        statusEl.classList.add("hidden");
      }, 2000);
    }
  }
}

export default RetrospectiveSidenavModule;
