// Confirm Modal — shared async replacement for window.confirm()
// Usage: const ok = await showConfirm("Delete this?");
//        const ok = await showConfirm("Remove entry?", "Remove");

let _resolve = null;

/**
 * Show the shared confirmation modal.
 * @param {string} message
 * @param {string} [confirmLabel]
 * @returns {Promise<boolean>}
 */
export function showConfirm(message, confirmLabel = "Delete") {
  return new Promise((resolve) => {
    _resolve = resolve;

    const overlay = document.getElementById("confirmModalOverlay");
    const msgEl = document.getElementById("confirmModalMessage");
    const confirmBtn = document.getElementById("confirmModalConfirm");

    if (!overlay || !msgEl || !confirmBtn) {
      // Fallback — modal not in DOM yet
      resolve(globalThis.confirm(message));
      return;
    }

    msgEl.textContent = message;
    confirmBtn.textContent = confirmLabel;
    overlay.classList.remove("hidden");
    confirmBtn.focus();
  });
}

function _accept() {
  document.getElementById("confirmModalOverlay")?.classList.add("hidden");
  _resolve?.(true);
  _resolve = null;
}

function _cancel() {
  document.getElementById("confirmModalOverlay")?.classList.add("hidden");
  _resolve?.(false);
  _resolve = null;
}

export function initConfirmModal() {
  document.getElementById("confirmModalConfirm")?.addEventListener(
    "click",
    _accept,
  );
  document.getElementById("confirmModalCancel")?.addEventListener(
    "click",
    _cancel,
  );
  document.getElementById("confirmModalOverlay")?.addEventListener(
    "click",
    (e) => {
      if (e.target.id === "confirmModalOverlay") _cancel();
    },
  );
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      !document.getElementById("confirmModalOverlay")?.classList.contains(
        "hidden",
      )
    ) {
      _cancel();
    }
  });
}
