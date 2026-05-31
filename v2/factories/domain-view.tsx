// Domain view factory — generates page, view container, toolbar components
// from a DomainConfig. No domain-specific logic here.

import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { CardGrid } from "../components/ui/card-grid.tsx";
import { DataTable } from "../components/ui/data-table.tsx";
import type { ColumnDef } from "../components/ui/data-table.tsx";
import { EmptyState } from "../components/ui/empty-state.tsx";
import { FormBuilder } from "../components/ui/form-builder.tsx";
import type { FieldDef } from "../components/ui/form-builder.tsx";
import { createArchiveActionBtns } from "../components/ui/action-btns.tsx";
import type { ViewMode, ViewProps } from "../types/app.ts";
import {
  type DomainConfig,
  type DomainFilterState,
  type DynamicFilterOptions,
  effectiveDateRangeFilter,
  type Entity,
} from "./domain.types.ts";

// ---------------------------------------------------------------------------
// Pagination helpers
// ---------------------------------------------------------------------------

function buildMoreUrl(
  domain: string,
  stateKeys: readonly string[],
  state: DomainFilterState,
  offset: number,
): string {
  const params = new URLSearchParams();
  params.set("offset", String(offset));
  for (const key of stateKeys) {
    const val = state[key];
    if (val !== undefined && val !== "" && val !== false) {
      params.set(key, String(val));
    }
  }
  return `/${domain}/more?${params.toString()}`;
}

/** Sentinel <tr> rendered as the last tbody row — triggers load-more on reveal. */
export function TableSentinelRow(
  { domain, stateKeys, state, nextOffset, columnCount }: {
    domain: string;
    stateKeys: readonly string[];
    state: DomainFilterState;
    nextOffset: number;
    columnCount: number;
  },
) {
  return (
    <tr
      id={`${domain}-load-more`}
      class="load-more-sentinel"
      hx-get={buildMoreUrl(domain, stateKeys, state, nextOffset)}
      hx-trigger="intersect once root:.app-shell__content"
      hx-target="this"
      hx-swap="outerHTML"
      hx-sync="closest [sse-connect]:drop"
    >
      <td class="load-more-sentinel__cell" colspan={columnCount}>
        <span class="load-more-sentinel__text">Loading more…</span>
      </td>
    </tr>
  );
}

/** Sentinel <div> rendered as the last grid item — triggers load-more on reveal. */
export function GridSentinelDiv(
  { domain, stateKeys, state, nextOffset }: {
    domain: string;
    stateKeys: readonly string[];
    state: DomainFilterState;
    nextOffset: number;
  },
) {
  return (
    <div
      id={`${domain}-load-more`}
      class="load-more-sentinel"
      hx-get={buildMoreUrl(domain, stateKeys, state, nextOffset)}
      hx-trigger="intersect once root:.app-shell__content"
      hx-target="this"
      hx-swap="outerHTML"
      hx-sync="closest [sse-connect]:drop"
    >
      <span class="load-more-sentinel__text">Loading more…</span>
    </div>
  );
}

