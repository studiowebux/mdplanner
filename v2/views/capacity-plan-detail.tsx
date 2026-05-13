import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import type {
  CapacityPlan,
  TeamMemberRef,
} from "../types/capacity-plan.types.ts";
import type { ViewProps } from "../types/app.ts";
import { Sidenav } from "../components/ui/sidenav.tsx";
import { WEEKDAYS } from "../constants/mod.ts";

// ---------------------------------------------------------------------------
// Exported types — consumed by routes.tsx
// ---------------------------------------------------------------------------

export type WeekCol = { label: string; monday: string };

export type GridRow = {
  personId: string;
  personName: string;
  cells: Record<string, {
    plannedHours: number;
    taskHours: number;
    tasks: { id: string; title: string; hours: number }[];
  }>;
  totalPlanned: number;
  totalTask: number;
};

export type AllocationSummary = {
  id: string;
  planId: string;
  personId: string;
  personName: string;
  targetTitle: string;
  targetHref?: string;
  targetType: "project" | "milestone";
  projectName?: string;
  percentage?: number;
  hoursPerWeek?: number;
  notes?: string;
};

export type BandwidthRow = {
  personId: string;
  personName: string;
  totalPct: number;
  allocatedHours: number;
  availHours: number;
};

export type TargetOption = {
  value: string;
  label: string;
  type: "project" | "milestone";
};

// ---------------------------------------------------------------------------
// Member form (new)
// ---------------------------------------------------------------------------

const DEFAULT_WORKING_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export const MemberForm: FC<{
  planId: string;
  personOptions: { value: string; label: string }[];
  actorName?: string;
  actorId?: string;
}> = ({ planId, personOptions: _personOptions, actorName, actorId }) => (
  <Sidenav id="capacity-plan-member-form" title="Add Team Member" open>
    <form
      class="form"
      hx-post={`/capacity-plans/${planId}/members`}
      hx-swap="none"
    >
      <div class="form__body">
        <div class="form__field">
          <label class="form__label" for="member-person-search">Person</label>
          <div class="form__autocomplete">
            <input
              type="text"
              id="member-person-search"
              class="form__input"
              placeholder="Search people..."
              autocomplete="off"
              name="q"
              data-autocomplete-target="member-personId"
              hx-get="/autocomplete/people"
              hx-trigger="input changed delay:150ms, focus"
              hx-target="#member-person-results"
              hx-include="this"
              hx-swap="innerHTML"
              value={actorName ?? ""}
            />
            <input
              type="hidden"
              id="member-personId"
              name="personId"
              value={actorId ?? ""}
            />
            <ul class="form__autocomplete-list" id="member-person-results" />
          </div>
        </div>
        <div class="form__field">
          <label class="form__label" for="member-hoursPerDay">
            Hours / day
          </label>
          <input
            id="member-hoursPerDay"
            name="hoursPerDay"
            type="number"
            min="1"
            max="24"
            value="8"
            class="form__input"
          />
        </div>
        <div class="form__field">
          <label class="form__label">Working days</label>
          <div class="form__day-chips" id="member-day-chips">
            {WEEKDAYS.map((day) => (
              <label key={day} class="form__day-chip">
                <input
                  type="checkbox"
                  value={day}
                  checked={DEFAULT_WORKING_DAYS.includes(day)}
                  data-day-chip="member-workingDays"
                />
                {day}
              </label>
            ))}
          </div>
          <input
            type="hidden"
            name="workingDays"
            id="member-workingDays"
            value={DEFAULT_WORKING_DAYS.join(",")}
          />
        </div>
      </div>
      <div class="form__footer">
        <button type="submit" class="btn btn--primary">Add Member</button>
        <button type="button" class="btn" data-sidenav-close>Cancel</button>
      </div>
    </form>
  </Sidenav>
);

// ---------------------------------------------------------------------------
// Allocation form (new + edit)
// ---------------------------------------------------------------------------

