// Task timeline view — gantt-style horizontal bars for tasks with dates.
// Bars positioned with percentage-based left/width (same approach as v1).
// Tasks without planned_start/planned_end shown in an "Unscheduled" list.

import type { FC } from "hono/jsx";
import type {
  ScheduledTask,
  Task,
  TaskViewProps,
} from "../../types/task.types.ts";
import { SECTION_DISPLAY_ORDER } from "../../constants/mod.ts";
import { TASK_PRIORITY_LABELS } from "../../domains/task/constants.tsx";

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function parseDate(s: string): Date {
  return new Date(s + "T00:00:00");
}

function formatShortDate(d: Date): string {
  const m = d.toLocaleString("en-US", { month: "short" });
  return `${m} ${d.getDate()}`;
}

// ---------------------------------------------------------------------------
// Compute timeline range (with 1-day padding)
// ---------------------------------------------------------------------------

function computeRange(tasks: ScheduledTask[]) {
  let earliest = tasks[0]._start;
  let latest = tasks[0]._end;
  for (const t of tasks) {
    if (t._start < earliest) earliest = t._start;
    if (t._end > latest) latest = t._end;
  }
  const rangeStart = new Date(earliest);
  rangeStart.setDate(rangeStart.getDate() - 1);
  // Extend rangeEnd past the 1st of the next month so the closing grid line is visible
  // Extend rangeEnd to the end of the month after the latest task
  const rangeEnd = new Date(latest);
  rangeEnd.setDate(1);
  rangeEnd.setMonth(rangeEnd.getMonth() + 2);
  rangeEnd.setDate(0);
  const totalDays = daysBetween(rangeStart, rangeEnd) || 1;
  return { rangeStart, rangeEnd, totalDays };
}

// ---------------------------------------------------------------------------
// Month/quarter markers
// ---------------------------------------------------------------------------

type MonthMarker = {
  label: string;
  leftPct: string;
  quarter: boolean;
};

/** Minimum percentage gap between month markers to avoid text overlap. */
const MIN_MARKER_GAP_PCT = 5;

