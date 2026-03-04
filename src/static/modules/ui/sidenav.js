// Sidenav Component
// Slide-in panel from the right side

export class Sidenav {
  static activePanel = null;
  static overlay = null;
  static initialized = false;
  /** Active BaseSidenavModule instance, if any. Registered on open, cleared on close. */
  static _activeModule = null;

  /**
   * Register the currently active BaseSidenavModule so ESC delegates to it.
   * Called by BaseSidenavModule.openNew() / openEdit().
   */
  static registerModule(module) {
    this._activeModule = module;
  }

  /**
   * Unregister the active module. Called by BaseSidenavModule.close().
   */
  static unregisterModule() {
    this._activeModule = null;
  }

  static init() {
    if (this.initialized) return;

    // Create overlay element — clicking outside does NOT close the sidenav (locked).
    this.overlay = document.createElement("div");
    this.overlay.className = "sidenav-overlay";
    document.body.appendChild(this.overlay);

    // Escape key handler — delegates to active module's dirty-state guard when present.
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.activePanel) {
        if (this._activeModule) {
          this._activeModule._confirmAndClose();
        } else {
          this.closeActive();
        }
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

    // Reset scroll position on every open
    const content = panel.querySelector(".sidenav-content");
    if (content) content.scrollTop = 0;

    // Inject fullscreen toggle button into the sidenav header (once per panel)
    const header = panel.querySelector(".sidenav-header");
    if (header && !header.querySelector(".sidenav-fullscreen-toggle")) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "sidenav-fullscreen-toggle";
      toggle.setAttribute("aria-label", "Toggle fullscreen");
      toggle.title = "Toggle fullscreen";
      toggle.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>`;
      // Restore persisted state
      if (localStorage.getItem("sidenavFullscreen") === "1") {
        panel.classList.add("sidenav-fullscreen");
      }
      toggle.addEventListener("click", () => {
        const isFullscreen = panel.classList.toggle("sidenav-fullscreen");
        localStorage.setItem("sidenavFullscreen", isFullscreen ? "1" : "0");
      });
      // Insert before the close button so the order is: title, spacer, fullscreen, close
      const closeBtn = header.querySelector(".sidenav-close");
      if (closeBtn) {
        header.insertBefore(toggle, closeBtn);
      } else {
        header.appendChild(toggle);
      }
    } else if (header) {
      // Reapply persisted state for already-injected button on subsequent opens
      if (localStorage.getItem("sidenavFullscreen") === "1") {
        panel.classList.add("sidenav-fullscreen");
      } else {
        panel.classList.remove("sidenav-fullscreen");
      }
    }

    // Focus first input if requested
    if (options.focusFirst !== false) {
      setTimeout(() => {
        const firstInput = panel.querySelector(
          'input:not([type="hidden"]), textarea, select',
        );
        if (firstInput) firstInput.focus();
      }, 100);
    }

    // Prevent body scroll using position:fixed so browsers reliably restore
    // scroll position on close. overflow:hidden alone loses scrollY on iOS/Chrome.
    this._savedScrollY = window.scrollY;
    document.body.style.top = `-${this._savedScrollY}px`;
    document.body.style.position = "fixed";
    document.body.style.left = "0";
    document.body.style.right = "0";

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

      // Restore scroll: remove position:fixed then immediately scrollTo.
      // Must happen in this order — position:fixed removal triggers reflow,
      // then scrollTo sets the exact position before the next paint.
      const scrollY = this._savedScrollY ?? 0;
      this._savedScrollY = undefined;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      window.scrollTo(0, scrollY);
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
