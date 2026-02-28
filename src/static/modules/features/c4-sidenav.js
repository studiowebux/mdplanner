// C4 Component Sidenav Module
// Slide-in panel for C4 component creation and editing

import { Sidenav } from "../ui/sidenav.js";
import { C4API } from "../api.js";
import { showToast } from "../ui/toast.js";
import { escapeHtml } from "../utils.js";

export class C4SidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingComponentId = null;
    this.currentComponent = null;
  }

  bindEvents() {
    document.getElementById("c4SidenavClose")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("c4SidenavCancel")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("c4SidenavSave")?.addEventListener(
      "click",
      () => this.save(),
    );
    document.getElementById("c4SidenavDelete")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );

    // Level change updates default type
    document.getElementById("c4SidenavLevel")?.addEventListener(
      "change",
      (e) => {
        if (!this.editingComponentId) {
          document.getElementById("c4SidenavType").value = this
            .getDefaultTypeForLevel(e.target.value);
        }
      },
    );

    // Add connection button
    document.getElementById("c4SidenavAddConnection")?.addEventListener(
      "click",
      () => {
        this.addConnectionInput();
      },
    );
  }

  openNew(x = 100, y = 100, level = null) {
    this.editingComponentId = null;

    // Determine target level based on navigation context
    let targetLevel = level || this.tm.currentC4Level || "context";
    if (this.tm.c4NavigationStack && this.tm.c4NavigationStack.length > 0) {
      const currentParentId =
        this.tm.c4NavigationStack[this.tm.c4NavigationStack.length - 1];
      const currentParent = this.tm.c4Components.find((c) =>
        c.id === currentParentId
      );
      if (currentParent) {
        const levels = ["context", "container", "component", "code"];
        const currentIndex = levels.indexOf(currentParent.level);
        targetLevel = currentIndex < levels.length - 1
          ? levels[currentIndex + 1]
          : "code";
      }
    }

    this.currentComponent = {
      name: "",
      level: targetLevel,
      type: this.getDefaultTypeForLevel(targetLevel),
      technology: "",
      description: "",
      position: { x, y },
      connections: [],
      children: [],
    };

    document.getElementById("c4SidenavHeader").textContent = "New C4 Component";
    document.getElementById("c4SidenavIdDisplay").classList.add("hidden");
    this.clearForm();
    this.fillForm();
    document.getElementById("c4SidenavDelete").classList.add("hidden");
    Sidenav.open("c4Sidenav");
    document.getElementById("c4SidenavName")?.focus();
  }

  openEdit(component) {
    if (!component) return;

    this.editingComponentId = component.id;
    this.currentComponent = JSON.parse(JSON.stringify(component)); // Deep copy

    document.getElementById("c4SidenavHeader").textContent =
      "Edit C4 Component";
    document.getElementById("c4SidenavIdDisplay").classList.remove("hidden");
    document.getElementById("c4SidenavIdValue").textContent = component.id;
    this.fillForm();
    document.getElementById("c4SidenavDelete").classList.remove("hidden");
    Sidenav.open("c4Sidenav");
  }

  close() {
    Sidenav.close("c4Sidenav");
    this.editingComponentId = null;
    this.currentComponent = null;
  }

  clearForm() {
    document.getElementById("c4SidenavName").value = "";
    document.getElementById("c4SidenavLevel").value = "context";
    document.getElementById("c4SidenavType").value = "System";
    document.getElementById("c4SidenavTechnology").value = "";
    document.getElementById("c4SidenavDescription").value = "";
    document.getElementById("c4SidenavX").value = "100";
    document.getElementById("c4SidenavY").value = "100";
    document.getElementById("c4SidenavConnections").innerHTML = "";
  }

  fillForm() {
    document.getElementById("c4SidenavName").value =
      this.currentComponent.name || "";
    document.getElementById("c4SidenavLevel").value =
      this.currentComponent.level || "context";
    document.getElementById("c4SidenavType").value =
      this.currentComponent.type ||
      this.getDefaultTypeForLevel(this.currentComponent.level);
    document.getElementById("c4SidenavTechnology").value =
      this.currentComponent.technology || "";
    document.getElementById("c4SidenavDescription").value =
      this.currentComponent.description || "";
    document.getElementById("c4SidenavX").value =
      this.currentComponent.position?.x || 100;
    document.getElementById("c4SidenavY").value =
      this.currentComponent.position?.y || 100;
    this.renderConnections();
  }

  renderConnections() {
    const container = document.getElementById("c4SidenavConnections");
    if (!container) return;

    const connections = this.currentComponent.connections || [];

    if (connections.length === 0) {
      container.innerHTML =
        '<div class="text-muted text-sm italic py-2">No connections defined</div>';
      return;
    }

    container.innerHTML = connections.map((conn, idx) => {
      const targetDisplay = this.getTargetDisplayName(conn.target);
      return `
        <div class="flex items-center gap-2 py-1 group bg-secondary rounded px-2">
          <div class="flex-1 min-w-0">
            <div class="text-sm text-secondary truncate">${
        escapeHtml(targetDisplay)
      }</div>
            <div class="text-xs text-muted truncate">${
        escapeHtml(conn.label || "No label")
      }</div>
          </div>
          <button onclick="taskManager.c4SidenavModule.editConnection(${idx})"
                  class="opacity-0 group-hover:opacity-100 text-muted hover:text-secondary flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
          <button onclick="taskManager.c4SidenavModule.removeConnection(${idx})"
                  class="opacity-0 group-hover:opacity-100 text-muted hover:text-error flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      `;
    }).join("");
  }

  getTargetDisplayName(target) {
    const component = this.tm.c4Components.find((c) =>
      c.id === target || c.name === target
    );
    return component ? component.name : target;
  }

  addConnectionInput() {
    const container = document.getElementById("c4SidenavConnections");
    const existingInput = container.querySelector(".c4-conn-input");
    if (existingInput) {
      existingInput.querySelector("input").focus();
      return;
    }

    // Clear "no connections" message
    if (container.querySelector(".text-muted")) {
      container.innerHTML = "";
    }

    const inputHtml = `
      <div class="c4-conn-input space-y-2 p-2 border border-strong rounded bg-primary">
        <div class="relative">
          <input type="text" class="c4-conn-target form-input text-sm" placeholder="Target component..." autocomplete="off">
          <div class="c4-conn-dropdown hidden absolute top-full left-0 right-0 bg-primary border border-strong rounded-b-md max-h-32 overflow-y-auto z-50 shadow-lg"></div>
        </div>
        <input type="text" class="c4-conn-label form-input text-sm" placeholder="Relationship label (e.g., reads/writes)">
        <div class="flex gap-2">
          <button type="button" class="c4-conn-save flex-1 px-2 py-1 text-xs bg-inverse text-inverse rounded hover:bg-inverse">Add</button>
          <button type="button" class="c4-conn-cancel flex-1 px-2 py-1 text-xs text-muted hover:text-secondary border border-strong rounded">Cancel</button>
        </div>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", inputHtml);

    const inputWrapper = container.querySelector(".c4-conn-input");
    const targetInput = inputWrapper.querySelector(".c4-conn-target");
    const labelInput = inputWrapper.querySelector(".c4-conn-label");
    const saveBtn = inputWrapper.querySelector(".c4-conn-save");
    const cancelBtn = inputWrapper.querySelector(".c4-conn-cancel");
    const dropdown = inputWrapper.querySelector(".c4-conn-dropdown");

    // Setup autocomplete
    this.setupTargetAutocomplete(targetInput, dropdown);

    const addConnection = () => {
      const target = targetInput.value.trim();
      const label = labelInput.value.trim();
      if (target && label) {
        if (!this.currentComponent.connections) {
          this.currentComponent.connections = [];
        }
        this.currentComponent.connections.push({ target, label });
        inputWrapper.remove();
        this.renderConnections();
      }
    };

    labelInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addConnection();
      if (e.key === "Escape") inputWrapper.remove();
    });
    targetInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") inputWrapper.remove();
    });
    saveBtn.addEventListener("click", addConnection);
    cancelBtn.addEventListener("click", () => {
      inputWrapper.remove();
      this.renderConnections();
    });
    targetInput.focus();
  }

  setupTargetAutocomplete(input, dropdown) {
    input.addEventListener("input", (e) => {
      const value = e.target.value.toLowerCase();
      const currentId = this.editingComponentId;

      const matches = this.tm.c4Components.filter((comp) =>
        comp.id !== currentId &&
        comp.name.toLowerCase().includes(value) &&
        value.length > 0
      );

      if (matches.length > 0 && value.length > 0) {
        dropdown.innerHTML = matches.map((comp) => `
          <div class="c4-dropdown-item px-3 py-2 hover:bg-tertiary cursor-pointer text-sm" data-id="${comp.id}" data-name="${comp.name}">
            ${
          escapeHtml(comp.name)
        } <span class="text-xs text-muted">(${comp.level})</span>
          </div>
        `).join("");
        dropdown.classList.remove("hidden");
      } else {
        dropdown.classList.add("hidden");
      }
    });

    input.addEventListener("blur", () => {
      setTimeout(() => dropdown.classList.add("hidden"), 150);
    });

    dropdown.addEventListener("click", (e) => {
      const item = e.target.closest(".c4-dropdown-item");
      if (item) {
        input.value = item.dataset.id;
        dropdown.classList.add("hidden");
        input.focus();
        // Move focus to label input
        const wrapper = input.closest(".c4-conn-input");
        if (wrapper) {
          wrapper.querySelector(".c4-conn-label")?.focus();
        }
      }
    });
  }

  editConnection(index) {
    const conn = this.currentComponent.connections[index];
    if (!conn) return;

    const container = document.getElementById("c4SidenavConnections");
    const items = container.querySelectorAll(".group");
    const targetItem = items[index];
    if (!targetItem) return;

    targetItem.innerHTML = `
      <div class="c4-conn-input w-full space-y-2">
        <div class="relative">
          <input type="text" class="c4-conn-target form-input text-sm" value="${
      escapeHtml(conn.target)
    }" autocomplete="off">
          <div class="c4-conn-dropdown hidden absolute top-full left-0 right-0 bg-primary border border-strong rounded-b-md max-h-32 overflow-y-auto z-50 shadow-lg"></div>
        </div>
        <input type="text" class="c4-conn-label form-input text-sm" value="${
      escapeHtml(conn.label || "")
    }">
        <div class="flex gap-2">
          <button type="button" class="c4-conn-save flex-1 px-2 py-1 text-xs bg-inverse text-inverse rounded hover:bg-inverse">Save</button>
          <button type="button" class="c4-conn-cancel flex-1 px-2 py-1 text-xs text-muted hover:text-secondary border border-strong rounded">Cancel</button>
        </div>
      </div>
    `;

    const inputWrapper = targetItem.querySelector(".c4-conn-input");
    const targetInput = inputWrapper.querySelector(".c4-conn-target");
    const labelInput = inputWrapper.querySelector(".c4-conn-label");
    const saveBtn = inputWrapper.querySelector(".c4-conn-save");
    const cancelBtn = inputWrapper.querySelector(".c4-conn-cancel");
    const dropdown = inputWrapper.querySelector(".c4-conn-dropdown");

    this.setupTargetAutocomplete(targetInput, dropdown);

    const saveEdit = () => {
      const target = targetInput.value.trim();
      const label = labelInput.value.trim();
      if (target && label) {
        this.currentComponent.connections[index] = { target, label };
        this.renderConnections();
      }
    };

    labelInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") saveEdit();
      if (e.key === "Escape") this.renderConnections();
    });
    saveBtn.addEventListener("click", saveEdit);
    cancelBtn.addEventListener("click", () => this.renderConnections());
    targetInput.focus();
  }

  removeConnection(index) {
    this.currentComponent.connections.splice(index, 1);
    this.renderConnections();
  }

  getDefaultTypeForLevel(level) {
    switch (level) {
      case "context":
        return "System";
      case "container":
        return "Container";
      case "component":
        return "Component";
      case "code":
        return "Class";
      default:
        return "System";
    }
  }

  getFormData() {
    return {
      name: document.getElementById("c4SidenavName").value.trim(),
      level: document.getElementById("c4SidenavLevel").value,
      type: document.getElementById("c4SidenavType").value.trim(),
      technology: document.getElementById("c4SidenavTechnology").value.trim(),
      description: document.getElementById("c4SidenavDescription").value.trim(),
      position: {
        x: parseInt(document.getElementById("c4SidenavX").value) || 100,
        y: parseInt(document.getElementById("c4SidenavY").value) || 100,
      },
      connections: this.currentComponent.connections || [],
      children: this.currentComponent.children || [],
    };
  }

  async save() {
    const data = this.getFormData();

    if (!data.name) {
      this.showSaveStatus("Name required");
      return;
    }

    // Update currentComponent with form data
    Object.assign(this.currentComponent, data);

    try {
      if (this.editingComponentId) {
        // Update existing component
        const index = this.tm.c4Components.findIndex((c) =>
          c.id === this.editingComponentId
        );
        if (index !== -1) {
          // Preserve parent reference
          data.parent = this.tm.c4Components[index].parent;
          data.id = this.editingComponentId;
          this.tm.c4Components[index] = data;
        }
        this.showSaveStatus("Saved");
      } else {
        // Create new component
        data.id = this.generateId();
        this.editingComponentId = data.id;
        this.currentComponent.id = data.id;

        // Set parent if we're inside a drilldown
        if (this.tm.c4NavigationStack && this.tm.c4NavigationStack.length > 0) {
          data.parent =
            this.tm.c4NavigationStack[this.tm.c4NavigationStack.length - 1];
          const parent = this.tm.c4Components.find((c) => c.id === data.parent);
          if (parent) {
            if (!parent.children) parent.children = [];
            if (!parent.children.includes(data.id)) {
              parent.children.push(data.id);
            }
          }
        }

        this.tm.c4Components.push(data);
        this.showSaveStatus("Created");

        // Update UI
        document.getElementById("c4SidenavHeader").textContent =
          "Edit C4 Component";
        document.getElementById("c4SidenavIdDisplay").classList.remove(
          "hidden",
        );
        document.getElementById("c4SidenavIdValue").textContent = data.id;
        document.getElementById("c4SidenavDelete").classList.remove("hidden");
      }

      // Save and re-render
      await C4API.save({ components: this.tm.c4Components });
      this.tm.c4Module.render();
    } catch (error) {
      console.error("Error saving C4 component:", error);
      this.showSaveStatus("Error");
      showToast("Error saving component", "error");
    }
  }

  generateId() {
    let maxId = 0;
    this.tm.c4Components.forEach((comp) => {
      const match = comp.id.match(/c4_component_(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) maxId = num;
      }
    });
    return `c4_component_${maxId + 1}`;
  }

  async handleDelete() {
    if (!this.editingComponentId) return;

    const component = this.tm.c4Components.find((c) =>
      c.id === this.editingComponentId
    );
    if (!component) return;

    if (
      !confirm(
        `Delete "${component.name}"? This will also remove any children and connections.`,
      )
    ) return;

    try {
      // Use the c4Module's delete method which handles cascading deletes
      this.tm.c4Module.delete(this.editingComponentId);
      showToast("Component deleted", "success");
      this.close();
    } catch (error) {
      console.error("Error deleting component:", error);
      showToast("Error deleting component", "error");
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById("c4SidenavSaveStatus");
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
    } else if (text === "Error" || text === "Name required") {
      statusEl.classList.add("sidenav-status-error");
    } else {
      statusEl.classList.add("sidenav-status-saving");
    }

    if (text === "Saved" || text === "Created" || text === "Error") {
      setTimeout(() => statusEl.classList.add("hidden"), 2000);
    }
  }
}

export default C4SidenavModule;
