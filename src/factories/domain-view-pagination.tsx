// Domain view pagination — load-more sentinels and the /more response fragment.
// Leaf module: depends only on shared UI/types, never on the view/filters/form
// factories (keeps the domain-view split acyclic).

import type { FC } from "hono/jsx";
import type { ColumnDef } from "../components/ui/data-table.tsx";
import { createArchiveActionBtns } from "../components/ui/action-btns.tsx";
import { type DomainFilterState, type Entity } from "./domain.types.ts";

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
