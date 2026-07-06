// Shared in-place editable field — the canonical "Edit Mode" surface.
// A contenteditable region + hidden input (submitted by htmx) + a Save button
// that /js/inline-edit.js reveals only while the content is dirty. Replaces the
// hand-rolled triple that every detail page used to copy. Explicit Save only —
// no save-on-blur (canonical Edit-Mode pattern, note_1779030232467).

import type { FC } from "hono/jsx";

type InlineEditableProps = {
  /** Unique id stem; the hidden input is `${fieldId}-value`, Save `${fieldId}-save`. */
  fieldId: string;
  /** Hidden-input name htmx submits, e.g. "description" or "answer". */
  name: string;
  /** Current value — seeds the editable, the hidden input, and the dirty baseline. */
  value: string;
  /** htmx PUT URL that persists the change. */
  hxPut: string;
  /** Detail-root element id (without `#`) that Save targets/selects, e.g. "brainstorm-detail-root". */
  rootId: string;
  /** Extra class on the contenteditable surface for per-view layout/typography. */
  class?: string;
};

export const InlineEditable: FC<InlineEditableProps> = ({
  fieldId,
  name,
  value,
  hxPut,
  rootId,
  class: className,
}) => (
  <>
    <div
      class={`inline-editable${className ? ` ${className}` : ""}`}
      contenteditable
      data-inline-edit
      data-inline-original={value}
      data-inline-target={`${fieldId}-value`}
      data-inline-save-btn={`${fieldId}-save`}
    >
      {value}
    </div>
    <input type="hidden" id={`${fieldId}-value`} name={name} value={value} />
    <div class="inline-editable__actions">
      <button
        type="button"
        id={`${fieldId}-save`}
        class="btn btn--primary btn--sm is-hidden"
        hx-put={hxPut}
        hx-include={`#${fieldId}-value`}
        hx-target={`#${rootId}`}
        hx-select={`#${rootId}`}
        hx-swap="outerHTML"
      >
        Save
      </button>
    </div>
  </>
);
