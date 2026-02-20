// Sticky Note Sidenav Module
// Pattern: Template Method (extends BaseSidenavModule)

import { BaseSidenavModule } from "../ui/base-sidenav.js";
import { CanvasAPI } from "../api.js";
import { showToast } from "../ui/toast.js";

export class StickyNoteSidenavModule extends BaseSidenavModule {
  constructor(taskManager) {
    super(taskManager);
    this.selectedColor = "yellow";
  }

  get prefix() { return "sticky"; }
  get entityName() { return "Sticky Note"; }
  get api() { return CanvasAPI; }
  get titleField() { return "content"; }
  get newLabel() { return "New Sticky Note"; }
  get editLabel() { return "Edit Sticky Note"; }
  get inputIds() { return ["stickySidenavContent"]; }

  bindEvents() {
    super.bindEvents();

    // Color picker
    document.querySelectorAll("#stickySidenav .color-option").forEach((opt) => {
      opt.addEventListener("click", () => {
        this.selectColor(opt.dataset.color);
        if (this.editingId) this.scheduleAutoSave();
      });
    });
  }

  selectColor(color) {
    this.selectedColor = color;
    document.querySelectorAll("#stickySidenav .color-option").forEach((opt) => {
      opt.classList.remove(
        "selected", "ring-2", "ring-offset-2",
        "ring-gray-900", "dark:ring-gray-100",
      );
      if (opt.dataset.color === color) {
        opt.classList.add(
          "selected", "ring-2", "ring-offset-2",
          "ring-gray-900", "dark:ring-gray-100",
        );
      }
    });
  }

  clearForm() {
    document.getElementById("stickySidenavContent").value = "";
    this.selectColor("yellow");
  }

  fillForm(sticky) {
    document.getElementById("stickySidenavContent").value = sticky.content || "";
    this.selectColor(sticky.color || "yellow");
  }

  getFormData() {
    return {
      content: document.getElementById("stickySidenavContent").value.trim(),
      color: this.selectedColor,
    };
  }

  /** Override: add random position on create */
  async save() {
    const data = this.getFormData();

    if (!data.content) {
      this.showSaveStatus("Content required");
      return;
    }

    try {
      if (this.editingId) {
        await CanvasAPI.update(this.editingId, data);
        this.showSaveStatus("Saved");
      } else {
        data.position = {
          x: 100 + Math.random() * 200,
          y: 100 + Math.random() * 200,
        };
        const response = await CanvasAPI.create(data);
        const result = await response.json();
        this.editingId = result.id;
        this.showSaveStatus("Created");

        this.el("Header").textContent = this.editLabel;
        this.el("Delete")?.classList.remove("hidden");
      }

      await this.reloadData();
    } catch (error) {
      console.error("Error saving sticky note:", error);
      this.showSaveStatus("Error");
      showToast("Error saving sticky note", "error");
    }
  }

  findEntity(id) {
    return this.tm.canvasModule.stickyNotes.find((s) => s.id === id);
  }

  async reloadData() {
    await this.tm.canvasModule.load();
  }
}

export default StickyNoteSidenavModule;
