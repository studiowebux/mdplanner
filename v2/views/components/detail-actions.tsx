// Shared detail-page Edit + Delete action buttons.
// Replaces per-domain action groups in all detail views.

import type { Child } from "hono/jsx";

type DetailActionsProps = {
  /** URL path segment (e.g. "goals", "people", "marketing-plans") */
  entity: string;
  /** Entity ID */
  id: string;
  /** Display name for the confirm dialog */
  title: string;
  /** Form container element ID (without #) */
  formContainerId: string;
  /** Optional redirect URL after successful delete */
  onDeleteRedirect?: string;
  /** Extra buttons rendered between Edit and Delete */
  children?: Child;
};

export function DetailActions(
  { entity, id, title, formContainerId, onDeleteRedirect, children }:
    DetailActionsProps,
) {
  const deleteAttrs: Record<string, string> = {
    "hx-delete": `/${entity}/${id}`,
    "hx-confirm": `Delete "${title}"? This cannot be undone.`,
    "hx-swap": "none",
  };
  if (onDeleteRedirect) {
    deleteAttrs["hx-on--after-request"] =
      `if(event.detail.successful) window.location.href='${onDeleteRedirect}'`;
  }

  return (
    <div class="detail-actions">
      <button
        class="btn btn--secondary btn--sm"
        type="button"
        hx-get={`/${entity}/${id}/edit`}
        hx-target={`#${formContainerId}`}
        hx-swap="innerHTML"
      >
        Edit
      </button>
      {children}
      <button
        class="btn btn--danger btn--sm"
        type="button"
        {...deleteAttrs}
      >
        Delete
      </button>
    </div>
  );
}
