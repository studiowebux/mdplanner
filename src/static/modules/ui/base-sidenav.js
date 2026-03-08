// Base Sidenav Module
// Template Method pattern for sidenav CRUD panels.
// Subclasses override: clearForm, fillForm, getFormData, api, entityName, prefix, reloadData

import { Sidenav } from "./sidenav.js";
import { showToast } from "./toast.js";
import { showConfirm } from "./confirm.js";
import { UndoManager } from "./undo-manager.js";

/** Global set of BaseSidenavModule instances that have unsaved changes. */
const _dirtyModules = new Set();

export function hasDirtyBaseSidenav() {
  return _dirtyModules.size > 0;
}

/**
 * Clear all dirty-module state without showing any confirmation.
 * Called by switchView() so that navigating between SPA views never leaves
 * stale dirty flags from a sidenav that was closed via the overlay or via
 * view-switching (i.e. without going through BaseSidenavModule.close()).
 */
export function clearAllDirtyModules() {
  _dirtyModules.forEach((m) => m._setDirty(false));
}

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
    this.isSaving = false;
    /** @type {Map<string, UndoManager>} keyed by element ID */
    this._undoManagers = new Map();
    /** True when any form field has been changed since last save/open. */
    this._formDirty = false;
    /** Delegated change listener for dirty tracking — removed on close. */
    this._dirtyListener = () => this._setDirty(true);
    /** updatedAt captured when an entity is loaded for editing. Sent on PUT for optimistic locking. */
    this._loadedUpdatedAt = null;
    /** Bound SSE listener for stale-edit detection — attached on openEdit, removed on close. */
    this._sseStaleListener = null;
    // ESC is now handled globally by Sidenav via registerModule/unregisterModule.
  }

  /** @abstract */ get prefix() { throw new Error("override prefix"); }
  /** @abstract */ get entityName() { throw new Error("override entityName"); }
  /** @abstract */ get api() { throw new Error("override api"); }
  /** @abstract */ get inputIds() { return []; }

  get panelId() { return `${this.prefix}Sidenav`; }
  get titleField() { return "title"; }
  get newLabel() { return `New ${this.entityName}`; }
  get editLabel() { return `Edit ${this.entityName}`; }
  /** Override to false in subclasses that should stay open after save (e.g. task sidenav). */
  get closeAfterSave() { return true; }

  // --- Element accessors (derived from prefix) ---

  el(suffix) {
    return document.getElementById(`${this.prefix}Sidenav${suffix}`);
  }

  // --- Lifecycle ---

  bindEvents() {
    this.el("Close")?.addEventListener("click", () => this._confirmAndClose());
    this.el("Cancel")?.addEventListener("click", () => this._confirmAndClose());
    this.el("Delete")?.addEventListener("click", () => this.handleDelete());

    const form = this.el("Form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await this.save();
      });
    }
  }

  openNew() {
    this.editingId = null;
    this._loadedUpdatedAt = null;
    this._setDirty(false);
    this.el("Header").textContent = this.newLabel;
    this.clearForm();
    this.el("Delete")?.classList.add("hidden");
    Sidenav.registerModule(this);
    Sidenav.open(this.panelId);
    this._ensureFullscreenToggle();
    this._attachUndoManagers();
    this._attachDirtyWatcher();
    this.onAfterOpen();
  }

  openEdit(entityId) {
    const entity = this.findEntity(entityId);
    if (!entity) return;

    this.editingId = entityId;
    this._loadedUpdatedAt = entity.updatedAt ?? entity.updated ?? null;
    this._setDirty(false);
    this.el("Header").textContent = this.editLabel;
    this.fillForm(entity);
    this.el("Delete")?.classList.remove("hidden");
    Sidenav.registerModule(this);
    Sidenav.open(this.panelId);
    this._ensureFullscreenToggle();
    this._attachUndoManagers();
    this._attachDirtyWatcher();
    this._attachStaleEditListener();
    this.onAfterOpen();
  }

  close() {
    Sidenav.unregisterModule();
    this._detachUndoManagers();
    this._detachDirtyWatcher();
    this._detachStaleEditListener();
    this._hideStaleEditBanner();
    this._setDirty(false);
    Sidenav.close(this.panelId);
    this.editingId = null;
    this._loadedUpdatedAt = null;
  }

  /** Close with dirty-state guard — used by ESC, Cancel, Close button. */
  async _confirmAndClose() {
    if (this._formDirty && !(await showConfirm("You have unsaved changes. Close anyway?", "Close"))) return;
    this.close();
  }

  async save() {
    if (this.isSaving) return;

    const data = this.getFormData();

    const requiredValue = data[this.titleField];
    if (!requiredValue || (typeof requiredValue === "string" && !requiredValue.trim())) {
      this.showSaveStatus(`${this.titleField.charAt(0).toUpperCase() + this.titleField.slice(1)} required`);
      return;
    }

    this.isSaving = true;
    try {
      if (this.editingId) {
        const updatePayload = this._loadedUpdatedAt
          ? { ...data, updatedAt: this._loadedUpdatedAt }
          : data;
        const response = await this.api.update(this.editingId, updatePayload);

        if (response.status === 409) {
          const body = await response.json();
          this._showConflictBanner(body.serverUpdatedAt);
          return;
        }
        if (response.status === 404) {
          showToast(
            `This ${this.entityName} no longer exists — it was deleted while you were editing.`,
            "error",
          );
          this._setDirty(false);
          this.close();
          await this.reloadData();
          return;
        }
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          this.showSaveStatus(body.error || "Error");
          showToast(body.error || `Error saving ${this.entityName}`, "error");
          return;
        }

        this._loadedUpdatedAt = null; // cleared — server will set a new updatedAt
        this._hideConflictBanner();
        this._hideStaleEditBanner();
        this._markAllSaved();
        this._setDirty(false);
        this.showSaveStatus("Saved");
      } else {
        const response = await this.api.create(data);
        const result = await response.json();
        if (!response.ok) {
          this.showSaveStatus(result.error || "Error");
          showToast(result.error || `Error creating ${this.entityName}`, "error");
          return;
        }
        this.editingId = result.id;
        this._markAllSaved();
        this._setDirty(false);
        this.showSaveStatus("Created");

        this.el("Header").textContent = this.editLabel;
        this.el("Delete")?.classList.remove("hidden");
      }

      await this.reloadData();
      this.tm.suppressSSE?.(this.entityName);
      this.onAfterSave();
      if (this.closeAfterSave) this.close();
    } catch (error) {
      console.error(`Error saving ${this.entityName}:`, error);
      this.showSaveStatus("Error");
      showToast(`Error saving ${this.entityName}`, "error");
    } finally {
      this.isSaving = false;
    }
  }

  _showConflictBanner(serverUpdatedAt) {
    let banner = this.el("ConflictBanner");
    if (!banner) {
      const container = document.getElementById(`${this.prefix}Sidenav`);
      if (!container) return;
      banner = document.createElement("div");
      banner.id = `${this.prefix}ConflictBanner`;
      banner.className = "sidenav-conflict-banner";
      const msg = document.createElement("p");
      msg.textContent = "This item was updated by someone else while you were editing.";
      const actions = document.createElement("div");
      actions.className = "sidenav-conflict-actions";
      const reloadBtn = document.createElement("button");
      reloadBtn.textContent = "Reload";
      reloadBtn.className = "btn-conflict-reload";
      reloadBtn.addEventListener("click", async () => {
        this._hideConflictBanner();
        await this.reloadData();
        if (this.editingId) {
          const refreshed = this.findEntity(this.editingId);
          if (refreshed) this.openEdit(refreshed);
        }
      });
      const overwriteBtn = document.createElement("button");
      overwriteBtn.textContent = "Overwrite";
      overwriteBtn.className = "btn-conflict-overwrite";
      overwriteBtn.addEventListener("click", () => {
        // Force-save: clear loadedUpdatedAt so the conflict check is skipped
        this._loadedUpdatedAt = null;
        this._hideConflictBanner();
        this.save();
      });
      actions.append(reloadBtn, overwriteBtn);
      banner.append(msg, actions);
      // Insert at top of sidenav body
      const body = container.querySelector(".sidenav-body") || container;
      body.prepend(banner);
    }
    banner.classList.remove("hidden");
    if (serverUpdatedAt) {
      const ts = banner.querySelector("p");
      if (ts) ts.textContent = `This item was updated at ${new Date(serverUpdatedAt).toLocaleTimeString()} while you were editing.`;
    }
  }

  _hideConflictBanner() {
    this.el("ConflictBanner")?.classList.add("hidden");
  }

  // --- SSE stale-edit detection ---

  /** Listen for remote updates to the entity currently open for editing. */
  _attachStaleEditListener() {
    this._detachStaleEditListener();
    if (!this.editingId) return;
    this._sseStaleListener = (e) => {
      const { action, id } = e.detail;
      if (action === "updated" && id === this.editingId) {
        this._showStaleEditBanner();
      }
      if (action === "deleted" && id === this.editingId) {
        showToast(
          `This ${this.entityName} was deleted by another session.`,
          "error",
        );
        this._setDirty(false);
        this.close();
        this.reloadData();
      }
    };
    document.addEventListener("mdplanner:change", this._sseStaleListener);
  }

  /** Remove the SSE stale-edit listener. */
  _detachStaleEditListener() {
    if (this._sseStaleListener) {
      document.removeEventListener("mdplanner:change", this._sseStaleListener);
      this._sseStaleListener = null;
    }
  }

  /** Show inline banner warning the user their local state is stale. */
  _showStaleEditBanner() {
    let banner = this.el("StaleBanner");
    if (!banner) {
      const container = document.getElementById(this.panelId);
      if (!container) return;
      banner = document.createElement("div");
      banner.id = `${this.prefix}StaleBanner`;
      banner.className = "sidenav-stale-banner";
      const msg = document.createElement("p");
      msg.textContent =
        "This item was updated in another session while you were editing.";
      const actions = document.createElement("div");
      actions.className = "sidenav-stale-actions";
      const reloadBtn = document.createElement("button");
      reloadBtn.textContent = "Reload";
      reloadBtn.className = "btn-stale-reload";
      reloadBtn.addEventListener("click", async () => {
        this._hideStaleEditBanner();
        await this.reloadData();
        if (this.editingId) {
          const refreshed = this.findEntity(this.editingId);
          if (refreshed) this.openEdit(refreshed);
        }
      });
      const keepBtn = document.createElement("button");
      keepBtn.textContent = "Keep editing";
      keepBtn.className = "btn-stale-keep";
      keepBtn.addEventListener("click", () => {
        this._hideStaleEditBanner();
      });
      actions.append(reloadBtn, keepBtn);
      banner.append(msg, actions);
      const body = container.querySelector(".sidenav-body") || container;
      body.prepend(banner);
    }
    banner.classList.remove("hidden");
  }

  _hideStaleEditBanner() {
    this.el("StaleBanner")?.classList.add("hidden");
  }

  async handleDelete() {
    if (!this.editingId) return;

    const entity = this.findEntity(this.editingId);
    if (!entity) return;

    const label = entity[this.titleField] || entity.name || entity.title || this.editingId;
    if (!(await showConfirm(`Delete "${label}"? This cannot be undone.`))) return;

    try {
      await this.api.delete(this.editingId);
      showToast(`${this.entityName} deleted`, "success");
      await this.reloadData();
      this.tm.suppressSSE?.(this.entityName);
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
      setTimeout(() => {
        if (this._hasAnyUnsavedChanges()) {
          statusEl.textContent = "Modified";
          statusEl.classList.remove(
            "hidden",
            "sidenav-status-saved",
            "sidenav-status-error",
            "sidenav-status-saving",
          );
          statusEl.classList.add("sidenav-status-unsaved");
        } else {
          statusEl.classList.add("hidden");
        }
      }, 2000);
    }
  }

  // --- Dirty state tracking ---

  _setDirty(value) {
    this._formDirty = value;
    if (value) {
      _dirtyModules.add(this);
    } else {
      _dirtyModules.delete(this);
    }
  }

  /** Attach a delegated input/change listener on the panel to detect any user edits. */
  _attachDirtyWatcher() {
    const panel = document.getElementById(this.panelId);
    if (!panel) return;
    panel.addEventListener("input", this._dirtyListener);
    panel.addEventListener("change", this._dirtyListener);
  }

  /** Remove the delegated dirty listener. */
  _detachDirtyWatcher() {
    const panel = document.getElementById(this.panelId);
    if (!panel) return;
    panel.removeEventListener("input", this._dirtyListener);
    panel.removeEventListener("change", this._dirtyListener);
  }

  // --- Undo/Redo support ---

  /** Attach one UndoManager per text-like field in inputIds. */
  _attachUndoManagers() {
    this._detachUndoManagers();
    for (const id of this.inputIds) {
      const el = document.getElementById(id);
      if (!el || !this._isTextLike(el)) continue;
      const manager = new UndoManager();
      manager.attach(el);
      this._undoManagers.set(id, manager);
    }
  }

  /** Detach all UndoManagers and clear the map. */
  _detachUndoManagers() {
    for (const manager of this._undoManagers.values()) {
      manager.detach();
    }
    this._undoManagers.clear();
  }

  /** Mark the current value as saved in every active UndoManager. */
  _markAllSaved() {
    for (const manager of this._undoManagers.values()) {
      manager.markSaved();
    }
  }

  /** Returns true if any text field has diverged from its saved baseline. */
  _hasAnyUnsavedChanges() {
    for (const manager of this._undoManagers.values()) {
      if (manager.hasUnsavedChanges()) return true;
    }
    return false;
  }

  /**
   * Returns true for textarea and text-like input elements.
   * Skips selects, date pickers, checkboxes, number inputs — undo on those is odd UX.
   * @param {HTMLElement} el
   */
  _isTextLike(el) {
    if (el.tagName === "TEXTAREA") return true;
    if (el.tagName === "INPUT") {
      const textTypes = ["text", "email", "url", "search", ""];
      return textTypes.includes((el.type ?? "").toLowerCase());
    }
    return false;
  }

  // --- Fullscreen toggle ---

  /**
   * Inject a fullscreen toggle button into the sidenav header (once per panel).
   * Restores the user's stored preference on every open.
   */
  _ensureFullscreenToggle() {
    const panel = document.getElementById(this.panelId);
    if (!panel) return;

    // Restore stored fullscreen state
    const stored = localStorage.getItem("sidenavFullscreen") === "1";
    panel.classList.toggle("sidenav-fullscreen", stored);

    // Inject button only once
    if (panel.querySelector(".sidenav-fullscreen-toggle")) return;

    const headerGroup = panel.querySelector(".sidenav-header > div") ||
      panel.querySelector(".sidenav-header");
    if (!headerGroup) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sidenav-fullscreen-toggle";
    btn.title = "Toggle fullscreen";
    btn.setAttribute("aria-label", "Toggle fullscreen");
    btn.innerHTML =
      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 3 21 3 21 9"></polyline>
        <polyline points="9 21 3 21 3 15"></polyline>
        <line x1="21" y1="3" x2="14" y2="10"></line>
        <line x1="3" y1="21" x2="10" y2="14"></line>
      </svg>`;

    btn.addEventListener("click", () => {
      const isFullscreen = panel.classList.toggle("sidenav-fullscreen");
      localStorage.setItem("sidenavFullscreen", isFullscreen ? "1" : "0");
    });

    const closeBtn = headerGroup.querySelector('[id$="SidenavClose"], .sidenav-close');
    if (closeBtn) {
      headerGroup.insertBefore(btn, closeBtn);
    } else {
      headerGroup.appendChild(btn);
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