export const AllocationForm: FC<{
  planId: string;
  memberOptions: { value: string; label: string }[];
  targetOptions: TargetOption[];
  allocId?: string;
  values?: {
    personId?: string;
    personName?: string;
    targetType?: string;
    targetId?: string;
    targetName?: string;
    percentage?: string;
    hoursPerWeek?: string;
    notes?: string;
  };
}> = (
  {
    planId,
    memberOptions: _memberOptions,
    targetOptions: _targetOptions,
    allocId,
    values,
  },
) => {
  const isEdit = !!allocId;
  const action = isEdit
    ? `/capacity-plans/${planId}/allocations/${allocId}`
    : `/capacity-plans/${planId}/allocations`;

  return (
    <Sidenav
      id="capacity-plan-allocation-form"
      title={isEdit ? "Edit Allocation" : "Add Allocation"}
      open
    >
      <form class="form" hx-post={action} hx-swap="none">
        <div class="form__body">
          <div class="form__field">
            <label class="form__label" for="alloc-person-search">Person</label>
            <div class="form__autocomplete">
              <input
                type="text"
                id="alloc-person-search"
                class="form__input"
                placeholder="Search team members..."
                autocomplete="off"
                name="q"
                data-autocomplete-target="alloc-personId"
                hx-get="/autocomplete/people"
                hx-trigger="input changed delay:150ms, focus"
                hx-target="#alloc-person-results"
                hx-include="this"
                hx-swap="innerHTML"
                value={values?.personName ?? ""}
              />
              <input
                type="hidden"
                id="alloc-personId"
                name="personId"
                value={values?.personId ?? ""}
              />
              <ul class="form__autocomplete-list" id="alloc-person-results" />
            </div>
          </div>
          <div class="form__field">
            <label class="form__label" for="alloc-target-search">
              Target (milestone or project)
            </label>
            <div class="form__autocomplete">
              <input
                type="text"
                id="alloc-target-search"
                class="form__input"
                placeholder="Search milestones & projects..."
                autocomplete="off"
                name="q"
                data-autocomplete-target="alloc-targetId"
                data-autofill-ids={JSON.stringify({
                  targettype: "alloc-targetType",
                })}
                hx-get="/autocomplete/capacity-targets"
                hx-trigger="input changed delay:150ms, focus"
                hx-target="#alloc-target-results"
                hx-include="this"
                hx-swap="innerHTML"
                value={values?.targetName ?? ""}
              />
              <input
                type="hidden"
                id="alloc-targetId"
                name="targetId"
                value={values?.targetId ?? ""}
              />
              <input
                type="hidden"
                id="alloc-targetType"
                name="targetType"
                value={values?.targetType ?? "milestone"}
              />
              <ul class="form__autocomplete-list" id="alloc-target-results" />
            </div>
          </div>
          <div class="form__field">
            <label class="form__label" for="alloc-percentage">
              Percentage (%)
            </label>
            <input
              id="alloc-percentage"
              name="percentage"
              type="number"
              min="0"
              max="200"
              step="5"
              class="form__input"
              placeholder="e.g. 80"
              value={values?.percentage ?? ""}
            />
          </div>
          <div class="form__field">
            <label class="form__label" for="alloc-hoursPerWeek">
              — or — Hours / week
            </label>
            <input
              id="alloc-hoursPerWeek"
              name="hoursPerWeek"
              type="number"
              min="0"
              step="1"
              class="form__input"
              placeholder="e.g. 20"
              value={values?.hoursPerWeek ?? ""}
            />
          </div>
          <div class="form__field">
            <label class="form__label" for="alloc-notes">Notes</label>
            <input
              id="alloc-notes"
              name="notes"
              type="text"
              class="form__input"
              placeholder="Optional"
              value={values?.notes ?? ""}
            />
          </div>
        </div>
        <div class="form__footer">
          <button type="submit" class="btn btn--primary">
            {isEdit ? "Save" : "Add Allocation"}
          </button>
          <button type="button" class="btn" data-sidenav-close>Cancel</button>
        </div>
      </form>
    </Sidenav>
  );
};

// ---------------------------------------------------------------------------
// Members table
// ---------------------------------------------------------------------------

