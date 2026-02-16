// Sticky Note Sidenav Module
// Slide-in panel for sticky note creation and editing

import { Sidenav } from "../ui/sidenav.js";
import { CanvasAPI } from "../api.js";
import { showToast } from "../ui/toast.js";

export class StickyNoteSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingStickyId = null;
    this.selectedColor = "yellow";
    this.autoSaveTimeout = null;
  }

  bindEvents() {
    // Close button
    document.getElementById("stickySidenavClose")?.addEventListener(
      "click",
      () => {
        this.close();
      },
    );

    // Cancel button
    document.getElementById("stickySidenavCancel")?.addEventListener(
      "click",
      () => {
        this.close();
      },
    );

    // Delete button
    document.getElementById("stickySidenavDelete")?.addEventListener(
      "click",
      () => {
        this.handleDelete();
      },
    );

    // Form submit
    document.getElementById("stickySidenavForm")?.addEventListener(
      "submit",
      async (e) => {
        e.preventDefault();
        await this.save();
      },
    );

    // Auto-save on content change
    document.getElementById("stickySidenavContent")?.addEventListener(
      "input",
      () => {
        if (this.editingStickyId) {
          this.scheduleAutoSave();
        }
      },
    );

    // Color picker
    document.querySelectorAll("#stickySidenav .color-option").forEach((opt) => {
      opt.addEventListener("click", () => {
        this.selectColor(opt.dataset.color);
        if (this.editingStickyId) {
          this.scheduleAutoSave();
        }
      });
    });
  }

  openNew() {
    this.editingStickyId = null;
    this.selectedColor = "yellow";

    // Update header
    document.getElementById("stickySidenavHeader").textContent =
      "New Sticky Note";

    // Reset form
    this.clearForm();

    // Hide delete button
    document.getElementById("stickySidenavDelete").classList.add("hidden");

    // Open sidenav
    Sidenav.open("stickySidenav");
  }

  openEdit(stickyId) {
    const sticky = this.tm.canvasModule.stickyNotes.find((s) =>
      s.id === stickyId
    );
    if (!sticky) return;

    this.editingStickyId = stickyId;

    // Update header
    document.getElementById("stickySidenavHeader").textContent =
      "Edit Sticky Note";

    // Fill form
    this.fillForm(sticky);

    // Show delete button
    document.getElementById("stickySidenavDelete").classList.remove("hidden");

    // Open sidenav
    Sidenav.open("stickySidenav");
  }

  close() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }

    Sidenav.close("stickySidenav");
    this.editingStickyId = null;
  }

  clearForm() {
    document.getElementById("stickySidenavContent").value = "";
    this.selectColor("yellow");
  }

  fillForm(sticky) {
    document.getElementById("stickySidenavContent").value = sticky.content ||
      "";
    this.selectColor(sticky.color || "yellow");
  }

  selectColor(color) {
    this.selectedColor = color;
    document.querySelectorAll("#stickySidenav .color-option").forEach((opt) => {
      opt.classList.remove(
        "selected",
        "ring-2",
        "ring-offset-2",
        "ring-gray-900",
        "dark:ring-gray-100",
      );
      if (opt.dataset.color === color) {
        opt.classList.add(
          "selected",
          "ring-2",
          "ring-offset-2",
          "ring-gray-900",
          "dark:ring-gray-100",
        );
      }
    });
  }

  getFormData() {
    return {
      content: document.getElementById("stickySidenavContent").value.trim(),
      color: this.selectedColor,
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

    if (!data.content) {
      this.showSaveStatus("Content required");
      return;
    }

    try {
      if (this.editingStickyId) {
        await CanvasAPI.update(this.editingStickyId, data);
        this.showSaveStatus("Saved");
      } else {
        // New sticky note - add random position
        data.position = {
          x: 100 + Math.random() * 200,
          y: 100 + Math.random() * 200,
        };

        const response = await CanvasAPI.create(data);
        const result = await response.json();
        this.editingStickyId = result.id;
        this.showSaveStatus("Created");

        // Update header and show delete button
        document.getElementById("stickySidenavHeader").textContent =
          "Edit Sticky Note";
        document.getElementById("stickySidenavDelete").classList.remove(
          "hidden",
        );
      }

      // Reload canvas
      await this.tm.canvasModule.load();
    } catch (error) {
      console.error("Error saving sticky note:", error);
      this.showSaveStatus("Error");
      showToast("Error saving sticky note", "error");
    }
  }

  async handleDelete() {
    if (!this.editingStickyId) return;

    if (!confirm("Delete this sticky note? This cannot be undone.")) return;

    try {
      await CanvasAPI.delete(this.editingStickyId);
      showToast("Sticky note deleted", "success");
      await this.tm.canvasModule.load();
      this.close();
    } catch (error) {
      console.error("Error deleting sticky note:", error);
      showToast("Error deleting sticky note", "error");
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById("stickySidenavSaveStatus");
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
    } else if (text === "Error" || text === "Content required") {
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

export default StickyNoteSidenavModule;
