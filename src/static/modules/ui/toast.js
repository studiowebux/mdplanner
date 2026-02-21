// Toast notification utility

export function showToast(message, isError = false) {
  // Remove existing toast if any
  const existing = document.getElementById("toast-notification");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "toast-notification";
  toast.className =
    `fixed bottom-16 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-md text-sm font-medium z-50 transition-opacity duration-300 ${
      isError
        ? "bg-error text-white"
        : "bg-inverse text-white"
    }`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Fade out and remove after 2 seconds
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}
