// Shared canvas section block (Business Model ↔ Lean Canvas).
//
// Renders one `lc-section`: a titled list of string items that, in edit mode,
// become inline textareas with a save (✓) and remove (×) button, plus a
// form-wrapped add input. The hx-* targets pair with the section-edit routes
// mounted at `basePath`. Used by the canvas detail views that lay these blocks
// out in a fixed grid (business-model-detail, lean-canvas-detail).

import type { FC } from "hono/jsx";
import { immediateDeleteConfirm } from "../../utils/confirm.ts";

export const CanvasSectionBlock: FC<{
  /** Domain mount path, e.g. "/business-models" — base of the section routes. */
  basePath: string;
  /** Entity ID. */
  id: string;
  /** CSS id of the detail swap root, e.g. "bmc-detail-root". */
  rootId: string;
  /** Section key — entity field and URL path segment. */
  sectionKey: string;
  label: string;
  items: string[];
  editing: boolean;
  editSuffix: string;
}> = (
  { basePath, id, rootId, sectionKey, label, items, editing, editSuffix },
) => {
  const target = `#${rootId}`;
  const sectionUrl = `${basePath}/${id}/${sectionKey}`;

  return (
    <div class="lc-section">
      <h3 class="lc-section__title">{label}</h3>
      {items.length === 0 && !editing
        ? <p class="lc-section__empty">Add items…</p>
        : (
          <ul class="lc-section__list">
            {items.map((item, idx) =>
              editing
                ? (
                  <li key={idx} class="quadrant-card__item">
                    <textarea
                      id={`qed-${sectionKey}-${idx}`}
                      class="quadrant-card__inline-edit quadrant-card__textarea"
                      name="text"
                      data-quadrant-edit={`${sectionUrl}/${idx}${editSuffix}`}
                      hx-put={`${sectionUrl}/${idx}${editSuffix}`}
                      hx-trigger="quadrant-save"
                      hx-target={target}
                      hx-select={target}
                      hx-swap="outerHTML"
                      hx-include="this"
                    >
                      {item}
                    </textarea>
                    <button
                      type="button"
                      class="quadrant-card__save btn btn--primary btn--sm is-hidden"
                      data-quadrant-save-for={`qed-${sectionKey}-${idx}`}
                      aria-label="Save"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      class="quadrant-card__remove"
                      hx-delete={`${sectionUrl}/${idx}${editSuffix}`}
                      {...immediateDeleteConfirm(`"${item}"`)}
                      hx-target={target}
                      hx-select={target}
                      hx-swap="outerHTML"
                      aria-label={`Remove "${item}"`}
                    >
                      &times;
                    </button>
                  </li>
                )
                : <li key={idx}>{item}</li>
            )}
          </ul>
        )}
      {editing && (
        <form
          class="quadrant-card__add"
          hx-post={`${sectionUrl}${editSuffix}`}
          hx-target={target}
          hx-select={target}
          hx-swap="outerHTML"
        >
          <input
            type="text"
            class="quadrant-card__input quadrant-card__input--ghost"
            name="text"
            placeholder={`Add ${label.toLowerCase()}…`}
            autocomplete="off"
          />
        </form>
      )}
    </div>
  );
};
