import { AuthAPI } from "../api.js";

/**
 * Auth modal — shown when the server requires an API token.
 * Listens for `mdplanner:auth-required` events to handle mid-session 401s.
 */
export class AuthModal {
  constructor() {
    this.overlay = document.getElementById("authModal");
    this.input = document.getElementById("authTokenInput");
    this.submitBtn = document.getElementById("authSubmitBtn");
    this.errorEl = document.getElementById("authError");
  }

  show() {
    this.overlay.classList.remove("hidden");
    this.errorEl.classList.add("hidden");
    this.input.value = "";
    this.input.focus();
  }

  hide() {
    this.overlay.classList.add("hidden");
  }

  showError(message) {
    this.errorEl.textContent = message;
    this.errorEl.classList.remove("hidden");
  }

  async submit() {
    const token = this.input.value.trim();
    if (!token) {
      this.showError("Token is required");
      return;
    }

    this.submitBtn.disabled = true;
    this.submitBtn.textContent = "Signing in...";

    const response = await AuthAPI.login(token);

    if (response.ok) {
      location.reload();
    } else {
      this.showError("Invalid token");
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = "Sign In";
      this.input.focus();
    }
  }

  bindEvents() {
    this.submitBtn.addEventListener("click", () => this.submit());

    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.submit();
      }
    });

    window.addEventListener("mdplanner:auth-required", () => this.show());
  }
}

/**
 * Check auth on boot. Returns true if app should proceed, false if auth modal
 * is shown and app should wait for reload.
 *
 * When no --api-token is configured, GET /api/auth/check returns 404 (route
 * not registered). Any non-401 response means "proceed".
 */
export async function checkAuthOnBoot(authModal) {
  const response = await AuthAPI.check();
  if (response.status === 401) {
    authModal.show();
    return false;
  }
  return true;
}
