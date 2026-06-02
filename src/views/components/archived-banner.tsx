// Shared archived-state banner for detail pages.
// Renders nothing when the entity is not archived; renders the canonical
// `.detail-archived-banner` block otherwise. Pair with the `archived` prop
// on `<DetailActions>` and the soft-delete pattern in
// `[architecture] MD Planner — Soft-delete (archive) pattern`.

import { formatDate } from "../../utils/time.ts";

type ArchivableEntity = {
  archived?: boolean;
  archivedAt?: string | null;
  archivedBy?: string | null;
};

export function ArchivedBanner({ entity }: { entity: ArchivableEntity }) {
  if (entity.archived !== true) return null;
  return (
    <aside class="detail-section detail-archived-banner" role="alert">
      <strong>Archived</strong>
      {entity.archivedAt && (
        <span class="detail-archived-banner__meta">
          on {formatDate(entity.archivedAt)}
        </span>
      )}
      {entity.archivedBy && (
        <span class="detail-archived-banner__meta">
          by {entity.archivedBy}
        </span>
      )}
      <span class="detail-archived-banner__hint">
        Archived items are hidden from the default list. Use Restore to bring it
        back, or Delete permanently to remove the file.
      </span>
    </aside>
  );
}
