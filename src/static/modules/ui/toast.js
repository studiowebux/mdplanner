// Toast notification utility

/**
 * @param {string} message
 * @param {boolean|"error"|"success"} isError
 * @param {(() => void)|null} onClick  Optional callback — fires on click before dismissal.
 *   When provided, adds "toast-clickable" class for a visual action cue.
 */
export function showToast(message, isError = false, onClick = null) {
  // Accept both boolean (true/false) and string ("error"/"success") for isError
  isError = isError === true || isError === "error";

  const cls =
    `toast ${isError ? "toast-error" : "toast-success"}${onClick ? " toast-clickable" : ""}`;
  const duration = isError ? 5000 : 3000;

  /** Build a click handler that optionally invokes onClick then dismisses. */
  const makeHandler = (el) => {
    const dismiss = () => {
      clearTimeout(el._toastHideTimer);
      clearTimeout(el._toastRemoveTimer);
      el.classList.remove("toast-visible");
      setTimeout(() => el.remove(), 300);
    };
    return onClick ? () => { onClick(); dismiss(); } : dismiss;
  };

  const existing = document.getElementById("toast-notification");

  if (existing) {
    // Update in-place — avoids flicker from remove + recreate
    clearTimeout(existing._toastHideTimer);
    clearTimeout(existing._toastRemoveTimer);
    existing.className = `${cls} toast-visible`;
    existing.textContent = message;

    // Replace click handler so the new onClick is correctly wired
    if (existing._toastClickHandler) {
      existing.removeEventListener("click", existing._toastClickHandler);
    }
    existing._toastClickHandler = makeHandler(existing);
    existing.addEventListener("click", existing._toastClickHandler);

    existing._toastHideTimer = setTimeout(() => {
      existing.classList.remove("toast-visible");
      existing._toastRemoveTimer = setTimeout(() => existing.remove(), 300);
    }, duration);
    return;
  }

  const toast = document.createElement("div");
  toast.id = "toast-notification";
  toast.className = cls;
  toast.textContent = message;

  const handler = makeHandler(toast);
  toast._toastClickHandler = handler;
  toast.addEventListener("click", handler);

  document.body.appendChild(toast);

  // Two rAF so the initial off-screen state paints before sliding in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add("toast-visible");
    });
  });

  toast._toastHideTimer = setTimeout(() => {
    toast.classList.remove("toast-visible");
    toast._toastRemoveTimer = setTimeout(() => toast.remove(), 300);
  }, duration);
}
