// Domain view filters & toolbar controls — the collapsible-filter helpers, date
// range inputs, view-mode toggle, column toggle, and grid renderer used by the
// domain-view page/container. Leaf module: depends only on shared UI/types,
// never on the view/pagination/form factories (keeps the split acyclic).

import type { FC } from "hono/jsx";
import { CardGrid } from "../components/ui/card-grid.tsx";
import type { ViewMode } from "../types/app.ts";
import {
  type DomainConfig,
  type DomainFilterState,
  effectiveDateRangeFilter,
  type Entity,
} from "./domain.types.ts";

/**
 * Whether to render the collapsible filter panel. Always true — every domain
 * carries the universal date range filter (see effectiveDateRangeFilter), so
 * the panel always has at least one control.
 */
export function hasFilterControls<T extends Entity>(
  _cfg: DomainConfig<T, unknown, unknown>,
): boolean {
  return true;
}

/** Count the filter controls that currently hold a non-default value. */
export function countActiveFilters<T extends Entity>(
  cfg: DomainConfig<T, unknown, unknown>,
  state: DomainFilterState,
): number {
  let count = 0;
  for (const f of cfg.filters ?? []) {
    const val = state[f.name];
    if (typeof val === "string" && val !== "") count++;
  }
  {
    const { fromKey, toKey } = effectiveDateRangeFilter(cfg);
    if (state[fromKey]) count++;
    if (state[toKey]) count++;
  }
  if (cfg.hideCompleted && state.hideCompleted) count++;
  if (
    cfg.showHiddenToggle &&
    (state.showHidden === true || state.showHidden === "true")
  ) {
    count++;
  }
  if (cfg.supportsArchive !== false && state.archived === "true") count++;
  return count;
}

/**
 * Active-filter count badge shown in the "Filters" summary. Rendered once in
 * the toolbar and re-pushed as an OOB swap from the view fragment so it stays
 * fresh after a filter change.
 */
export function FilterCountBadge(
  { domain, count, oob }: { domain: string; count: number; oob?: boolean },
) {
  return (
    <span
      id={`${domain}-filter-count`}
      class={`badge badge--accent${count > 0 ? "" : " is-hidden"}`}
      {...(oob ? { "hx-swap-oob": "morph" } : {})}
    >
      {count > 0 ? String(count) : ""}
    </span>
  );
}

export function DateRangeFilter(
  { domain, fromKey, toKey, fromLabel, toLabel, state }: {
    domain: string;
    fromKey: string;
    toKey: string;
    fromLabel: string;
    toLabel: string;
    state: DomainFilterState;
  },
) {
  return (
    <div class="domain-toolbar__date-range">
      <label class="domain-toolbar__date-label">
        {fromLabel}
        <input
          type="date"
          class="domain-toolbar__date"
          name={fromKey}
          value={String(state[fromKey] ?? "")}
          hx-get={`/${domain}/view`}
          hx-trigger="change"
          hx-target={`#${domain}-view`}
          hx-swap="outerHTML"
          hx-include={`#${domain}-toolbar`}
        />
      </label>
      <label class="domain-toolbar__date-label">
        {toLabel}
        <input
          type="date"
          class="domain-toolbar__date"
          name={toKey}
          value={String(state[toKey] ?? "")}
          hx-get={`/${domain}/view`}
          hx-trigger="change"
          hx-target={`#${domain}-view`}
          hx-swap="outerHTML"
          hx-include={`#${domain}-toolbar`}
        />
      </label>
    </div>
  );
}

export function ViewToggleButtons(
  { domain, view, oobSwap, extraModes, hideDefault, hideGrid }: {
    domain: string;
    view: string;
    oobSwap?: string;
    extraModes?: { key: string; label: string }[];
    hideDefault?: boolean;
    hideGrid?: boolean;
  },
) {
  const id = `${domain}-view-toggle`;
  return (
    <div
      id={id}
      class="view-toggle"
      {...(oobSwap ? { "hx-swap-oob": oobSwap } : {})}
    >
      {!hideDefault && !hideGrid && (
        <button
          class={`btn btn--secondary view-toggle__btn${
            view === "grid" ? " view-toggle__btn--active" : ""
          }`}
          type="button"
          hx-get={`/${domain}/view?view=grid`}
          hx-target={`#${domain}-view`}
          hx-swap="outerHTML swap:100ms"
          hx-include={`#${domain}-toolbar`}
        >
          Grid
        </button>
      )}
      {!hideDefault && (
        <button
          class={`btn btn--secondary view-toggle__btn${
            view === "table" ? " view-toggle__btn--active" : ""
          }`}
          type="button"
          hx-get={`/${domain}/view?view=table`}
          hx-target={`#${domain}-view`}
          hx-swap="outerHTML swap:100ms"
          hx-include={`#${domain}-toolbar`}
        >
          Table
        </button>
      )}
      {extraModes?.map((mode) => (
        <button
          key={mode.key}
          class={`btn btn--secondary view-toggle__btn${
            view === mode.key ? " view-toggle__btn--active" : ""
          }`}
          type="button"
          hx-get={`/${domain}/view?view=${mode.key}`}
          hx-target={`#${domain}-view`}
          hx-swap="outerHTML swap:100ms"
          hx-include={`#${domain}-toolbar`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

export function ColumnToggle(
  { domain, columns, view }: {
    domain: string;
    columns: { key: string; label: string }[];
    view: ViewMode;
  },
) {
  const toggleable = columns.filter((c) =>
    c.key !== "name" && c.key !== "_actions" && c.label
  );
  return (
    <details
      id={`${domain}-column-toggle`}
      class={`column-toggle${view !== "table" ? " is-hidden" : ""}`}
      data-column-toggle={domain}
    >
      <summary class="btn btn--secondary btn--sm">
        Columns<span class="column-toggle__count" data-column-count></span>
      </summary>
      <div class="column-toggle__panel">
        {toggleable.map((col) => (
          <label key={col.key} class="column-toggle__item">
            <input type="checkbox" checked data-column-key={col.key} />
            {col.label}
          </label>
        ))}
      </div>
    </details>
  );
}

// Grid view — extracted so TypeScript narrows the optional Card prop.
export function GridView<T extends Entity>(
  { Card, items, toRow, name, q, sentinel }: {
    Card: FC<{ item: T; q?: string }>;
    items: T[];
    toRow: (item: T) => Record<string, unknown>;
    name: string;
    q?: string;
    sentinel?: unknown;
  },
) {
  return (
    <CardGrid id={`${name}-grid`}>
      {items.map((item) => {
        const row = toRow(item);
        return (
          <div key={String(row.id)} id={String(row.id)}>
            <Card item={item} q={q} />
          </div>
        );
      })}
      {sentinel}
    </CardGrid>
  );
}
