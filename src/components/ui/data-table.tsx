import type { FC } from "hono/jsx";

export type ColumnDef = {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: Record<string, unknown>) => unknown;
};

type SortConfig = {
  url: string;
  target: string;
  include?: string;
  current?: string;
  order?: "asc" | "desc";
};

type Props = {
  id?: string;
  domain?: string;
  compact?: boolean;
  columns: ColumnDef[];
  rows: Record<string, unknown>[];
  rowId?: string;
  sort?: SortConfig;
  /** Extra content appended inside <tbody> — used for load-more sentinels. */
  tbodyFooter?: unknown;
};

export const DataTable: FC<Props> = (
  { id, domain, compact, columns, rows, rowId = "id", sort, tbodyFooter },
) => (
  <div class="data-table-wrapper">
    <table
      id={id}
      class={`data-table${compact ? " data-table--compact" : ""}`}
      {...(domain ? { "data-column-table": domain } : {})}
    >
      <thead class="data-table__head">
        <tr>
          {columns.map((col) => {
            const isSorted = sort?.current === col.key;
            const nextOrder = isSorted && sort?.order === "asc"
              ? "desc"
              : "asc";
            return (
              <th
                key={col.key}
                class={`data-table__th${
                  col.sortable ? " data-table__th--sortable" : ""
                }${isSorted ? " data-table__th--sorted" : ""}${
                  isSorted && sort?.order === "asc"
                    ? " data-table__th--asc"
                    : ""
                }${
                  isSorted && sort?.order === "desc"
                    ? " data-table__th--desc"
                    : ""
                }`}
                data-col={col.key}
                {...(col.sortable && sort
                  ? {
                    "hx-get": `${sort.url}?sort=${col.key}&order=${nextOrder}`,
                    "hx-target": sort.target,
                    "hx-swap": "outerHTML swap:100ms",
                    ...(sort.include ? { "hx-include": sort.include } : {}),
                  }
                  : {})}
              >
                {col.label}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody class="data-table__body">
        {rows.map((row) => (
          <tr
            key={String(row[rowId])}
            id={String(row[rowId])}
            class="data-table__row"
            data-row-id={String(row[rowId])}
          >
            {columns.map((col) => (
              <td key={col.key} class="data-table__td" data-col={col.key}>
                {col.render
                  ? col.render(row[col.key], row)
                  : String(row[col.key] ?? "")}
              </td>
            ))}
          </tr>
        ))}
        {tbodyFooter}
      </tbody>
    </table>
  </div>
);
