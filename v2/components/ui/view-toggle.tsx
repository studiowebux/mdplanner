import type { FC } from "hono/jsx";
import type { ViewMode } from "../../types/app.ts";

type Props = {
  domain: string;
  view?: ViewMode;
};

// Grid/Table toggle. Uses htmx to fetch the active view fragment.
// JS persists preference to localStorage and sets active button class.
export const ViewToggle: FC<Props> = ({ domain, view = "grid" }) => (
  <div class="view-toggle" data-view-domain={domain}>
    <button
      class={`btn btn--secondary view-toggle__btn${view === "grid" ? " view-toggle__btn--active" : ""}`}
      type="button"
      data-view-mode="grid"
      hx-get={`/${domain}/view?mode=grid`}
      hx-target={`#${domain}-view`}
      hx-swap="innerHTML"
    >
      Grid
    </button>
    <button
      class={`btn btn--secondary view-toggle__btn${view === "table" ? " view-toggle__btn--active" : ""}`}
      type="button"
      data-view-mode="table"
      hx-get={`/${domain}/view?mode=table`}
      hx-target={`#${domain}-view`}
      hx-swap="innerHTML"
    >
      Table
    </button>
  </div>
);
