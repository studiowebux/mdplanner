// Domain view factory — generates the list page + view container from a
// DomainConfig. No domain-specific logic here. Pagination sentinels live in
// domain-view-pagination.tsx, filter/toolbar controls in domain-view-filters.tsx,
// and the create/edit form in domain-form.tsx; the moved public factories are
// re-exported below so the `factories/domain-view` import path is unchanged.

import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { SseListRefresh } from "../views/components/sse-refresh.tsx";
import { DataTable } from "../components/ui/data-table.tsx";
import type { ColumnDef } from "../components/ui/data-table.tsx";
import { EmptyState } from "../components/ui/empty-state.tsx";
import { createArchiveActionBtns } from "../components/ui/action-btns.tsx";
import type { ViewProps } from "../types/app.ts";
import {
  type DomainConfig,
  type DomainFilterState,
  type DynamicFilterOptions,
  effectiveDateRangeFilter,
  type Entity,
} from "./domain.types.ts";
import {
  createMoreFragment,
  GridSentinelDiv,
  TableSentinelRow,
} from "./domain-view-pagination.tsx";
import {
  ColumnToggle,
  countActiveFilters,
  DateRangeFilter,
  FilterCountBadge,
  GridView,
  hasFilterControls,
  ViewToggleButtons,
} from "./domain-view-filters.tsx";

export { createMoreFragment, GridSentinelDiv, TableSentinelRow };
export { createDomainForm } from "./domain-form.tsx";

// ---------------------------------------------------------------------------
// View container — swapped via htmx on filter/toggle/SSE
// ---------------------------------------------------------------------------

/** Factory: builds the htmx-swappable list container FC (grid/table body + result counts) for a domain. */
export function createDomainViewContainer<T extends Entity>(
  cfg: DomainConfig<T, unknown, unknown>,
) {
  const plural = cfg.plural ?? `${cfg.singular}s`;

  // OOB-swapped header controls emitted only on fragment (htmx) responses.
  const FragmentControls: FC<{
    items: T[];
    totalCount?: number;
    filteredCount?: number;
    state: DomainFilterState;
  }> = ({ items, totalCount, filteredCount, state }) => (
    <>
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
      <ViewToggleButtons
        domain={cfg.name}
        view={state.view}
        oobSwap="morph"
        extraModes={cfg.extraViewModes}
        hideDefault={cfg.hideDefaultViews}
        hideGrid={cfg.hideGridView}
      />
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
      {hasFilterControls(cfg) && (
        <FilterCountBadge
          domain={cfg.name}
          count={countActiveFilters(cfg, state)}
          oob
        />
      )}
    </>
  );

  // The view body: custom content, empty state, table, or card grid.
  const ViewBody: FC<{
    items: T[];
    state: DomainFilterState;
    archivedActive: boolean;
    effectiveColumns: ColumnDef[];
    customContent?: ReturnType<FC>;
    hasMore?: boolean;
    nextOffset?: number;
  }> = (
    {
      items,
      state,
      archivedActive,
      effectiveColumns,
      customContent,
      hasMore,
      nextOffset,
    },
  ) => {
    if (customContent) return <>{customContent}</>;
    if (items.length === 0) {
      return (
        <EmptyState
          message={archivedActive
            ? `No archived ${plural} yet.`
            : cfg.emptyMessage}
        />
      );
    }
    if (state.view === "table" || cfg.hideGridView) {
      return (
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
      );
    }
    if (cfg.Card) {
      return (
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
      );
    }
    return <EmptyState message={cfg.emptyMessage} />;
  };

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
          <FragmentControls
            items={items}
            totalCount={totalCount}
            filteredCount={filteredCount}
            state={state}
          />
        )}
        <div id={`${cfg.name}-view`} class="view-container">
          <input type="hidden" name="view" value={state.view} />
          <ViewBody
            items={items}
            state={state}
            archivedActive={archivedActive}
            effectiveColumns={effectiveColumns}
            customContent={customContent}
            hasMore={hasMore}
            nextOffset={nextOffset}
          />
        </div>
      </>
    );
  };

  return DomainViewContainer;
}

// ---------------------------------------------------------------------------
// Full page — toolbar + view container + form container
// ---------------------------------------------------------------------------

