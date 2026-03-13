// Toast notification utility

export function showToast(message, isError = false) {
  // Remove existing toast if any
  const existing = document.getElementById("toast-notification");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "toast-notification";
  toast.className = `toast ${isError ? "toast-error" : "toast-success"}`;
  toast.textContent = message;
  toast.addEventListener("click", () => toast.remove());
  document.body.appendChild(toast);

  // Trigger slide-in on next two frames to allow initial state to paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add("toast-visible");
    });
  });

  // Slide out and remove: 3s for success, 4.5s for error
  const duration = isError ? 4500 : 3000;
  setTimeout(() => {
    toast.classList.remove("toast-visible");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
