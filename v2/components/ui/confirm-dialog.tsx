import type { FC } from "hono/jsx";

// Global confirm dialog — one instance in AppShell, driven by JS.
// Usage: confirmAction({ title, message }).then(ok => { ... })
export const ConfirmDialog: FC = () => (
  <dialog class="confirm-dialog" id="confirm-dialog">
    <div class="confirm-dialog__content">
      <h2 class="confirm-dialog__title" id="confirm-dialog-title">Confirm</h2>
      <p class="confirm-dialog__message" id="confirm-dialog-message">Are you sure?</p>
      <div class="confirm-dialog__actions">
        <button class="confirm-dialog__cancel" type="button">Cancel</button>
        <button class="confirm-dialog__confirm" type="button">Confirm</button>
      </div>
    </div>
  </dialog>
);
