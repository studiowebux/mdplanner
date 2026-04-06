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
import type { ViewMode, ViewProps } from "../types/app.ts";
import type {
  DomainConfig,
  DomainFilterState,
  DynamicFilterOptions,
  Entity,
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
      hx-trigger="revealed"
      hx-swap="outerHTML"
    >
      <td class="load-more-sentinel__cell" colspan={columnCount}>
        <span class="load-more-sentinel__text">Loading more…</span>
      </td>
    </tr>
  );
}

/** Sentinel <div> rendered after the card grid — triggers load-more on reveal. */
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
      hx-trigger="revealed"
      hx-swap="outerHTML"
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
  toRow: (item: T) => Record<string, unknown>;
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
    if (view === "table") {
      const rows: Record<string, unknown>[] = items.map((item) => ({
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
              {cfg.columns.map((col) => (
                <td key={col.key} class="data-table__td" data-col={col.key}>
                  {col.render
                    ? col.render(row[col.key], row)
                    : String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
          {hasMore && (
            <TableSentinelRow
              domain={cfg.name}
              stateKeys={cfg.stateKeys}
              state={state}
              nextOffset={nextOffset}
              columnCount={cfg.columns.length}
            />
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
            <GridSentinelDiv
              domain={cfg.name}
              stateKeys={cfg.stateKeys}
              state={state}
              nextOffset={nextOffset}
            />
          )}
        </>
      );
    }

    return null;
  };
}

// ---------------------------------------------------------------------------
// View toggle buttons
// ---------------------------------------------------------------------------

function ViewToggleButtons(
  { domain, view, oobSwap, extraModes, hideDefault }: {
    domain: string;
    view: string;
    oobSwap?: string;
    extraModes?: { key: string; label: string }[];
    hideDefault?: boolean;
  },
) {
  const id = `${domain}-view-toggle`;
  return (
    <div
      id={id}
      class="view-toggle"
      {...(oobSwap ? { "hx-swap-oob": oobSwap } : {})}
    >
      {!hideDefault && (
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
      <summary class="btn btn--secondary btn--sm">Columns</summary>
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
  { Card, items, toRow, name, q }: {
    Card: FC<{ item: T; q?: string }>;
    items: T[];
    toRow: (item: T) => Record<string, unknown>;
    name: string;
    q?: string;
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
  ) => (
    <div id={`${cfg.name}-view`} class="view-container">
      <input type="hidden" name="view" value={state.view} />
      {fragment && (
        <span
          id={`${cfg.name}-count`}
          class="domain-page__count"
          {...{ "hx-swap-oob": "true" }}
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
          oobSwap="true"
          extraModes={cfg.extraViewModes}
          hideDefault={cfg.hideDefaultViews}
        />
      )}
      {fragment && (
        <div
          id={`${cfg.name}-column-toggle-wrapper`}
          {...{ "hx-swap-oob": "true" }}
        >
          <ColumnToggle
            domain={cfg.name}
            columns={cfg.columns}
            view={state.view}
          />
        </div>
      )}
      {customContent
        ? customContent
        : items.length === 0
        ? <EmptyState message={cfg.emptyMessage} />
        : state.view === "table"
        ? (
          <DataTable
            id={`${cfg.name}-table`}
            domain={cfg.name}
            compact
            columns={cfg.columns}
            rows={items.map((item) => ({ ...cfg.toRow(item), _q: state.q }))}
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
          <>
            <GridView
              Card={cfg.Card}
              items={items}
              toRow={cfg.toRow}
              name={cfg.name}
              q={state.q}
            />
            {hasMore && nextOffset !== undefined && (
              <GridSentinelDiv
                domain={cfg.name}
                stateKeys={cfg.stateKeys}
                state={state}
                nextOffset={nextOffset}
              />
            )}
          </>
        )
        : <EmptyState message={cfg.emptyMessage} />}
    </div>
  );

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
    hasMore?: boolean;
    nextOffset?: number;
  };

  const DomainPage: FC<PageProps> = (
    {
      items,
      totalCount,
      filteredCount,
      state,
      dynamicFilterOptions,
      customContent,
      hasMore,
      nextOffset,
      ...viewProps
    },
  ) => (
    <MainLayout
      title={cfg.singular}
      {...viewProps}
      styles={cfg.styles}
      scripts={cfg.scripts ?? []}
    >
      <main
        class="domain-page"
        data-domain={cfg.name}
        hx-ext="sse"
        sse-connect="/sse"
        hx-get={`/${cfg.name}/view`}
        hx-trigger={`sse:${cfg.ssePrefix}.created, sse:${cfg.ssePrefix}.updated, sse:${cfg.ssePrefix}.deleted`}
        hx-target={`#${cfg.name}-view`}
        hx-swap="outerHTML"
        hx-include={`#${cfg.name}-toolbar`}
      >
        <header class="domain-page__header">
          <h1 class="domain-page__title">{cfg.plural ?? `${cfg.singular}s`}</h1>
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
              placeholder={`Search ${cfg.name}...`}
              aria-label="Search"
              hx-get={`/${cfg.name}/view`}
              hx-trigger="input changed delay:300ms, search"
              hx-target={`#${cfg.name}-view`}
              hx-swap="outerHTML"
              hx-include={`#${cfg.name}-toolbar`}
            />
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
                <span class="domain-toolbar__toggle-label">Hide completed</span>
              </label>
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
            />
          </div>
        </div>

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
}) {
  const DomainForm: FC<{
    item?: T;
    displayValues?: Record<string, string>;
    dynamicOptions?: Record<string, { value: string; label: string }[]>;
  }> = (
    { item, displayValues, dynamicOptions },
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
    // Merge resolved values into form values — covers nested fields
    // (e.g. billingAddress.street → street) that don't exist on the entity root.
    if (displayValues) {
      for (const [k, v] of Object.entries(displayValues)) {
        if (!values[k]) values[k] = v;
      }
    }
    // Override select options with config-driven values when provided.
    const fields = dynamicOptions
      ? cfg.fields.map((f) =>
        f.type === "select" && dynamicOptions[f.name]
          ? { ...f, options: dynamicOptions[f.name] }
          : f
      )
      : cfg.fields;
    return (
      <FormBuilder
        id={`${cfg.domain}-form`}
        title={isEdit ? `Edit ${cfg.singular}` : `Create ${cfg.singular}`}
        fields={fields}
        values={isEdit ? values : undefined}
        displayValues={displayValues}
        action={isEdit ? `/${cfg.domain}/${id}/edit` : `/${cfg.domain}/new`}
        method="post"
        open
      />
    );
  };

  return DomainForm;
}
