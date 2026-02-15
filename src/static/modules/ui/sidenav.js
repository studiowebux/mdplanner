// Sidenav Component
// Slide-in panel from the right side

export class Sidenav {
  static activePanel = null;
  static overlay = null;
  static initialized = false;

  static init() {
    if (this.initialized) return;

    // Create overlay element
    this.overlay = document.createElement("div");
    this.overlay.className = "sidenav-overlay";
    this.overlay.addEventListener("click", () => this.closeActive());
    document.body.appendChild(this.overlay);

    // Escape key handler
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.activePanel) {
        this.closeActive();
      }
    });

    this.initialized = true;
  }

  /**
   * Open a sidenav panel
   * @param {string} panelId - ID of the sidenav panel element
   * @param {Object} options - Optional configuration
   * @returns {HTMLElement} The panel element
   */
  static open(panelId, options = {}) {
    this.init();

    const panel = document.getElementById(panelId);
    if (!panel) {
      console.error(`Sidenav panel not found: ${panelId}`);
      return null;
    }

    // Close any active panel first
    if (this.activePanel && this.activePanel !== panel) {
      this.close(this.activePanel.id);
    }

    // Show overlay
    this.overlay.classList.add("active");

    // Show panel
    panel.classList.add("active");
    this.activePanel = panel;

    // Focus first input if requested
    if (options.focusFirst !== false) {
      setTimeout(() => {
        const firstInput = panel.querySelector(
          'input:not([type="hidden"]), textarea, select'
        );
        if (firstInput) firstInput.focus();
      }, 100);
    }

    // Prevent body scroll
    document.body.style.overflow = "hidden";

    // Callback
    if (options.onOpen) options.onOpen(panel);

    return panel;
  }

  /**
   * Close a specific sidenav panel
   * @param {string} panelId - ID of the sidenav panel element
   * @param {Object} options - Optional configuration
   */
  static close(panelId, options = {}) {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    // Hide panel
    panel.classList.remove("active");

    // Hide overlay if this is the active panel
    if (this.activePanel === panel) {
      this.overlay.classList.remove("active");
      this.activePanel = null;

      // Restore body scroll
      document.body.style.overflow = "";
    }

    // Callback
    if (options.onClose) options.onClose(panel);
  }

  /**
   * Close the currently active panel
   */
  static closeActive() {
    if (this.activePanel) {
      this.close(this.activePanel.id);
    }
  }

  /**
   * Toggle a sidenav panel
   * @param {string} panelId - ID of the sidenav panel element
   * @param {Object} options - Optional configuration
   */
  static toggle(panelId, options = {}) {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    if (panel.classList.contains("active")) {
      this.close(panelId, options);
    } else {
      this.open(panelId, options);
    }
  }

  /**
   * Check if a panel is open
   * @param {string} panelId - ID of the sidenav panel element
   * @returns {boolean}
   */
  static isOpen(panelId) {
    const panel = document.getElementById(panelId);
    return panel ? panel.classList.contains("active") : false;
  }

  /**
   * Create a sidenav panel programmatically
   * @param {Object} config - Panel configuration
   * @returns {HTMLElement} The created panel element
   */
  static create(config) {
    const {
      id,
      title = "",
      size = "md",
      content = "",
      footer = "",
      onClose = null,
    } = config;

    // Create panel element
    const panel = document.createElement("div");
    panel.id = id;
    panel.className = `sidenav-panel sidenav-${size}`;

    // Build HTML
    panel.innerHTML = `
      <div class="sidenav-header">
        <h2 class="sidenav-title">${title}</h2>
        <button type="button" class="sidenav-close" aria-label="Close">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="sidenav-content">
        ${content}
      </div>
      ${footer ? `<div class="sidenav-footer">${footer}</div>` : ""}
    `;

    // Add close button handler
    panel.querySelector(".sidenav-close").addEventListener("click", () => {
      this.close(id);
      if (onClose) onClose();
    });

    // Append to body
    document.body.appendChild(panel);

    return panel;
  }

  /**
   * Destroy a sidenav panel
   * @param {string} panelId - ID of the sidenav panel element
   */
  static destroy(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
      this.close(panelId);
      panel.remove();
    }
  }

  /**
   * Update panel title
   * @param {string} panelId - ID of the sidenav panel element
   * @param {string} title - New title
   */
  static setTitle(panelId, title) {
    const panel = document.getElementById(panelId);
    if (panel) {
      const titleEl = panel.querySelector(".sidenav-title");
      if (titleEl) titleEl.textContent = title;
    }
  }
}

export default Sidenav;
