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
  WeeklyAllocation,
} from "../types/capacity-plan.types.ts";
import type { ViewProps } from "../types/app.ts";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const MembersTable: FC<{ planId: string; members: TeamMemberRef[] }> = (
  { planId, members },
) => (
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
              <th class="data-table__th">Person ID</th>
              <th class="data-table__th">Hours/Day</th>
              <th class="data-table__th">Working Days</th>
              <th class="data-table__th"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} class="data-table__row">
                <td class="data-table__td">{m.personId}</td>
                <td class="data-table__td">{m.hoursPerDay ?? "—"}</td>
                <td class="data-table__td">
                  {m.workingDays?.join(", ") ?? "—"}
                </td>
                <td class="data-table__td data-table__td--actions">
                  <button
                    class="btn btn--danger btn--xs"
                    type="button"
                    hx-delete={`/api/v1/capacity-plans/${planId}/members/${m.id}`}
                    hx-confirm={`Remove member ${m.personId}? Their allocations will also be removed.`}
                    hx-swap="none"
                    hx-on--after-request={`if(event.detail.successful) window.location.reload()`}
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

const AllocationsTable: FC<{
  planId: string;
  allocations: WeeklyAllocation[];
}> = ({ planId, allocations }) => (
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
    {allocations.length === 0
      ? <p class="capacity-plan-detail__empty">No allocations yet.</p>
      : (
        <table class="data-table capacity-plan-detail__table">
          <thead>
            <tr class="data-table__head-row">
              <th class="data-table__th">Member</th>
              <th class="data-table__th">Week Start</th>
              <th class="data-table__th">Hours</th>
              <th class="data-table__th">Target</th>
              <th class="data-table__th">Target ID</th>
              <th class="data-table__th">Notes</th>
              <th class="data-table__th"></th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((a) => (
              <tr key={a.id} class="data-table__row">
                <td class="data-table__td">{a.memberId}</td>
                <td class="data-table__td">{a.weekStart}</td>
                <td class="data-table__td">{a.allocatedHours}h</td>
                <td class="data-table__td">{a.targetType}</td>
                <td class="data-table__td">{a.targetId ?? "—"}</td>
                <td class="data-table__td">{a.notes ?? "—"}</td>
                <td class="data-table__td data-table__td--actions">
                  <button
                    class="btn btn--danger btn--xs"
                    type="button"
                    hx-delete={`/api/v1/capacity-plans/${planId}/allocations/${a.id}`}
                    hx-confirm="Remove this allocation?"
                    hx-swap="none"
                    hx-on--after-request={`if(event.detail.successful) window.location.reload()`}
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
// Main view
// ---------------------------------------------------------------------------

export const CapacityPlanDetailView: FC<
  ViewProps & { item: CapacityPlan }
> = ({ item: plan, ...props }) => (
  <MainLayout
    title={plan.title}
    {...props}
    styles={["/css/views/capacity-plans.css"]}
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
        />
      </header>

      <div class="detail-section detail-info-row">
        {plan.date && <InfoItem label="Date">{plan.date}</InfoItem>}
        {plan.budgetHours != null && (
          <InfoItem label="Budget">{plan.budgetHours}h</InfoItem>
        )}
        <InfoItem label="Members">
          {(plan.teamMembers ?? []).length}
        </InfoItem>
        <InfoItem label="Allocations">
          {(plan.allocations ?? []).length}
        </InfoItem>
      </div>

      <MembersTable planId={plan.id} members={plan.teamMembers ?? []} />
      <AllocationsTable planId={plan.id} allocations={plan.allocations ?? []} />

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
