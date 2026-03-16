import type { FC } from "hono/jsx";

type Props = {
  domain: string;
  columns: { key: string; label: string }[];
};

export const ColumnToggle: FC<Props> = ({ domain, columns }) => (
  <div class="column-toggle" data-column-domain={domain}>
    <button
      class="btn btn--ghost btn--sm"
      type="button"
      data-column-trigger={domain}
    >
      Columns
    </button>
    <div class="column-toggle__dropdown" data-column-dropdown={domain}>
      {columns.map((col, i) => (
        <label key={col.key} class="column-toggle__item">
          <input
            type="checkbox"
            checked
            data-col-index={i}
          />
          {col.label}
        </label>
      ))}
    </div>
  </div>
);