/** Renders the /more response fragment (rows + optional next sentinel) for a domain. */
export function createMoreFragment<T extends Entity>(cfg: {
  name: string;
  stateKeys: readonly string[];
  columns: ColumnDef[];
  /** When true, swap the `_actions` column to archive-actions in archived view. */
  supportsArchive?: boolean;
  toRow: (item: T) => Record<string, unknown>;
  mapRows?: (
    items: T[],
    state: DomainFilterState,
  ) => Array<Record<string, unknown>>;
  Card?: FC<{ item: T; q?: string }>;
}) {
  return function MoreFragment(
    { items, state, hasMore, nextOffset, view }: {
      items: T[];
      state: DomainFilterState;
      hasMore: boolean;
      nextOffset: number;
      view: "table" | "grid";
    },
  ) {
    const archivedActive = cfg.supportsArchive !== false &&
      state.archived === "true";
    const effectiveColumns: ColumnDef[] = archivedActive
      ? cfg.columns.map((col) =>
        col.key === "_actions"
          ? { ...col, render: createArchiveActionBtns(cfg.name) }
          : col
      )
      : cfg.columns;
    if (view === "table") {
      const rows: Record<string, unknown>[] = cfg.mapRows
        ? cfg.mapRows(items, state)
        : items.map((item) => ({
          ...cfg.toRow(item),
          _q: state.q,
        }));
      return (
        <>
          {rows.map((row) => (
            <tr
              key={String(row.id)}
              id={String(row.id)}
              class="data-table__row"
              data-row-id={String(row.id)}
            >
              {effectiveColumns.map((col) => (
                <td key={col.key} class="data-table__td" data-col={col.key}>
                  {col.render
                    ? col.render(row[col.key], row)
                    : String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
          {hasMore && (
            // No id — prevents htmx settle from ID-matching this against the
            // existing sentinel that was just swapped out, avoiding targetError.
            <tr
              class="load-more-sentinel"
              hx-get={buildMoreUrl(
                cfg.name,
                cfg.stateKeys,
                state,
                nextOffset,
              )}
              hx-trigger="intersect once root:.app-shell__content"
              hx-target="this"
              hx-swap="outerHTML"
              hx-sync="closest [sse-connect]:drop"
            >
              <td
                class="load-more-sentinel__cell"
                colspan={cfg.columns.length}
              >
                <span class="load-more-sentinel__text">Loading more…</span>
              </td>
            </tr>
          )}
        </>
      );
    }

    if (cfg.Card) {
      const Card = cfg.Card;
      return (
        <>
          {items.map((item) => {
            const row = cfg.toRow(item);
            return (
              <div key={String(row.id)} id={String(row.id)}>
                <Card item={item} q={state.q} />
              </div>
            );
          })}
          {hasMore && (
            // No id — prevents htmx settle ID-matching against removed sentinel.
            <div
              class="load-more-sentinel"
              hx-get={buildMoreUrl(
                cfg.name,
                cfg.stateKeys,
                state,
                nextOffset,
              )}
              hx-trigger="intersect once root:.app-shell__content"
              hx-target="this"
              hx-swap="outerHTML"
              hx-sync="closest [sse-connect]:drop"
            >
              <span class="load-more-sentinel__text">Loading more…</span>
            </div>
          )}
        </>
      );
    }

    return null;
  };
}

// ---------------------------------------------------------------------------
// Collapsible filter helpers
// ---------------------------------------------------------------------------

/**
 * Whether to render the collapsible filter panel. Always true — every domain
 * carries the universal date range filter (see effectiveDateRangeFilter), so
 * the panel always has at least one control.
 */
function hasFilterControls<T extends Entity>(
  _cfg: DomainConfig<T, unknown, unknown>,
): boolean {
  return true;
}

/** Count the filter controls that currently hold a non-default value. */
function countActiveFilters<T extends Entity>(
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
function FilterCountBadge(
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

// ---------------------------------------------------------------------------
// Date range filter inputs
// ---------------------------------------------------------------------------

function DateRangeFilter(
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

// ---------------------------------------------------------------------------
// View toggle buttons
// ---------------------------------------------------------------------------

function ViewToggleButtons(
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

// ---------------------------------------------------------------------------
// Column toggle
// ---------------------------------------------------------------------------

function ColumnToggle(
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

// ---------------------------------------------------------------------------
// Grid view — extracted so TypeScript narrows the optional Card prop
// ---------------------------------------------------------------------------

function GridView<T extends Entity>(
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

// ---------------------------------------------------------------------------
// View container — swapped via htmx on filter/toggle/SSE
// ---------------------------------------------------------------------------

export function createDomainViewContainer<T extends Entity>(
  cfg: DomainConfig<T, unknown, unknown>,
) {
  const extraKeys = new Set((cfg.extraViewModes ?? []).map((m) => m.key));

  const DomainViewContainer: FC<{
    items: T[];
    totalCount?: number;
    filteredCount?: number;
    state: DomainFilterState;
    fragment?: boolean;
    customContent?: ReturnType<FC>;
    hasMore?: boolean;
    nextOffset?: number;
  }> = (
    {
      items,
      totalCount,
      filteredCount,
      state,
      fragment,
      customContent,
      hasMore,
      nextOffset,
    },
  ) => {
    const archivedActive = cfg.supportsArchive !== false &&
      state.archived === "true";
    // In archived view the `_actions` column renders Restore + Delete
    // Permanently instead of the domain's default View/Edit/Archive trio.
    // Column is replaced in place so column ordering and toggle state are
    // preserved.
    const effectiveColumns: ColumnDef[] = archivedActive
      ? cfg.columns.map((col) =>
        col.key === "_actions"
          ? { ...col, render: createArchiveActionBtns(cfg.name) }
          : col
      )
      : cfg.columns;
    return (
      <>
        {fragment && (
          <span
            id={`${cfg.name}-count`}
            class="domain-page__count"
            {...{ "hx-swap-oob": "morph" }}
          >
            {totalCount !== undefined &&
                (filteredCount ?? items.length) !== totalCount
              ? `${filteredCount ?? items.length}/${totalCount}`
              : `${filteredCount ?? items.length} total`}
          </span>
        )}
        {fragment && (
          <ViewToggleButtons
            domain={cfg.name}
            view={state.view}
            oobSwap="morph"
            extraModes={cfg.extraViewModes}
            hideDefault={cfg.hideDefaultViews}
            hideGrid={cfg.hideGridView}
          />
        )}
        {fragment && (
          <div
            id={`${cfg.name}-column-toggle-wrapper`}
            {...{ "hx-swap-oob": "morph" }}
          >
            <ColumnToggle
              domain={cfg.name}
              columns={cfg.columns}
              view={state.view}
            />
          </div>
        )}
        {fragment && hasFilterControls(cfg) && (
          <FilterCountBadge
            domain={cfg.name}
            count={countActiveFilters(cfg, state)}
            oob
          />
        )}
        <div id={`${cfg.name}-view`} class="view-container">
          <input type="hidden" name="view" value={state.view} />
          {customContent ? customContent : items.length === 0
            ? (
              <EmptyState
                message={archivedActive
                  ? `No archived ${cfg.plural ?? `${cfg.singular}s`} yet.`
                  : cfg.emptyMessage}
              />
            )
            : (state.view === "table" || cfg.hideGridView)
            ? (
              <DataTable
                id={`${cfg.name}-table`}
                domain={cfg.name}
                compact
                columns={effectiveColumns}
                rows={cfg.mapRows
                  ? cfg.mapRows(items, state)
                  : items.map((item) => ({ ...cfg.toRow(item), _q: state.q }))}
                sort={{
                  url: `/${cfg.name}/view`,
                  target: `#${cfg.name}-view`,
                  include: `#${cfg.name}-toolbar`,
                  current: state.sort,
                  order: state.order,
                }}
                tbodyFooter={hasMore && nextOffset !== undefined
                  ? (
                    <TableSentinelRow
                      domain={cfg.name}
                      stateKeys={cfg.stateKeys}
                      state={state}
                      nextOffset={nextOffset}
                      columnCount={cfg.columns.length}
                    />
                  )
                  : undefined}
              />
            )
            : cfg.Card
            ? (
              <GridView
                Card={cfg.Card}
                items={items}
                toRow={cfg.toRow}
                name={cfg.name}
                q={state.q}
                sentinel={hasMore && nextOffset !== undefined
                  ? (
                    <GridSentinelDiv
                      domain={cfg.name}
                      stateKeys={cfg.stateKeys}
                      state={state}
                      nextOffset={nextOffset}
                    />
                  )
                  : undefined}
              />
            )
            : <EmptyState message={cfg.emptyMessage} />}
        </div>
      </>
    );
  };

  return DomainViewContainer;
}

// ---------------------------------------------------------------------------
// Full page — toolbar + view container + form container
// ---------------------------------------------------------------------------

export function createDomainPage<T extends Entity>(
  cfg: DomainConfig<T, unknown, unknown>,
) {
  const ViewContainer = createDomainViewContainer(cfg);

  type PageProps = ViewProps & {
    items: T[];
    totalCount?: number;
    filteredCount?: number;
    state: DomainFilterState;
    dynamicFilterOptions?: DynamicFilterOptions;
    customContent?: ReturnType<FC>;
    topSlotContent?: ReturnType<FC>;
    hasMore?: boolean;
    nextOffset?: number;
  };

  const DomainPage: FC<PageProps> = async (
    {
      items,
      totalCount,
      filteredCount,
      state,
      dynamicFilterOptions,
      customContent,
      topSlotContent = null,
      hasMore,
      nextOffset,
      ...viewProps
    },
  ) => {
    const showFilters = hasFilterControls(cfg);
    const activeFilterCount = countActiveFilters(cfg, state);
    // Open by default when filters are active. The native <details> element
    // owns the open/closed state for the page lifetime — no persistence (UI
    // state is not stored; only backend data is).
    const filtersOpen = activeFilterCount > 0;
    return (
      <MainLayout
        title={cfg.singular}
        {...viewProps}
        styles={cfg.styles}
        scripts={cfg.scripts ?? []}
      >
        <main
          class="domain-page"
          data-domain={cfg.name}
          hx-ext="sse, morph"
          sse-connect="/sse"
          hx-get={`/${cfg.name}/view`}
          hx-trigger={`sse:${cfg.ssePrefix}.created, sse:${cfg.ssePrefix}.updated, sse:${cfg.ssePrefix}.deleted, global-filter:changed from:body`}
          hx-target={`#${cfg.name}-view`}
          hx-swap="morph:outerHTML"
          hx-include={`#${cfg.name}-toolbar`}
        >
          <header class="domain-page__header">
            <h1 class="domain-page__title">
              {cfg.plural ?? `${cfg.singular}s`}
            </h1>
            <span id={`${cfg.name}-count`} class="domain-page__count">
              {totalCount !== undefined &&
                  (filteredCount ?? items.length) !== totalCount
                ? `${filteredCount ?? items.length}/${totalCount}`
                : `${filteredCount ?? items.length} total`}
            </span>
            <button
              class="btn btn--primary"
              type="button"
              hx-get={`/${cfg.name}/new`}
              hx-target={`#${cfg.name}-form-container`}
              hx-swap="innerHTML"
              hx-include={`#${cfg.name}-toolbar`}
            >
              New
            </button>
          </header>

          <div id={`${cfg.name}-toolbar`} class="domain-toolbar">
            <div class="domain-toolbar__left">
              <input
                type="search"
                class="domain-toolbar__search"
                name="q"
                value={state.q ?? ""}
                placeholder={`Search ${cfg.plural ?? `${cfg.singular}s`}...`}
                aria-label="Search"
                hx-get={`/${cfg.name}/view`}
                hx-trigger="input changed delay:300ms, search"
                hx-target={`#${cfg.name}-view`}
                hx-swap="outerHTML"
                hx-include={`#${cfg.name}-toolbar`}
              />
              {state.sort && (
                <button
                  type="button"
                  class="btn btn--ghost btn--sm"
                  hx-get={`/${cfg.name}/view?sort=&order=`}
                  hx-include={`#${cfg.name}-toolbar`}
                  hx-target={`#${cfg.name}-view`}
                  hx-swap="outerHTML"
                  aria-label="Clear sort"
                  title="Clear sort"
                >
                  ↺ Clear sort
                </button>
              )}
            </div>
            <div class="domain-toolbar__right">
              {cfg.toolbarActions && <cfg.toolbarActions />}
              {cfg.pageSizeOptions && (
                <select
                  class="filter-bar__select"
                  name="limit"
                  hx-get={`/${cfg.name}/view`}
                  hx-trigger="change"
                  hx-target={`#${cfg.name}-view`}
                  hx-swap="outerHTML"
                  hx-include={`#${cfg.name}-toolbar`}
                >
                  {cfg.pageSizeOptions.map((n) => (
                    <option
                      key={String(n)}
                      value={String(n)}
                      selected={String(state[`limit`] ?? cfg.pageSize) ===
                        String(n)}
                    >
                      {n} / page
                    </option>
                  ))}
                </select>
              )}
              <div id={`${cfg.name}-column-toggle-wrapper`}>
                <ColumnToggle
                  domain={cfg.name}
                  columns={cfg.columns}
                  view={state.view}
                />
              </div>
              <ViewToggleButtons
                domain={cfg.name}
                view={state.view}
                extraModes={cfg.extraViewModes}
                hideDefault={cfg.hideDefaultViews}
                hideGrid={cfg.hideGridView}
              />
            </div>
            {showFilters && (
              <details
                class="domain-toolbar__filters"
                open={filtersOpen}
              >
                <summary class="domain-toolbar__filters-summary btn btn--secondary btn--sm">
                  <span>Filters</span>
                  <FilterCountBadge
                    domain={cfg.name}
                    count={activeFilterCount}
                  />
                </summary>
                <div class="domain-toolbar__filters-panel">
                  {cfg.filters?.map((f) => {
                    const dynamicOpts = dynamicFilterOptions?.[f.name];
                    const options = dynamicOpts
                      ? dynamicOpts.map((v) =>
                        typeof v === "string" ? { value: v, label: v } : v
                      )
                      : f.options;
                    return (
                      <select
                        key={f.name}
                        class="filter-bar__select"
                        name={f.name}
                        hx-get={`/${cfg.name}/view`}
                        hx-trigger="change"
                        hx-target={`#${cfg.name}-view`}
                        hx-swap="outerHTML"
                        hx-include={`#${cfg.name}-toolbar`}
                      >
                        <option value="">{f.label}</option>
                        {options.map((o) => (
                          <option
                            key={o.value}
                            value={o.value}
                            selected={state[f.name] === o.value}
                          >
                            {o.label}
                          </option>
                        ))}
                      </select>
                    );
                  })}
                  {(() => {
                    const dr = effectiveDateRangeFilter(cfg);
                    return (
                      <DateRangeFilter
                        domain={cfg.name}
                        fromKey={dr.fromKey}
                        toKey={dr.toKey}
                        fromLabel={dr.fromLabel}
                        toLabel={dr.toLabel}
                        state={state}
                      />
                    );
                  })()}
                  {cfg.hideCompleted && (
                    <label class="domain-toolbar__toggle">
                      <input
                        type="checkbox"
                        name="hideCompleted"
                        value="true"
                        checked={state.hideCompleted}
                        hx-get={`/${cfg.name}/view`}
                        hx-trigger="change"
                        hx-target={`#${cfg.name}-view`}
                        hx-swap="outerHTML"
                        hx-include={`#${cfg.name}-toolbar`}
                      />
                      <span class="domain-toolbar__toggle-label">
                        Hide completed
                      </span>
                    </label>
                  )}
                  {cfg.showHiddenToggle && (
                    <label class="domain-toolbar__toggle">
                      <input
                        type="checkbox"
                        name="showHidden"
                        value="true"
                        checked={state.showHidden === true ||
                          state.showHidden === "true"}
                        hx-get={`/${cfg.name}/view`}
                        hx-trigger="change"
                        hx-target={`#${cfg.name}-view`}
                        hx-swap="outerHTML"
                        hx-include={`#${cfg.name}-toolbar`}
                      />
                      <span class="domain-toolbar__toggle-label">
                        Show hidden
                      </span>
                    </label>
                  )}
                  {cfg.supportsArchive !== false && (
                    <label class="domain-toolbar__toggle">
                      <input
                        type="checkbox"
                        name="archived"
                        value="true"
                        checked={state.archived === "true"}
                        hx-get={`/${cfg.name}/view`}
                        hx-trigger="change"
                        hx-target={`#${cfg.name}-view`}
                        hx-swap="outerHTML"
                        hx-include={`#${cfg.name}-toolbar`}
                      />
                      <span class="domain-toolbar__toggle-label">
                        Show archived
                      </span>
                    </label>
                  )}
                </div>
              </details>
            )}
          </div>

          {topSlotContent}

          <ViewContainer
            items={items}
            state={state}
            customContent={customContent}
            hasMore={hasMore}
            nextOffset={nextOffset}
          />
        </main>
        <div id={`${cfg.name}-form-container`} />
      </MainLayout>
    );
  };

  return { DomainPage, DomainViewContainer: ViewContainer };
}

// ---------------------------------------------------------------------------
// Form component factory
// ---------------------------------------------------------------------------

export function createDomainForm<T extends Entity>(cfg: {
  domain: string;
  singular: string;
  fields: FieldDef[];
  idField?: string;
  /** Field names edited in-place on the detail page — hidden from the edit form. */
  inlineEditFields?: string[];
  /** Edit-mode value override hook (see DomainConfig.formValueOverrides). */
  formValueOverrides?: (item: T) => Record<string, string>;
}) {
  const DomainForm: FC<{
    item?: T;
    displayValues?: Record<string, string>;
    arrayDisplayValues?: Record<string, Record<string, string>[]>;
    dynamicOptions?: Record<string, { value: string; label: string }[]>;
    prefillValues?: Record<string, string>;
  }> = (
    { item, displayValues, arrayDisplayValues, dynamicOptions, prefillValues },
  ) => {
    const isEdit = !!item;
    const id = isEdit ? item[cfg.idField ?? "id"] : undefined;
    const values: Record<string, string> = {};
    if (item) {
      for (const f of cfg.fields) {
        const raw = item[f.name as keyof T];
        if (f.type === "textarea" && Array.isArray(raw)) {
          values[f.name] = raw.join("\n");
        } else if (f.type === "tags" && Array.isArray(raw)) {
          values[f.name] = raw.join(",");
        } else if (f.type === "array-table" && Array.isArray(raw)) {
          values[f.name] = JSON.stringify(raw);
        } else {
          values[f.name] = String(raw ?? "");
        }
      }
    }
    // Apply domain-supplied overrides — replace keys after the default
    // item-to-string fill (e.g. reshape `string[]` into array-table JSON).
    if (isEdit && item && cfg.formValueOverrides) {
      Object.assign(values, cfg.formValueOverrides(item));
    }
    // Merge resolved values into form values — covers nested fields
    // (e.g. billingAddress.street → street) that don't exist on the entity root.
    if (displayValues) {
      for (const [k, v] of Object.entries(displayValues)) {
        if (!values[k]) values[k] = v;
      }
    }
    // In edit mode, drop fields edited in-place on the detail page.
    const inline = cfg.inlineEditFields;
    const formFields = isEdit && inline && inline.length > 0
      ? cfg.fields.filter((f) =>
        f.type === "hidden" || !inline.includes(f.name)
      )
      : cfg.fields;
    // Override select options with config-driven values when provided.
    const fields = dynamicOptions
      ? formFields.map((f) =>
        f.type === "select" && dynamicOptions[f.name]
          ? { ...f, options: dynamicOptions[f.name] }
          : f
      )
      : formFields;
    return (
      <FormBuilder
        id={`${cfg.domain}-form`}
        title={isEdit ? `Edit ${cfg.singular}` : `Create ${cfg.singular}`}
        fields={fields}
        values={isEdit ? values : prefillValues}
        displayValues={displayValues}
        arrayDisplayValues={arrayDisplayValues}
        action={isEdit ? `/${cfg.domain}/${id}/edit` : `/${cfg.domain}/new`}
        method="post"
        open
      />
    );
  };

  return DomainForm;
}
