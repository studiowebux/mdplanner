import type { FC } from "hono/jsx";

export type ColumnDef = {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: Record<string, unknown>) => unknown;
};

type Props = {
  id?: string;
  domain?: string;
  compact?: boolean;
  columns: ColumnDef[];
  rows: Record<string, unknown>[];
  rowId?: string;
  rowFilterAttrs?: (row: Record<string, unknown>) => Record<string, string>;
};

export const DataTable: FC<Props> = ({ id, domain, compact, columns, rows, rowId = "id", rowFilterAttrs }) => (
  <div class="data-table-wrapper">
    <table
      id={id}
      class={`data-table${compact ? " data-table--compact" : ""}`}
      {...(domain ? { "data-column-table": domain } : {})}
    >
      <thead class="data-table__head">
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              class={`data-table__th${col.sortable ? " data-table__th--sortable" : ""}`}
              data-sort-key={col.sortable ? col.key : undefined}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody class="data-table__body">
        {rows.map((row) => (
          <tr
            key={String(row[rowId])}
            class="data-table__row"
            data-row-id={String(row[rowId])}
            {...(rowFilterAttrs ? rowFilterAttrs(row) : {})}
          >
            {columns.map((col) => (
              <td key={col.key} class="data-table__td">
                {col.render
                  ? col.render(row[col.key], row)
                  : String(row[col.key] ?? "")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
