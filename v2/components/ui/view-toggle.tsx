import type { FC } from "hono/jsx";

type Props = {
  domain: string;
};

// Grid/Table toggle. JS reads data-view-domain to scope localStorage key.
export const ViewToggle: FC<Props> = ({ domain }) => (
  <div class="view-toggle" data-view-domain={domain}>
    <button class="btn btn--secondary view-toggle__btn view-toggle__btn--active" type="button" data-view-mode="grid">
      Grid
    </button>
    <button class="btn btn--secondary view-toggle__btn" type="button" data-view-mode="table">
      Table
    </button>
  </div>
);
