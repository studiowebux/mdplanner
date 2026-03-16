import type { FC } from "hono/jsx";

type FilterOption = { value: string; label: string };

export type FilterDef = {
  key: string;
  label: string;
  allLabel?: string;
  options: FilterOption[];
};

type Props = {
  domain: string;
  filters: FilterDef[];
};

export const FilterBar: FC<Props> = ({ domain, filters }) => (
  <div class="filter-bar" data-filter-domain={domain}>
    {filters.map((f) => (
      <div key={f.key} class="filter-bar__field">
        <select
          class="filter-bar__select"
          data-filter-key={f.key}
          aria-label={`Filter by ${f.label}`}
        >
          <option value="">{f.allLabel ?? `All ${f.label}`}</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    ))}
    <button
      class="btn btn--tertiary btn--sm"
      type="button"
      data-filter-clear={domain}
    >
      Clear
    </button>
  </div>
);
