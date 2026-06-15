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
  /**
   * When true, render Restore + Delete Permanently instead of Edit + Archive.
   * Pair with `[architecture] MD Planner — Soft-delete (archive) pattern`.
   */
  archived?: boolean;
  /** Extra buttons rendered between Edit and Delete (ignored when archived). */
  children?: Child;
};

export function DetailActions(
  {
    entity,
    id,
    title,
    formContainerId,
    onDeleteRedirect,
    archived,
    children,
  }: DetailActionsProps,
) {
  if (archived) {
    const destroyAttrs: Record<string, string> = {
      "hx-post": `/${entity}/${id}/destroy`,
      "hx-confirm":
        `Permanently delete "${title}"? This cannot be undone — the file will be removed from disk.`,
      "data-confirm-title": "Delete permanently",
      "data-confirm-label": "Delete permanently",
      "hx-swap": "none",
    };
    if (onDeleteRedirect) {
      destroyAttrs["data-redirect-on-success"] = onDeleteRedirect;
    }
    return (
      <div class="detail-actions">
        <button
          class="btn btn--secondary btn--sm"
          type="button"
          hx-post={`/${entity}/${id}/restore`}
          hx-swap="none"
        >
          Restore
        </button>
        <button
          class="btn btn--danger btn--sm"
          type="button"
          {...destroyAttrs}
        >
          Delete permanently
        </button>
      </div>
    );
  }

  const deleteAttrs: Record<string, string> = {
    "hx-delete": `/${entity}/${id}`,
    "hx-confirm":
      `Archive "${title}"? Archived items can be restored from the archived view.`,
    "data-confirm-title": "Archive",
    "data-confirm-label": "Archive",
    "hx-swap": "none",
  };
  if (onDeleteRedirect) {
    deleteAttrs["data-redirect-on-success"] = onDeleteRedirect;
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
        class="btn btn--ghost btn--sm"
        type="button"
        {...deleteAttrs}
      >
        Archive
      </button>
    </div>
  );
}