const MembersTable: FC<{
  planId: string;
  members: TeamMemberRef[];
  personById: Record<string, string>;
}> = ({ planId, members, personById }) => (
  <section class="detail-section capacity-plan-detail__section">
    <div class="capacity-plan-detail__section-header">
      <h2 class="section-heading">Team Members</h2>
      <button
        class="btn btn--primary btn--sm"
        type="button"
        hx-get={`/capacity-plans/${planId}/members/new`}
        hx-target="#capacity-plans-form-container"
        hx-swap="innerHTML"
      >
        Add Member
      </button>
    </div>
    {members.length === 0
      ? <p class="capacity-plan-detail__empty">No members yet.</p>
      : (
        <table class="data-table capacity-plan-detail__table">
          <thead>
            <tr class="data-table__head-row">
              <th class="data-table__th">Person</th>
              <th class="data-table__th">Hours/Day</th>
              <th class="data-table__th">Working Days</th>
              <th class="data-table__th"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} class="data-table__row">
                <td class="data-table__td">
                  <a href={`/people/${m.personId}`}>
                    {personById[m.personId] ?? m.personId}
                  </a>
                </td>
                <td class="data-table__td">{m.hoursPerDay ?? 8}</td>
                <td class="data-table__td">
                  {m.workingDays?.join(", ") ?? "Mon–Fri"}
                </td>
                <td class="data-table__td data-table__td--actions">
                  <button
                    class="btn btn--danger btn--xs"
                    type="button"
                    hx-delete={`/api/v1/capacity-plans/${planId}/members/${m.id}`}
                    hx-confirm={`Remove ${
                      personById[m.personId] ?? m.personId
                    }? Their allocations will also be removed.`}
                    hx-swap="none"
                    hx-on--after-request="if(event.detail.successful) window.location.reload()"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
  </section>
);

// ---------------------------------------------------------------------------
// Bandwidth summary
// ---------------------------------------------------------------------------

const BandwidthSummary: FC<{ rows: BandwidthRow[] }> = ({ rows }) => {
  if (rows.length === 0) return null;

  return (
    <section class="detail-section capacity-plan-detail__section">
      <h2 class="section-heading">Bandwidth</h2>
      <p class="capacity-plan-detail__bandwidth-legend">
        <span class="capacity-plan-detail__bw--under">Red</span>{" "}
        = under 60% (underassigned),{" "}
        <span class="capacity-plan-detail__bw--warn">yellow</span> = 60–80%,
        {" "}
        <span class="capacity-plan-detail__bw--ok">green</span> = 80–100%,{" "}
        <span class="capacity-plan-detail__bw--over">red</span> = overallocated.
      </p>
      <div class="capacity-plan-detail__bandwidth-list">
        {rows.map((row) => {
          const pct = Math.min(row.totalPct, 200);
          const state = row.totalPct > 100
            ? "over"
            : row.totalPct >= 80
            ? "ok"
            : row.totalPct >= 60
            ? "warn"
            : "under";
          return (
            <div key={row.personId} class="capacity-plan-detail__bw-row">
              <a
                href={`/people/${row.personId}`}
                class="capacity-plan-detail__bw-name"
              >
                {row.personName}
              </a>
              <div class="capacity-plan-detail__bw-bar-wrap">
                <div
                  class={`capacity-plan-detail__bw-bar capacity-plan-detail__bw-bar--${state}`}
                  data-bw-main={String(Math.min(pct, 100))}
                />
                {row.totalPct > 100 && (
                  <div
                    class="capacity-plan-detail__bw-bar-over"
                    data-bw-over={String(Math.min(pct - 100, 100))}
                  />
                )}
              </div>
              <span
                class={`capacity-plan-detail__bw-pct capacity-plan-detail__bw--${state}`}
              >
                {Math.round(row.totalPct)}%
              </span>
              <span class="capacity-plan-detail__bw-detail">
                {Math.round(row.allocatedHours)}h /{" "}
                {Math.round(row.availHours)}h per week
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

// ---------------------------------------------------------------------------
// Allocation config table
// ---------------------------------------------------------------------------

const AllocationsConfig: FC<{
  planId: string;
  allocs: AllocationSummary[];
}> = ({ planId, allocs }) => (
  <section class="detail-section capacity-plan-detail__section">
    <div class="capacity-plan-detail__section-header">
      <h2 class="section-heading">Allocations</h2>
      <button
        class="btn btn--primary btn--sm"
        type="button"
        hx-get={`/capacity-plans/${planId}/allocations/new`}
        hx-target="#capacity-plans-form-container"
        hx-swap="innerHTML"
      >
        Add Allocation
      </button>
    </div>
    {allocs.length === 0
      ? (
        <p class="capacity-plan-detail__empty">
          No allocations yet. Add one to start planning capacity.
        </p>
      )
      : (
        <table class="data-table capacity-plan-detail__table">
          <thead>
            <tr class="data-table__head-row">
              <th class="data-table__th">Person</th>
              <th class="data-table__th">Target</th>
              <th class="data-table__th">Type</th>
              <th class="data-table__th">Allocation</th>
              <th class="data-table__th">Notes</th>
              <th class="data-table__th"></th>
            </tr>
          </thead>
          <tbody>
            {allocs.map((a) => (
              <tr key={a.id} class="data-table__row">
                <td class="data-table__td">
                  <a href={`/people/${a.personId}`}>{a.personName}</a>
                </td>
                <td class="data-table__td">
                  {a.targetHref
                    ? <a href={a.targetHref}>{a.targetTitle}</a>
                    : a.targetTitle}
                  {a.projectName && (
                    <span class="capacity-plan-detail__alloc-project">
                      {a.projectName}
                    </span>
                  )}
                </td>
                <td class="data-table__td">
                  <span class="badge">{a.targetType}</span>
                </td>
                <td class="data-table__td capacity-plan-detail__alloc-qty">
                  {a.percentage != null
                    ? `${a.percentage}%`
                    : `${a.hoursPerWeek ?? 0}h/week`}
                </td>
                <td class="data-table__td">{a.notes ?? "—"}</td>
                <td class="data-table__td data-table__td--actions">
                  <button
                    class="btn btn--secondary btn--xs"
                    type="button"
                    hx-get={`/capacity-plans/${a.planId}/allocations/${a.id}/edit`}
                    hx-target="#capacity-plans-form-container"
                    hx-swap="innerHTML"
                  >
                    Edit
                  </button>
                  <button
                    class="btn btn--danger btn--xs"
                    type="button"
                    hx-delete={`/api/v1/capacity-plans/${a.planId}/allocations/${a.id}`}
                    hx-confirm="Remove this allocation?"
                    hx-swap="none"
                    hx-on--after-request="if(event.detail.successful) window.location.reload()"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
  </section>
);

// ---------------------------------------------------------------------------
// Computed capacity grid
// ---------------------------------------------------------------------------

const CapacityGrid: FC<{ weeks: WeekCol[]; rows: GridRow[] }> = (
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
            <tr class="data-table__head-row">
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
                  const hasData = cell.plannedHours > 0 || cell.taskHours > 0;
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
                      {hasData
                        ? (
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
                                : (
                                  <span class="capacity-plan-detail__cell-empty">
                                    —
                                  </span>
                                )}
                            </span>
                            {cell.tasks.length > 0 && (
                              <ul class="capacity-plan-detail__cell-popup">
                                {cell.tasks.map((t) => (
                                  <li key={t.id}>
                                    <a href={`/tasks/${t.id}`}>{t.title}</a>
                                    {" "}
                                    <span class="capacity-plan-detail__cell-task-h">
                                      {Math.round(t.hours)}h
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )
                        : (
                          <span class="capacity-plan-detail__cell-empty">
                            —
                          </span>
                        )}
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

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const CapacityPlanDetailView: FC<
  ViewProps & {
    item: CapacityPlan;
    personById: Record<string, string>;
    allocationSummaries: AllocationSummary[];
    bandwidthRows: BandwidthRow[];
    weeks: WeekCol[];
    gridRows: GridRow[];
  }
> = (
  {
    item: plan,
    personById,
    allocationSummaries,
    bandwidthRows,
    weeks,
    gridRows,
    ...props
  },
) => (
  <MainLayout
    title={plan.title}
    {...props}
    styles={["/css/views/capacity-plans.css"]}
    scripts={["/js/capacity-plan-bandwidth.js", "/js/fullscreen-reading.js"]}
  >
    <SseRefresh
      getUrl={`/capacity-plans/${plan.id}`}
      trigger="sse:capacity-plan.updated"
      targetId="capacity-plan-detail-root"
    />
    <main
      id="capacity-plan-detail-root"
      class="detail-view capacity-plan-detail"
    >
      <BackButton href="/capacity-plans" label="Back to Capacity Plans" />

      <header class="detail-section capacity-plan-detail__header">
        <div class="detail-title-row">
          <h1 class="detail-title">{plan.title}</h1>
        </div>
        <DetailActions
          entity="capacity-plans"
          id={plan.id}
          title={plan.title}
          formContainerId="capacity-plans-form-container"
          onDeleteRedirect="/capacity-plans"
        >
          <button
            type="button"
            class="btn btn--secondary btn--sm"
            data-fullscreen-toggle
          >
            Focus
          </button>
        </DetailActions>
      </header>

      <div class="detail-section detail-info-row">
        {plan.startDate && <InfoItem label="Start">{plan.startDate}</InfoItem>}
        {plan.endDate && <InfoItem label="End">{plan.endDate}</InfoItem>}
        {plan.budgetHours != null && (
          <InfoItem label="Budget">{plan.budgetHours}h</InfoItem>
        )}
        <InfoItem label="Members">{(plan.teamMembers ?? []).length}</InfoItem>
        <InfoItem label="Allocations">
          {(plan.allocations ?? []).length}
        </InfoItem>
      </div>

      {(!plan.startDate || !plan.endDate) && (
        <div class="detail-section capacity-plan-detail__no-range">
          <p>
            Set a <strong>Start</strong> and <strong>End</strong>{" "}
            date on this plan to see the capacity grid. Use <em>Edit</em> above.
          </p>
        </div>
      )}

      <MembersTable
        planId={plan.id}
        members={plan.teamMembers ?? []}
        personById={personById}
      />

      <BandwidthSummary rows={bandwidthRows} />

      <AllocationsConfig
        planId={plan.id}
        allocs={allocationSummaries}
      />

      {weeks.length > 0 && <CapacityGrid weeks={weeks} rows={gridRows} />}

      <AuditMeta
        createdAt={plan.createdAt}
        updatedAt={plan.updatedAt}
        createdBy={plan.createdBy}
        updatedBy={plan.updatedBy}
      />
    </main>

    <div id="capacity-plans-form-container" />
  </MainLayout>
);
