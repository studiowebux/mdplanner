// Theme management (dark mode and fullscreen)

export const ThemeManager = {
  isFullscreen: false,
  escapeKeyHandler: null,

  toggleDarkMode() {
    const html = document.documentElement;
    const isDark = html.classList.contains("dark");

    if (isDark) {
      html.classList.remove("dark");
      localStorage.setItem("darkMode", "false");
    } else {
      html.classList.add("dark");
      localStorage.setItem("darkMode", "true");
    }
  },

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    this.applyFullscreenMode();
    localStorage.setItem("fullscreenMode", this.isFullscreen.toString());
  },

  applyFullscreenMode() {
    const header = document.querySelector("header");
    const main = document.querySelector("main");
    const body = document.body;
    const fullscreenIcon = document.getElementById("fullscreenIcon");
    const exitFullscreenIcon = document.getElementById("exitFullscreenIcon");

    if (this.isFullscreen) {
      // Keep header visible but remove container constraints from main
      main.classList.remove(
        "max-w-7xl",
        "mx-auto",
        "px-2",
        "sm:px-4",
        "lg:px-8",
        "py-4",
        "sm:py-8",
      );
      main.classList.add("w-full", "h-screen", "p-2", "pb-16", "overflow-auto");

      // Make body fill the screen
      body.classList.add("h-screen", "overflow-hidden");

      // Update button icons
      fullscreenIcon.classList.add("hidden");
      exitFullscreenIcon.classList.remove("hidden");

      // Add escape key listener
      this.bindEscapeKey();
    } else {
      // Restore container constraints
      main.classList.add(
        "max-w-7xl",
        "mx-auto",
        "px-2",
        "sm:px-4",
        "lg:px-8",
        "py-4",
        "sm:py-8",
      );
      main.classList.remove("w-full", "h-screen", "p-2", "pb-16", "overflow-auto");

      // Restore body
      body.classList.remove("h-screen", "overflow-hidden");

      // Update button icons
      fullscreenIcon.classList.remove("hidden");
      exitFullscreenIcon.classList.add("hidden");

      // Remove escape key listener
      this.unbindEscapeKey();
    }
  },

  bindEscapeKey() {
    this.escapeKeyHandler = (e) => {
      if (e.key === "Escape" && this.isFullscreen) {
        this.toggleFullscreen();
      }
    };
    document.addEventListener("keydown", this.escapeKeyHandler);
  },

  unbindEscapeKey() {
    if (this.escapeKeyHandler) {
      document.removeEventListener("keydown", this.escapeKeyHandler);
      this.escapeKeyHandler = null;
    }
  },

  initDarkMode() {
    const savedDarkMode = localStorage.getItem("darkMode");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    if (savedDarkMode === "true" || (savedDarkMode === null && prefersDark)) {
      document.documentElement.classList.add("dark");
    }
  },

  initFullscreenMode() {
    const savedFullscreenMode = localStorage.getItem("fullscreenMode");
    if (savedFullscreenMode === "true") {
      this.isFullscreen = true;
      // Apply fullscreen mode after DOM is ready
      setTimeout(() => this.applyFullscreenMode(), 0);
    }
  }
};
