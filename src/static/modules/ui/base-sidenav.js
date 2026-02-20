// Base Sidenav Module
// Template Method pattern for sidenav CRUD panels.
// Subclasses override: clearForm, fillForm, getFormData, api, entityName, prefix, reloadData

import { Sidenav } from "./sidenav.js";
import { showToast } from "./toast.js";

const AUTO_SAVE_DELAY = 1000;

/**
 * Base class for sidenav modules that follow the standard CRUD pattern.
 *
 * Subclass contract — override these:
 *   prefix        - string, element ID prefix (e.g. "goal" -> goalSidenav, goalSidenavClose, ...)
 *   entityName    - string, human label for toasts (e.g. "goal")
 *   api           - object with create(data), update(id, data), delete(id) methods
 *   inputIds      - string[], element IDs that trigger auto-save on input/change
 *   clearForm()   - reset all form inputs to defaults
 *   fillForm(entity)   - populate form inputs from entity object
 *   getFormData()      - return plain object from form inputs
 *   findEntity(id)     - return entity from taskManager data by id
 *   reloadData()       - async, reload view data after save/delete
 *
 * Optional overrides:
 *   titleField    - string, form data key used for required-field validation (default: "title")
 *   newLabel      - string, header text for new entity (default: "New <EntityName>")
 *   editLabel     - string, header text for edit (default: "Edit <EntityName>")
 *   onAfterOpen() - hook called after openNew/openEdit completes
 *   onAfterSave() - hook called after successful save
 */
export class BaseSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingId = null;
    this.autoSaveTimeout = null;
  }

  /** @abstract */ get prefix() { throw new Error("override prefix"); }
  /** @abstract */ get entityName() { throw new Error("override entityName"); }
  /** @abstract */ get api() { throw new Error("override api"); }
  /** @abstract */ get inputIds() { return []; }

  get panelId() { return `${this.prefix}Sidenav`; }
  get titleField() { return "title"; }
  get newLabel() { return `New ${this.entityName}`; }
  get editLabel() { return `Edit ${this.entityName}`; }

  // --- Element accessors (derived from prefix) ---

  el(suffix) {
    return document.getElementById(`${this.prefix}Sidenav${suffix}`);
  }

  // --- Lifecycle ---

  bindEvents() {
    this.el("Close")?.addEventListener("click", () => this.close());
    this.el("Cancel")?.addEventListener("click", () => this.close());
    this.el("Delete")?.addEventListener("click", () => this.handleDelete());

    const form = this.el("Form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await this.save();
      });
    }

    this.inputIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const handler = () => { if (this.editingId) this.scheduleAutoSave(); };
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
    });
  }

  openNew() {
    this.editingId = null;
    this.el("Header").textContent = this.newLabel;
    this.clearForm();
    this.el("Delete")?.classList.add("hidden");
    Sidenav.open(this.panelId);
    this.onAfterOpen();
  }

  openEdit(entityId) {
    const entity = this.findEntity(entityId);
    if (!entity) return;

    this.editingId = entityId;
    this.el("Header").textContent = this.editLabel;
    this.fillForm(entity);
    this.el("Delete")?.classList.remove("hidden");
    Sidenav.open(this.panelId);
    this.onAfterOpen();
  }

  close() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }
    Sidenav.close(this.panelId);
    this.editingId = null;
  }

  // --- Auto-save ---

  scheduleAutoSave() {
    if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
    this.showSaveStatus("Saving...");
    this.autoSaveTimeout = setTimeout(() => this.save(), AUTO_SAVE_DELAY);
  }

  async save() {
    const data = this.getFormData();

    const requiredValue = data[this.titleField];
    if (!requiredValue || (typeof requiredValue === "string" && !requiredValue.trim())) {
      this.showSaveStatus(`${this.titleField.charAt(0).toUpperCase() + this.titleField.slice(1)} required`);
      return;
    }

    try {
      if (this.editingId) {
        await this.api.update(this.editingId, data);
        this.showSaveStatus("Saved");
      } else {
        const response = await this.api.create(data);
        const result = await response.json();
        this.editingId = result.id;
        this.showSaveStatus("Created");

        this.el("Header").textContent = this.editLabel;
        this.el("Delete")?.classList.remove("hidden");
      }

      await this.reloadData();
      this.onAfterSave();
    } catch (error) {
      console.error(`Error saving ${this.entityName}:`, error);
      this.showSaveStatus("Error");
      showToast(`Error saving ${this.entityName}`, "error");
    }
  }

  async handleDelete() {
    if (!this.editingId) return;

    const entity = this.findEntity(this.editingId);
    if (!entity) return;

    const label = entity[this.titleField] || entity.name || entity.title || this.editingId;
    if (!confirm(`Delete "${label}"? This cannot be undone.`)) return;

    try {
      await this.api.delete(this.editingId);
      showToast(`${this.entityName} deleted`, "success");
      await this.reloadData();
      this.close();
    } catch (error) {
      console.error(`Error deleting ${this.entityName}:`, error);
      showToast(`Error deleting ${this.entityName}`, "error");
    }
  }

  // --- Status display (replaces hardcoded Tailwind colors) ---

  showSaveStatus(text) {
    const statusEl = this.el("SaveStatus");
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
    } else if (text === "Error" || text.includes("required")) {
      statusEl.classList.add("sidenav-status-error");
    } else {
      statusEl.classList.add("sidenav-status-saving");
    }

    if (text === "Saved" || text === "Created" || text === "Error") {
      setTimeout(() => statusEl.classList.add("hidden"), 2000);
    }
  }

  // --- Hooks (override in subclass as needed) ---

  onAfterOpen() {}
  onAfterSave() {}

  // --- Abstract methods ---

  /** @abstract */ clearForm() { throw new Error("override clearForm"); }
  /** @abstract */ fillForm(_entity) { throw new Error("override fillForm"); }
  /** @abstract */ getFormData() { throw new Error("override getFormData"); }
  /** @abstract */ findEntity(_id) { throw new Error("override findEntity"); }
  /** @abstract */ async reloadData() { throw new Error("override reloadData"); }
}

export default BaseSidenavModule;
