// Toast notification utility

export function showToast(message, isError = false) {
  // Accept both boolean (true/false) and string ("error"/"success") for isError
  isError = isError === true || isError === "error";

  const cls = `toast ${isError ? "toast-error" : "toast-success"}`;
  const duration = isError ? 5000 : 3000;

  const existing = document.getElementById("toast-notification");

  if (existing) {
    // Update in-place — avoids flicker from remove + recreate
    clearTimeout(existing._toastHideTimer);
    clearTimeout(existing._toastRemoveTimer);
    existing.className = `${cls} toast-visible`;
    existing.textContent = message;

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

  const dismiss = () => {
    clearTimeout(toast._toastHideTimer);
    clearTimeout(toast._toastRemoveTimer);
    toast.classList.remove("toast-visible");
    setTimeout(() => toast.remove(), 300);
  };
  toast.addEventListener("click", dismiss);

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
