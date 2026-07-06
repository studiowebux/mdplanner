// Confirmation-dialog prop helpers for htmx hx-confirm buttons.
// htmx-triggers.js intercepts htmx:confirm and renders the custom dialog,
// reading data-confirm-title / data-confirm-label (defaults "Confirm delete" /
// "Delete"). These helpers keep the wording consistent across views.

/**
 * Props for a delete that is applied immediately on click — not staged until the
 * user finishes editing — and cannot be undone. Spread onto the delete button:
 *
 *   <button {...immediateDeleteConfirm(`"${item}"`)} hx-delete={...} />
 *
 * `what` is the noun phrase inserted after "Delete " (already quoted/labelled),
 * e.g. `"${item}"` or `category "${name}" and all its causes`.
 */
export function immediateDeleteConfirm(
  what: string,
): { "hx-confirm": string; "data-confirm-title": string } {
  return {
    "hx-confirm":
      `Delete ${what} now? This applies immediately and cannot be undone.`,
    "data-confirm-title": "Delete immediately?",
  };
}