/** Factory: builds the full domain list page FC — toolbar + view container + form sidenav container. */
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

  const DomainPageHeader: FC<{
    totalCount?: number;
    filteredCount?: number;
    itemCount: number;
    state: DomainFilterState;
  }> = ({ totalCount, filteredCount, itemCount }) => {
    const plural = cfg.plural ?? `${cfg.singular}s`;
    const shown = filteredCount ?? itemCount;
    const countLabel = totalCount !== undefined && shown !== totalCount
      ? `${shown}/${totalCount}`
      : `${shown} total`;
    return (
      <header class="domain-page__header">
        <h1 class="domain-page__title">{plural}</h1>
        <span id={`${cfg.name}-count`} class="domain-page__count">
          {countLabel}
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
    );
  };

  const DomainPageFiltersPanel: FC<{
    state: DomainFilterState;
    dynamicFilterOptions?: DynamicFilterOptions;
    filtersOpen: boolean;
    activeFilterCount: number;
  }> = ({ state, dynamicFilterOptions, filtersOpen, activeFilterCount }) => {
    const dr = effectiveDateRangeFilter(cfg);
    return (
      <details class="domain-toolbar__filters" open={filtersOpen}>
        <summary class="domain-toolbar__filters-summary btn btn--secondary btn--sm">
          <span>Filters</span>
          <FilterCountBadge domain={cfg.name} count={activeFilterCount} />
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
                hx-swap="morph:outerHTML"
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
          <DateRangeFilter
            domain={cfg.name}
            fromKey={dr.fromKey}
            toKey={dr.toKey}
            fromLabel={dr.fromLabel}
            toLabel={dr.toLabel}
            state={state}
          />
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
                hx-swap="morph:outerHTML"
                hx-include={`#${cfg.name}-toolbar`}
              />
              <span class="domain-toolbar__toggle-label">Hide completed</span>
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
                hx-swap="morph:outerHTML"
                hx-include={`#${cfg.name}-toolbar`}
              />
              <span class="domain-toolbar__toggle-label">Show hidden</span>
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
                hx-swap="morph:outerHTML"
                hx-include={`#${cfg.name}-toolbar`}
              />
              <span class="domain-toolbar__toggle-label">View archived</span>
            </label>
          )}
        </div>
      </details>
    );
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
    const plural = cfg.plural ?? `${cfg.singular}s`;
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
          hx-indicator="#global-loading"
          hx-get={`/${cfg.name}/view`}
          hx-trigger="global-filter:changed from:body"
          hx-target={`#${cfg.name}-view`}
          hx-swap="morph:outerHTML"
          hx-include={`#${cfg.name}-toolbar`}
        >
          {
            /*
            SSE background refreshes ride a dedicated hidden element so they do
            NOT flash the shared #global-loading bar (it strobed on every
            mutation). It carries its OWN hx-get/target/swap/include (htmx 2.x
            does not inherit the request verb from <main> — only modifier attrs
            inherit), and hx-indicator="this" pins the request indicator to this
            hidden node, i.e. no visible bar. User-initiated swaps (filter/sort/
            search/pagination, global-filter) still use <main>'s #global-loading.
          */
          }
          {cfg.SseRefresh
            ? <cfg.SseRefresh state={state} />
            : <SseListRefresh name={cfg.name} ssePrefix={cfg.ssePrefix} />}
          <DomainPageHeader
            totalCount={totalCount}
            filteredCount={filteredCount}
            itemCount={items.length}
            state={state}
          />

          <div id={`${cfg.name}-toolbar`} class="domain-toolbar">
            <div class="domain-toolbar__left">
              <input
                type="search"
                class="domain-toolbar__search"
                name="q"
                value={state.q ?? ""}
                placeholder={`Search ${plural}...`}
                aria-label="Search"
                hx-get={`/${cfg.name}/view`}
                hx-trigger="input changed delay:300ms, search"
                hx-target={`#${cfg.name}-view`}
                hx-swap="morph:outerHTML"
                hx-include={`#${cfg.name}-toolbar`}
              />
              {state.sort && (
                <button
                  type="button"
                  class="btn btn--ghost btn--sm"
                  hx-get={`/${cfg.name}/view?sort=&order=`}
                  hx-include={`#${cfg.name}-toolbar`}
                  hx-target={`#${cfg.name}-view`}
                  hx-swap="morph:outerHTML"
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
                  hx-swap="morph:outerHTML"
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
              <DomainPageFiltersPanel
                state={state}
                dynamicFilterOptions={dynamicFilterOptions}
                filtersOpen={filtersOpen}
                activeFilterCount={activeFilterCount}
              />
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
