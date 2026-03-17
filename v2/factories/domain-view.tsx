// Domain view factory — generates page, view container, toolbar components
// from a DomainConfig. No domain-specific logic here.

import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { CardGrid } from "../components/ui/card-grid.tsx";
import { DataTable } from "../components/ui/data-table.tsx";
import { EmptyState } from "../components/ui/empty-state.tsx";
import { FormBuilder } from "../components/ui/form-builder.tsx";
import type { FieldDef } from "../components/ui/form-builder.tsx";
import type { ViewMode, ViewProps } from "../types/app.ts";
import type { DomainConfig, DomainFilterState } from "./domain.types.ts";

// ---------------------------------------------------------------------------
// View toggle buttons
// ---------------------------------------------------------------------------

function ViewToggleButtons(
  { domain, view, oobSwap }: {
    domain: string;
    view: ViewMode;
    oobSwap?: string;
  },
) {
  const id = `${domain}-view-toggle`;
  return (
    <div
      id={id}
      class="view-toggle"
      {...(oobSwap ? { "hx-swap-oob": oobSwap } : {})}
    >
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
// View container — swapped via htmx on filter/toggle/SSE
// ---------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
export function createDomainViewContainer<T>(cfg: DomainConfig<T, any, any>) {
  const DomainViewContainer: FC<{
    items: T[];
    state: DomainFilterState;
    fragment?: boolean;
  }> = ({ items, state, fragment }) => (
    <div id={`${cfg.name}-view`} class="view-container">
      <input type="hidden" name="view" value={state.view} />
      {fragment && (
        <span
          id={`${cfg.name}-count`}
          class="domain-page__count"
          {...{ "hx-swap-oob": "true" }}
        >
          {items.length} total
        </span>
      )}
      {fragment && (
        <ViewToggleButtons domain={cfg.name} view={state.view} oobSwap="true" />
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
      {items.length === 0
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
          />
        )
        : (
          <CardGrid id={`${cfg.name}-grid`}>
            {items.map((item) => {
              const row = cfg.toRow(item);
              return (
                <div key={String(row.id)} id={String(row.id)}>
                  <cfg.Card item={item} q={state.q} />
                </div>
              );
            })}
          </CardGrid>
        )}
    </div>
  );

  return DomainViewContainer;
}

// ---------------------------------------------------------------------------
// Full page — toolbar + view container + form container
// ---------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
export function createDomainPage<T>(cfg: DomainConfig<T, any, any>) {
  const ViewContainer = createDomainViewContainer(cfg);

  type PageProps = ViewProps & {
    items: T[];
    state: DomainFilterState;
    dynamicFilterOptions?: Record<string, string[]>;
  };

  const DomainPage: FC<PageProps> = (
    { items, nonce, activePath, state, dynamicFilterOptions },
  ) => (
    <MainLayout
      title={cfg.singular}
      nonce={nonce}
      activePath={activePath}
      styles={cfg.styles}
      scripts={[]}
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
          <h1 class="domain-page__title">{cfg.singular}s</h1>
          <span id={`${cfg.name}-count`} class="domain-page__count">
            {items.length} total
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
                ? dynamicOpts.map((v) => ({ value: v, label: v }))
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
            <div id={`${cfg.name}-column-toggle-wrapper`}>
              <ColumnToggle
                domain={cfg.name}
                columns={cfg.columns}
                view={state.view}
              />
            </div>
            <ViewToggleButtons domain={cfg.name} view={state.view} />
          </div>
        </div>

        <ViewContainer items={items} state={state} />
      </main>
      <div id={`${cfg.name}-form-container`} />
    </MainLayout>
  );

  return { DomainPage, DomainViewContainer: ViewContainer };
}

// ---------------------------------------------------------------------------
// Form component factory
// ---------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
export function createDomainForm<T extends Record<string, any>>(cfg: {
  domain: string;
  singular: string;
  fields: FieldDef[];
  idField?: string;
}) {
  const DomainForm: FC<{ item?: T }> = ({ item }) => {
    const isEdit = !!item;
    const id = isEdit ? item[cfg.idField ?? "id"] : undefined;
    const values: Record<string, string> = {};
    if (item) {
      for (const f of cfg.fields) {
        values[f.name] = String(item[f.name as keyof T] ?? "");
      }
    }
    return (
      <FormBuilder
        id={`${cfg.domain}-form`}
        title={isEdit ? `Edit ${cfg.singular}` : `Create ${cfg.singular}`}
        fields={cfg.fields}
        values={isEdit ? values : undefined}
        action={isEdit ? `/${cfg.domain}/${id}/edit` : `/${cfg.domain}/new`}
        method="post"
        open
      />
    );
  };

  return DomainForm;
}
