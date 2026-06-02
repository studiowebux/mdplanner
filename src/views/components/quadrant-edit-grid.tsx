// Shared quadrant grid with SWOT-style inline add / edit / remove.
//
// Renders a grid of `quadrant-card`s, one per section, each holding a string[]
// of items. In edit mode every item becomes an inline input with a remove
// button and each card gains an add input. The hx-* targets pair with the
// routes registered by `registerSectionEditRoutes`. Used by any domain with
// fixed string[] sections (SWOT, Retrospective).

import type { FC } from "hono/jsx";
import { immediateDeleteConfirm } from "../../utils/confirm.ts";

export interface QuadrantSection {
  /** Section key — entity field, URL path segment, and default data-quadrant. */
  key: string;
  /** Display heading. */
  label: string;
  /** The section's items. */
  items: string[];
  /** data-quadrant attribute value for CSS theming. Defaults to `key`. */
  dataQuadrant?: string;
  /** Placeholder for the add input. Defaults to "Add item...". */
  addPlaceholder?: string;
}

export const QuadrantEditGrid: FC<{
  /** Domain mount path, e.g. "/swot" — base of the inline-edit routes. */
  basePath: string;
  /** Entity ID. */
  id: string;
  /** CSS id of the detail swap root, e.g. "swot-detail-root". */
  rootId: string;
  sections: QuadrantSection[];
  editing: boolean;
  /** Use the 3-column grid modifier instead of the default 2-column. */
  threeCol?: boolean;
}> = ({ basePath, id, rootId, sections, editing, threeCol }) => {
  const editSuffix = editing ? "?editing=true" : "";
  const target = `#${rootId}`;

  return (
    <div class={`quadrant-grid${threeCol ? " quadrant-grid--3col" : ""}`}>
      {sections.map((section) => {
        const sectionUrl = `${basePath}/${id}/${section.key}`;
        return (
          <div
            key={section.key}
            class="quadrant-card"
            data-quadrant={section.dataQuadrant ?? section.key}
          >
            <div class="quadrant-card__header">
              <h2 class="quadrant-card__title">{section.label}</h2>
              <span class="badge">{section.items.length}</span>
            </div>
            {section.items.length > 0
              ? (
                <ul class="quadrant-card__list">
                  {section.items.map((item, idx) => (
                    <li key={idx} class="quadrant-card__item">
                      {editing
                        ? (
                          <input
                            type="text"
                            class="quadrant-card__inline-edit"
                            name="text"
                            value={item}
                            data-quadrant-edit={`${sectionUrl}/${idx}${editSuffix}`}
                            hx-put={`${sectionUrl}/${idx}${editSuffix}`}
                            hx-trigger="quadrant-save"
                            hx-target={target}
                            hx-select={target}
                            hx-swap="outerHTML"
                            hx-include="this"
                          />
                        )
                        : <span>{item}</span>}
                      {editing && (
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
                      )}
                    </li>
                  ))}
                </ul>
              )
              : <p class="quadrant-card__empty">No items yet</p>}
            {editing && (
              <div class="quadrant-card__add">
                <input
                  type="text"
                  class="quadrant-card__input"
                  name="text"
                  placeholder={section.addPlaceholder ?? "Add item..."}
                  data-quadrant-add={`${sectionUrl}${editSuffix}`}
                  hx-post={`${sectionUrl}${editSuffix}`}
                  hx-trigger="quadrant-submit"
                  hx-target={target}
                  hx-select={target}
                  hx-swap="outerHTML"
                  hx-include="this"
                  autocomplete="off"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