function buildMonthMarkers(
  rangeStart: Date,
  rangeEnd: Date,
  totalDays: number,
): MonthMarker[] {
  const markers: MonthMarker[] = [];
  const cursor = new Date(rangeStart);
  cursor.setDate(1);
  let lastPct = -MIN_MARKER_GAP_PCT;
  while (cursor <= rangeEnd) {
    const offset = daysBetween(rangeStart, cursor);
    const pct = Math.max(0, (offset / totalDays) * 100);
    if (pct - lastPct >= MIN_MARKER_GAP_PCT) {
      markers.push({
        label: cursor.toLocaleString("en-US", {
          month: "short",
          year: "numeric",
        }),
        leftPct: `${pct.toFixed(2)}%`,
        quarter: cursor.getMonth() % 3 === 0,
      });
      lastPct = pct;
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return markers;
}

// ---------------------------------------------------------------------------
// Bar percentage positioning — returns left/width as strings for data attrs
// ---------------------------------------------------------------------------

function barDataAttrs(
  task: ScheduledTask,
  rangeStart: Date,
  totalDays: number,
): { left: string; width: string } {
  const startOffset = daysBetween(rangeStart, task._start);
  const duration = daysBetween(task._start, task._end) || 1;
  return {
    left: `${((startOffset / totalDays) * 100).toFixed(2)}%`,
    width: `${((duration / totalDays) * 100).toFixed(2)}%`,
  };
}

// ---------------------------------------------------------------------------
// Unscheduled task row
// ---------------------------------------------------------------------------

const UnscheduledRow: FC<{ task: Task }> = ({ task }) => (
  <div class="task-timeline__unscheduled-row">
    {task.priority && (
      <span class={`task-priority task-priority--${task.priority}`}>
        {TASK_PRIORITY_LABELS[String(task.priority)] ?? `P${task.priority}`}
      </span>
    )}
    <a href={`/tasks/${task.id}`}>{task.title}</a>
    <span class="task-list__meta task-list__meta--muted">{task.section}</span>
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const ZOOM_LEVELS = [1, 2, 4, 6, 8] as const;
const PIXELS_PER_DAY = 40;

const ZoomControls: FC<{ current: number }> = ({ current }) => (
  <div class="task-timeline__zoom">
    {ZOOM_LEVELS.map((z) => (
      <button
        key={z}
        type="button"
        class={`btn btn--secondary btn--sm${
          current === z ? " view-toggle__btn--active" : ""
        }`}
        hx-get={`/tasks/view?zoom=${z}`}
        hx-target="#tasks-view"
        hx-swap="outerHTML"
        hx-include="#tasks-toolbar"
      >
        {z === 1 ? "1x" : `1/${z}`}
      </button>
    ))}
    <button
      id="timelineExportSVG"
      type="button"
      class="btn btn--tertiary btn--sm"
    >
      Export SVG
    </button>
    <button
      id="timelineExportPDF"
      type="button"
      class="btn btn--tertiary btn--sm"
    >
      Print
    </button>
  </div>
);

export const TaskTimelineView: FC<TaskViewProps> = ({ tasks, zoom = 1 }) => {
  if (tasks.length === 0) {
    return (
      <div class="task-timeline__empty">
        No tasks match the current filters.
      </div>
    );
  }

  const scheduled: ScheduledTask[] = [];
  const unscheduled: Task[] = [];
  for (const t of tasks) {
    if (t.planned_start && t.planned_end) {
      scheduled.push({
        ...t,
        _start: parseDate(t.planned_start),
        _end: parseDate(t.planned_end),
      });
    } else {
      unscheduled.push(t);
    }
  }

  const sectionOrder = new Map<string, number>(
    SECTION_DISPLAY_ORDER.map((s, i) => [s, i]),
  );
  scheduled.sort((a, b) => {
    const da = a._start.getTime() - b._start.getTime();
    if (da !== 0) return da;
    return (sectionOrder.get(a.section) ?? 99) -
      (sectionOrder.get(b.section) ?? 99);
  });

  return (
    <div class="task-timeline">
      {scheduled.length > 0 && (() => {
        const { rangeStart, rangeEnd, totalDays } = computeRange(scheduled);
        const markers = buildMonthMarkers(rangeStart, rangeEnd, totalDays);
        const chartWidth = Math.max(800, totalDays * (PIXELS_PER_DAY / zoom));
        return (
          <>
            <ZoomControls current={zoom} />
            <div class="task-timeline__chart">
              <div
                class="task-timeline__chart-inner"
                data-min-width={chartWidth}
              >
                {/* Header — month markers */}
                <div class="task-timeline__row task-timeline__row--header">
                  <div class="task-timeline__label task-timeline__label--header">
                    Task
                  </div>
                  <div class="task-timeline__track">
                    {markers.map((m) => (
                      <div
                        key={m.label}
                        class={`task-timeline__month-marker${
                          m.quarter
                            ? " task-timeline__month-marker--quarter"
                            : ""
                        }`}
                        data-left={m.leftPct}
                      >
                        {m.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* SVG overlay for dependency lines */}
                <svg class="task-timeline__deps" aria-hidden="true" />

                {/* Task rows */}
                {scheduled.map((t) => {
                  const blocked = t.blocked_by && t.blocked_by.length > 0;
                  const pos = barDataAttrs(t, rangeStart, totalDays);
                  return (
                    <div
                      key={t.id}
                      class={`task-timeline__row${
                        t.completed ? " task-timeline__row--completed" : ""
                      }`}
                      data-task-id={t.id}
                      {...(blocked
                        ? { "data-blocked-by": t.blocked_by!.join(",") }
                        : {})}
                    >
                      <div class="task-timeline__label">
                        {t.priority && (
                          <span
                            class={`task-priority task-priority--${t.priority}`}
                          >
                            {TASK_PRIORITY_LABELS[String(t.priority)] ??
                              `P${t.priority}`}
                          </span>
                        )}
                        <a
                          href={`/tasks/${t.id}`}
                          class="task-timeline__row-title"
                        >
                          {t.title}
                        </a>
                        {blocked && (
                          <span
                            class="task-timeline__blocked"
                            title={t.blocked_by!.join(", ")}
                          >
                            {t.blocked_by!.length}
                          </span>
                        )}
                      </div>
                      <div class="task-timeline__track">
                        {/* Month grid lines */}
                        {markers.map((m) => (
                          <div
                            key={`line-${m.label}`}
                            class={`task-timeline__grid-line${
                              m.quarter
                                ? " task-timeline__grid-line--quarter"
                                : ""
                            }`}
                            data-left={m.leftPct}
                          />
                        ))}
                        {/* Bar */}
                        <div
                          class={`task-timeline__bar task-timeline__bar--p${
                            t.priority ?? 3
                          }${
                            t.completed ? " task-timeline__bar--completed" : ""
                          }`}
                          data-left={pos.left}
                          data-width={pos.width}
                        >
                          <span class="task-timeline__bar-dates">
                            {formatShortDate(t._start)} —{" "}
                            {formatShortDate(t._end)}{" "}
                            ({daysBetween(t._start, t._end)}d)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        );
      })()}

      {scheduled.length === 0 && (
        <div class="task-timeline__no-dates">
          No tasks have planned start and end dates. Set dates to see the
          timeline.
        </div>
      )}

      {unscheduled.length > 0 && (
        <div class="task-timeline__unscheduled">
          <h3 class="task-timeline__unscheduled-title">
            Unscheduled ({unscheduled.length})
          </h3>
          {unscheduled.map((t) => <UnscheduledRow key={t.id} task={t} />)}
        </div>
      )}
    </div>
  );
};
