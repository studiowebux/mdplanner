// Per-section pagination for the task list/board. Each section renders only
// `pageSize` tasks; when more remain, a SectionLoadMore control fetches the next
// chunk for THAT section via GET /tasks/more-section and swaps itself for the
// new rows/cards (+ a fresh control while more remain).

import type { FC } from "hono/jsx";
import type { DomainFilterState } from "../../factories/domain.types.ts";
import { TASK_STATE_KEYS } from "../../domains/task/constants.tsx";

/**
 * Build the /tasks/more-section URL for one section, carrying the current filter
 * state forward so the next chunk matches exactly what is displayed. `section`
 * and `view` are set explicitly (overriding any same-named state value) so the
 * control always pages its own section in its own view; `offset` is the count
 * already rendered above it.
 */
export function buildSectionMoreUrl(
  state: DomainFilterState,
  section: string,
  view: "list" | "board",
  offset: number,
): string {
  const params = new URLSearchParams();
  for (const key of TASK_STATE_KEYS) {
    if (key === "view" || key === "section") continue;
    const val = state[key];
    if (val !== undefined && val !== "" && val !== false) {
      params.set(key, String(val));
    }
  }
  params.set("section", section);
  params.set("view", view);
  params.set("offset", String(offset));
  return `/tasks/more-section?${params.toString()}`;
}

/**
 * "Load more" control rendered as the last child of a section's sortable
 * container. `hx-params="none"` neutralises the `hx-params`/`hx-include`
 * inherited from the SortableJS reorder container (which would otherwise attach
 * the section's hidden `sid` inputs to this GET) — every parameter this request
 * needs is already in the URL. See the htmx-inheritance footgun in Brain Memory.
 */
export const SectionLoadMore: FC<{
  state: DomainFilterState;
  section: string;
  view: "list" | "board";
  offset: number;
  remaining: number;
  pageSize: number;
}> = ({ state, section, view, offset, remaining, pageSize }) => (
  <button
    type="button"
    class={`task-load-more task-load-more--${view}`}
    hx-get={buildSectionMoreUrl(state, section, view, offset)}
    hx-target="this"
    hx-swap="outerHTML"
    hx-params="none"
  >
    Load {Math.min(remaining, pageSize)} more
  </button>
);
