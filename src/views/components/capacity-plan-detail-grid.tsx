// Computed capacity grid, extracted from capacity-plan-detail.tsx. The per-cell
// content is split into its own <GridCell> FC, which flattens what was a deeply
// nested inline ternary chain inside the weeks.map() loop.

import type { FC } from "hono/jsx";
import type { GridRow, WeekCol } from "../capacity-plan-detail.tsx";

type GridCellData = {
  plannedHours: number;
  taskHours: number;
  tasks: { id: string; title: string; hours: number }[];
};

// One week cell's body: planned/assigned summary + optional task popup.
const GridCell: FC<{ cell: GridCellData }> = ({ cell }) => {
  const hasData = cell.plannedHours > 0 || cell.taskHours > 0;
  if (!hasData) {
    return <span class="capacity-plan-detail__cell-empty">—</span>;
  }
  return (
    <div
      class={`capacity-plan-detail__cell-wrap${
        cell.tasks.length > 0
          ? " capacity-plan-detail__cell-wrap--has-tasks"
          : ""
      }`}
    >
      <span class="capacity-plan-detail__cell-summary">
        <span class="capacity-plan-detail__legend-planned">
          {Math.round(cell.plannedHours)}h
        </span>
        {" / "}
        {cell.taskHours > 0
          ? (
            <span class="capacity-plan-detail__legend-tasks">
              {Math.round(cell.taskHours)}h
            </span>
          )
          : <span class="capacity-plan-detail__cell-empty">—</span>}
      </span>
      {cell.tasks.length > 0 && (
        <ul class="capacity-plan-detail__cell-popup">
          {cell.tasks.map((t) => (
            <li key={t.id}>
              <a href={`/tasks/${t.id}`}>{t.title}</a>{" "}
              <span class="capacity-plan-detail__cell-task-h">
                {Math.round(t.hours)}h
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const CapacityGrid: FC<{ weeks: WeekCol[]; rows: GridRow[] }> = (
  { weeks, rows },
) => {
  if (rows.length === 0) {
    return (
      <section class="detail-section capacity-plan-detail__section">
        <h2 class="section-heading">Capacity Grid</h2>
        <p class="capacity-plan-detail__empty">
          Add team members and allocations to see the capacity grid.
        </p>
      </section>
    );
  }

  return (
    <section class="detail-section capacity-plan-detail__section">
      <h2 class="section-heading">Capacity Grid</h2>
      <p class="capacity-plan-detail__grid-legend">
        <span class="capacity-plan-detail__legend-planned">Planned</span>
        {" / "}
        <span class="capacity-plan-detail__legend-tasks">Assigned Tasks</span>
        {" (hours)"}
      </p>
      <div class="capacity-plan-detail__grid-scroll">
        <table class="data-table capacity-plan-detail__grid">
          <thead>
            <tr class="data-table__th-row">
              <th class="data-table__th capacity-plan-detail__grid-person-col">
                Person
              </th>
              {weeks.map((w) => (
                <th
                  key={w.monday}
                  class="data-table__th capacity-plan-detail__grid-week-col"
                >
                  {w.label}
                </th>
              ))}
              <th class="data-table__th capacity-plan-detail__grid-total-col">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.personId} class="data-table__row">
                <td class="data-table__td capacity-plan-detail__grid-person-col">
                  <a href={`/people/${row.personId}`}>{row.personName}</a>
                </td>
                {weeks.map((w) => {
                  const cell = row.cells[w.monday] ?? {
                    plannedHours: 0,
                    taskHours: 0,
                    tasks: [],
                  };
                  const over = cell.taskHours > cell.plannedHours &&
                    cell.plannedHours > 0;
                  const free = cell.plannedHours > 0 && cell.taskHours === 0;
                  return (
                    <td
                      key={w.monday}
                      class={`data-table__td capacity-plan-detail__grid-cell${
                        over
                          ? " capacity-plan-detail__grid-cell--over"
                          : free
                          ? " capacity-plan-detail__grid-cell--free"
                          : ""
                      }`}
                    >
                      <GridCell cell={cell} />
                    </td>
                  );
                })}
                <td class="data-table__td capacity-plan-detail__grid-total-col">
                  <span class="capacity-plan-detail__legend-planned">
                    {Math.round(row.totalPlanned)}h
                  </span>
                  {row.totalTask > 0 && (
                    <>
                      {" / "}
                      <span class="capacity-plan-detail__legend-tasks">
                        {Math.round(row.totalTask)}h
                      </span>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
