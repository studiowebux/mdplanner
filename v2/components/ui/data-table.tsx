import type { FC } from "hono/jsx";

export type ColumnDef = {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: Record<string, unknown>) => unknown;
};

type Props = {
  id?: string;
  columns: ColumnDef[];
  rows: Record<string, unknown>[];
  rowId?: string;
};

export const DataTable: FC<Props> = ({ id, columns, rows, rowId = "id" }) => (
  <div class="data-table-wrapper">
    <table id={id} class="data-table">
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
          <tr key={String(row[rowId])} class="data-table__row" data-row-id={String(row[rowId])}>
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
