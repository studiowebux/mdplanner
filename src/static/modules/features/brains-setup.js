// Brain Setup Panel — scaffold new brain with selective rule symlinks
import { BrainsAPI } from "../api.js";

export class BrainSetupPanel {
  constructor(brainsModule) {
    this.mod = brainsModule;
    this.availableStacks = [];
    this.availablePractices = [];
    this.availableWorkflows = [];
  }

  async render() {
    const panel = document.getElementById("brainsContent");
    if (!panel) return;

    panel.innerHTML =
      '<div class="brain-loading">Loading rule options...</div>';

    try {
      const [stacks, practices, workflows] = await Promise.all([
        BrainsAPI.fetchStacks(),
        BrainsAPI.fetchPractices(),
        BrainsAPI.fetchWorkflows(),
      ]);
      this.availableStacks = stacks;
      this.availablePractices = practices;
      this.availableWorkflows = workflows;
      this._renderForm();
    } catch {
      panel.innerHTML =
        '<div class="brain-error">Failed to load rule options</div>';
    }
  }

  _renderForm() {
    const panel = document.getElementById("brainsContent");
    if (!panel) return;

    panel.innerHTML = `
      <div class="brain-setup-form">
        <h3>Scaffold New Brain</h3>

        <div class="brain-setup-field">
          <label for="brainSetupName">Brain Name</label>
          <input type="text" id="brainSetupName" placeholder="my-project">
          <span class="brain-setup-hint">Directory will be named {name}-brain</span>
        </div>

        <div class="brain-setup-field">
          <label for="brainSetupParentDir">Parent Directory</label>
          <input type="text" id="brainSetupParentDir" placeholder="/path/to/brains">
        </div>

        <div class="brain-setup-field">
          <label for="brainSetupCodeRepo">Code Repository Path</label>
          <input type="text" id="brainSetupCodeRepo" placeholder="/path/to/code (optional)">
          <span class="brain-setup-hint">Added to additionalDirectories in settings.json</span>
        </div>

        <div class="brain-setup-rules">
          <div class="brain-setup-rule-group">
            <h4>Stacks</h4>
            <div class="brain-setup-checkboxes">
              ${this._renderCheckboxes("stack", this.availableStacks)}
            </div>
          </div>

          <div class="brain-setup-rule-group">
            <h4>Practices</h4>
            <div class="brain-setup-checkboxes">
              ${this._renderCheckboxes("practice", this.availablePractices)}
            </div>
          </div>

          <div class="brain-setup-rule-group">
            <h4>Workflows</h4>
            <div class="brain-setup-checkboxes">
              ${this._renderCheckboxes("workflow", this.availableWorkflows)}
            </div>
          </div>
        </div>

        <div class="brain-setup-actions">
          <button id="brainSetupSubmitBtn" class="btn-outline">Create Brain</button>
          <span id="brainSetupStatus" class="brain-setup-status"></span>
        </div>
      </div>
    `;
  }

  _renderCheckboxes(prefix, items) {
    if (!items.length) return '<span class="text-tertiary">None available</span>';
    return items
      .map(
        (item) => `
      <label class="brain-setup-checkbox">
        <input type="checkbox" data-rule-type="${prefix}" value="${item}" checked>
        <span>${item}</span>
      </label>
    `,
      )
      .join("");
  }

  async _submit() {
    const name = document.getElementById("brainSetupName")?.value?.trim();
    const parentDir = document
      .getElementById("brainSetupParentDir")
      ?.value?.trim();
    const codeRepoPath =
      document.getElementById("brainSetupCodeRepo")?.value?.trim() || "";
    const status = document.getElementById("brainSetupStatus");
    const btn = document.getElementById("brainSetupSubmitBtn");

    if (!name || !parentDir) {
      if (status) status.textContent = "Name and parent directory are required";
      return;
    }

    const stacks = this._getChecked("stack");
    const practices = this._getChecked("practice");
    const workflows = this._getChecked("workflow");

    if (btn) {
      btn.disabled = true;
      btn.textContent = "Creating...";
    }
    if (status) status.textContent = "";

    try {
      const resp = await BrainsAPI.setup(name, {
        parentDir,
        codeRepoPath,
        stacks,
        practices,
        workflows,
      });
      const result = await resp.json();
      if (resp.ok) {
        if (status) {
          status.textContent = `Created: ${result.brainDir}`;
          status.className = "brain-setup-status success";
        }
        // Reload brain list
        await this.mod.load();
      } else {
        if (status) {
          status.textContent = result.error || "Setup failed";
          status.className = "brain-setup-status error";
        }
      }
    } catch {
      if (status) {
        status.textContent = "Setup failed";
        status.className = "brain-setup-status error";
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Create Brain";
      }
    }
  }

  _getChecked(type) {
    const checked = document.querySelectorAll(
      `input[data-rule-type="${type}"]:checked`,
    );
    return Array.from(checked).map((cb) => cb.value);
  }

  bindEvents() {
    document
      .getElementById("brainsContent")
      ?.addEventListener("click", (e) => {
        if (e.target.id === "brainSetupSubmitBtn") {
          this._submit();
        }
      });
  }
}
