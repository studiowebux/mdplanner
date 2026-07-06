import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { MarketingPlan } from "../types/marketing-plan.types.ts";
import type { Goal } from "../types/goal.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { toKebab } from "../utils/slug.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";
import { InlineEditable } from "./components/inline-editable.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import {
  MKTPLAN_ITEM_STATUS_VARIANTS,
  MKTPLAN_STATUS_VARIANTS,
  MKTPLAN_VERDICT_VARIANTS,
} from "../domains/marketing-plan/constants.tsx";
import { GOAL_STATUS_VARIANTS } from "../domains/goal/constants.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";

// ---------------------------------------------------------------------------
// Description — read (<p>) or in-place editable (contenteditable + Save).
// ---------------------------------------------------------------------------

const DescriptionSection: FC<{ plan: MarketingPlan }> = ({ plan }) => (
  <section class="detail-section">
    <h2 class="section-heading">Description</h2>
    <InlineEditable
      fieldId="mktplan-description"
      name="description"
      value={plan.description ?? ""}
      hxPut={`/marketing-plans/${plan.id}/description?editing=true`}
      rootId="mktplan-detail-root"
    />
  </section>
);

// ---------------------------------------------------------------------------
// Notes — read (markdown) or in-place editable (raw markdown + Save).
// ---------------------------------------------------------------------------

const NotesSection: FC<{ plan: MarketingPlan }> = ({ plan }) => (
  <section class="detail-section">
    <h2 class="section-heading">Notes</h2>
    <InlineEditable
      fieldId="mktplan-notes"
      name="notes"
      value={plan.notes ?? ""}
      hxPut={`/marketing-plans/${plan.id}/notes?editing=true`}
      rootId="mktplan-detail-root"
    />
  </section>
);

// ---------------------------------------------------------------------------
// Sections — each owns its visibility check, renders null when empty.
// ---------------------------------------------------------------------------

const OverviewRow: FC<{
  plan: MarketingPlan;
  personById: Record<string, string>;
}> = ({ plan, personById }) => {
  const budget = plan.budgetTotal != null
    ? `${plan.budgetCurrency ?? ""} ${plan.budgetTotal.toLocaleString()}`
      .trim()
    : "";
  const hasOverview = budget || plan.project || plan.responsible ||
    plan.description;
  const hasTimeline = plan.startDate || plan.endDate;
  if (!hasOverview && !hasTimeline) return null;
  return (
    <div class="detail-section detail-info-row">
      {budget && <InfoItem label="Budget">{budget}</InfoItem>}
      {plan.project && (
        <InfoItem label="Project">
          <a href={`/portfolio/${toKebab(plan.project)}`}>
            {plan.project}
          </a>
        </InfoItem>
      )}
      {plan.responsible && (
        <InfoItem label="Responsible">
          <a href={`/people/${plan.responsible}`}>
            {personById[plan.responsible] ?? plan.responsible}
          </a>
        </InfoItem>
      )}
      {plan.startDate && (
        <InfoItem label="Start">{formatDate(plan.startDate)}</InfoItem>
      )}
      {plan.endDate && (
        <InfoItem label="End">{formatDate(plan.endDate)}</InfoItem>
      )}
    </div>
  );
};

const TeamSection: FC<{ plan: MarketingPlan }> = ({ plan }) => {
  if ((plan.team?.length ?? 0) === 0) return null;
  return (
    <section class="detail-section">
      <h2 class="section-heading">
        Team ({(plan.team ?? []).length})
      </h2>
      <span class="mktplan-detail__team">
        {(plan.team ?? []).map((id) => (
          <a key={id} href={`/people/${id}`} class="badge">
            {id}
          </a>
        ))}
      </span>
    </section>
  );
};

const TargetAudiencesSection: FC<{ plan: MarketingPlan }> = ({ plan }) => {
  if ((plan.targetAudiences?.length ?? 0) === 0) return null;
  return (
    <section class="detail-section">
      <h2 class="section-heading">
        Target Audiences ({(plan.targetAudiences ?? []).length})
      </h2>
      <table class="data-table data-table--compact data-table--uppercase">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Description</th>
            <th scope="col">Size</th>
          </tr>
        </thead>
        <tbody>
          {(plan.targetAudiences ?? []).map((a, idx) => (
            <tr key={idx}>
              <td>{a.name}</td>
              <td>{a.description ?? ""}</td>
              <td>{a.size ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

const ChannelsSection: FC<{ plan: MarketingPlan }> = ({ plan }) => {
  if ((plan.channels?.length ?? 0) === 0) return null;
  return (
    <section class="detail-section">
      <h2 class="section-heading">
        Channels ({(plan.channels ?? []).length})
      </h2>
      <table class="data-table data-table--compact data-table--uppercase">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Budget</th>
            <th scope="col">Status</th>
            <th scope="col">Goals</th>
          </tr>
        </thead>
        <tbody>
          {(plan.channels ?? []).map((ch, idx) => (
            <tr key={idx}>
              <td>{ch.name}</td>
              <td>
                {ch.budget != null ? ch.budget.toLocaleString() : ""}
              </td>
              <td>
                {ch.status
                  ? (
                    <span
                      class={badgeClass(
                        MKTPLAN_ITEM_STATUS_VARIANTS,
                        ch.status,
                      )}
                    >
                      {ch.status}
                    </span>
                  )
                  : ""}
              </td>
              <td>{ch.goals ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

const CampaignsSection: FC<{ plan: MarketingPlan }> = ({ plan }) => {
  if ((plan.campaigns?.length ?? 0) === 0) return null;
  return (
    <section class="detail-section">
      <h2 class="section-heading">
        Campaigns ({(plan.campaigns ?? []).length})
      </h2>
      <table class="data-table data-table--compact data-table--uppercase">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Channel</th>
            <th scope="col">Budget</th>
            <th scope="col">Start</th>
            <th scope="col">End</th>
            <th scope="col">Status</th>
            <th scope="col">Goals</th>
          </tr>
        </thead>
        <tbody>
          {(plan.campaigns ?? []).map((c, idx) => (
            <tr key={idx}>
              <td>{c.name}</td>
              <td>{c.channel ?? ""}</td>
              <td>
                {c.budget != null ? c.budget.toLocaleString() : ""}
              </td>
              <td>{c.startDate ? formatDate(c.startDate) : ""}</td>
              <td>{c.endDate ? formatDate(c.endDate) : ""}</td>
              <td>
                {c.status
                  ? (
                    <span
                      class={badgeClass(
                        MKTPLAN_ITEM_STATUS_VARIANTS,
                        c.status,
                      )}
                    >
                      {c.status}
                    </span>
                  )
                  : ""}
              </td>
              <td>{c.goals ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

const LinkedGoalsSection: FC<{ goals: Goal[] }> = ({ goals }) => {
  if (goals.length === 0) return null;
  return (
    <section class="detail-section">
      <h2 class="section-heading">
        Linked Goals ({goals.length})
      </h2>
      <div class="mktplan-detail__kpis">
        {goals.map((goal) => {
          const pct = goal.kpiTarget && goal.kpiTarget > 0
            ? Math.min(
              Math.round(
                ((goal.kpiValue ?? 0) / goal.kpiTarget) * 100,
              ),
              100,
            )
            : goal.progress ?? 0;
          return (
            <div key={goal.id} class="mktplan-kpi">
              <div class="mktplan-kpi__header">
                <a href={`/goals/${goal.id}`} class="mktplan-kpi__metric">
                  {goal.title}
                </a>
                <span
                  class={badgeClass(GOAL_STATUS_VARIANTS, goal.status)}
                >
                  {goal.status}
                </span>
              </div>
              {goal.kpi && <span class="mktplan-kpi__label">{goal.kpi}</span>}
              {goal.kpiTarget != null && (
                <>
                  <div class="mktplan-kpi__values">
                    {(goal.kpiValue ?? 0).toLocaleString()} /{" "}
                    {goal.kpiTarget.toLocaleString()}
                  </div>
                  <div class="mktplan-kpi__bar">
                    <div class="mktplan-kpi__fill" data-pct={pct} />
                  </div>
                  <span class="mktplan-kpi__pct">{pct}%</span>
                </>
              )}
              {goal.kpiTarget == null && goal.progress != null && (
                <>
                  <div class="mktplan-kpi__bar">
                    <div
                      class="mktplan-kpi__fill"
                      data-pct={goal.progress}
                    />
                  </div>
                  <span class="mktplan-kpi__pct">{goal.progress}%</span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

const HypothesisSection: FC<{ plan: MarketingPlan }> = ({ plan }) => {
  if ((plan.hypothesis?.length ?? 0) === 0) return null;
  return (
    <section class="detail-section">
      <h2 class="section-heading">
        Hypothesis ({(plan.hypothesis ?? []).length})
      </h2>
      <ul class="mktplan-detail__hypothesis-list">
        {(plan.hypothesis ?? []).map((h, idx) => (
          <li key={idx} class="mktplan-detail__hypothesis-item">
            <span class="mktplan-detail__hypothesis-text">{h.text}</span>
            {h.verdict && (
              <span
                class={badgeClass(MKTPLAN_VERDICT_VARIANTS, h.verdict)}
              >
                {h.verdict}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};

const LearningsSection: FC<{ plan: MarketingPlan }> = ({ plan }) => {
  if ((plan.learnings?.length ?? 0) === 0) return null;
  return (
    <section class="detail-section">
      <h2 class="section-heading">
        Learnings ({(plan.learnings ?? []).length})
      </h2>
      <ul class="mktplan-detail__hypothesis-list">
        {(plan.learnings ?? []).map((l, idx) => <li key={idx}>{l.text}</li>)}
      </ul>
    </section>
  );
};

const ReadDescriptionSection: FC<{ plan: MarketingPlan }> = ({ plan }) => {
  if (!plan.description) return null;
  return (
    <section class="detail-section">
      <h2 class="section-heading">Description</h2>
      <p class="mktplan-detail__description">{plan.description}</p>
    </section>
  );
};

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const MarketingPlanDetailView: FC<
  ViewProps & {
    item: MarketingPlan;
    goals?: Goal[];
    personById?: Record<string, string>;
    editing?: boolean;
  }
> = (
  { item: plan, goals = [], personById = {}, editing = false, ...viewProps },
) => {
  return (
    <MainLayout
      title={plan.name}
      {...viewProps}
      styles={["/css/views/marketing-plans.css", "/css/views/goals.css"]}
      scripts={["/js/kpi-gauge.js", "/js/inline-edit.js"]}
    >
      <SseRefresh
        getUrl={"/marketing-plans/" + plan.id +
          (editing ? "?editing=true" : "")}
        trigger="sse:marketing-plan.updated"
        targetId="mktplan-detail-root"
      />
      <main
        id="mktplan-detail-root"
        class={`detail-view mktplan-detail${
          editing ? " mktplan-detail--editing" : ""
        }`}
      >
        <Breadcrumb
          items={[
            { label: "Marketing Plans", href: "/marketing-plans" },
            { label: plan.name },
          ]}
        />
        <BackButton href="/marketing-plans" label="Back to Marketing Plans" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section detail-header">
          <div class="detail-title-row">
            <h1 class="detail-title">{plan.name}</h1>
            <span class={badgeClass(MKTPLAN_STATUS_VARIANTS, plan.status)}>
              {plan.status}
            </span>
          </div>
          <DetailActions
            entity="marketing-plans"
            id={plan.id}
            title={plan.name}
            formContainerId="marketing-plans-form-container"
            archived={plan.archived === true}
          >
            <EditModeToggle
              href={`/marketing-plans/${plan.id}`}
              editing={editing}
            />
          </DetailActions>
        </header>

        <ArchivedBanner entity={plan} />

        {/* -- Overview -------------------------------------------------- */}
        <OverviewRow plan={plan} personById={personById} />

        {/* -- Team ------------------------------------------------------ */}
        <TeamSection plan={plan} />

        {/* -- Description ----------------------------------------------- */}
        {editing
          ? <DescriptionSection plan={plan} />
          : <ReadDescriptionSection plan={plan} />}

        {/* -- Target Audiences ------------------------------------------ */}
        <TargetAudiencesSection plan={plan} />

        {/* -- Channels -------------------------------------------------- */}
        <ChannelsSection plan={plan} />

        {/* -- Campaigns ------------------------------------------------- */}
        <CampaignsSection plan={plan} />

        {/* -- Linked Goals ---------------------------------------------- */}
        <LinkedGoalsSection goals={goals} />

        {/* -- Hypothesis ------------------------------------------------ */}
        <HypothesisSection plan={plan} />

        {/* -- Learnings ------------------------------------------------- */}
        <LearningsSection plan={plan} />

        {/* -- Notes ----------------------------------------------------- */}
        {editing
          ? <NotesSection plan={plan} />
          : <MarkdownSection title="Notes" markdown={plan.notes} />}

        <AuditMeta
          createdAt={plan.createdAt}
          updatedAt={plan.updatedAt}
          createdBy={plan.createdBy}
          updatedBy={plan.updatedBy}
        />
      </main>

      <div id="marketing-plans-form-container" />
    </MainLayout>
  );
};
