import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { Goal } from "../types/goal.types.ts";
import type { MilestoneBase } from "../types/milestone.types.ts";
import type { PortfolioItem } from "../types/portfolio.types.ts";
import type { ViewProps } from "../types/app.ts";
import { PRIORITY_LABELS } from "../constants/mod.ts";
import { dueIn, formatDate, parseDate } from "../utils/time.ts";
import { KpiGauge } from "../components/ui/kpi-gauge.tsx";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { toKebab } from "../utils/slug.ts";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import {
  GOAL_STATUS_VARIANTS,
  GOAL_TYPE_VARIANTS,
} from "../domains/goal/constants.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";

const InlineEditSection: FC<{
  goal: Goal;
  field: "description" | "notes";
  title: string;
}> = ({ goal, field, title }) => {
  const value = (goal[field] ?? "") as string;
  const inputId = `goal-${field}-value`;
  const btnId = `goal-${field}-save`;
  return (
    <section class="detail-section">
      <h2 class="section-heading">{title}</h2>
      <div
        class="inline-editable"
        contenteditable
        data-inline-edit
        data-inline-original={value}
        data-inline-target={inputId}
        data-inline-save-btn={btnId}
      >
        {value}
      </div>
      <input type="hidden" id={inputId} name={field} value={value} />
      <div class="inline-editable__actions">
        <button
          type="button"
          id={btnId}
          class="btn btn--primary btn--sm is-hidden"
          hx-put={`/goals/${goal.id}/${field}?editing=true`}
          hx-include={`#${inputId}`}
          hx-target="#goal-detail-root"
          hx-select="#goal-detail-root"
          hx-swap="outerHTML"
        >
          Save
        </button>
      </div>
    </section>
  );
};

// ---------------------------------------------------------------------------
// SMART criteria — server-rendered assessment
// ---------------------------------------------------------------------------

type SmartStatus = "met" | "unmet" | "neutral";

type SmartCriterion = {
  key: "S" | "M" | "A" | "R" | "T";
  name: string;
  status: SmartStatus;
  value: string;
};

function evaluateSmart(goal: Goal): SmartCriterion[] {
  const title = (goal.title ?? "").trim();
  const description = (goal.description ?? "").trim();
  const kpi = (goal.kpi ?? "").trim();
  const kpiMetric = (goal.kpiMetric ?? "").trim();
  const project = (goal.project ?? "").trim();

  const measurableValue = kpi
    ? `KPI: ${kpi}`
    : kpiMetric
    ? `Metric: ${kpiMetric}`
    : goal.kpiTarget != null
    ? `Target: ${goal.kpiTarget}`
    : goal.progress != null
    ? `Progress: ${goal.progress}%`
    : "No measurable target";

  const isMeasurable = kpi.length > 0 || kpiMetric.length > 0 ||
    goal.kpiTarget != null || goal.progress != null;

  const timeBound = goal.startDate && goal.endDate
    ? `${formatDate(goal.startDate)} → ${formatDate(goal.endDate)}`
    : goal.startDate
    ? `From ${formatDate(goal.startDate)}`
    : goal.endDate
    ? `Until ${formatDate(goal.endDate)}`
    : "No timeline";

  return [
    {
      key: "S",
      name: "Specific",
      status: title.length > 10 ? "met" : "unmet",
      value: title.length > 0 ? title : "Add a clearer title",
    },
    {
      key: "M",
      name: "Measurable",
      status: isMeasurable ? "met" : "unmet",
      value: measurableValue,
    },
    {
      key: "A",
      name: "Achievable",
      status: "neutral",
      value: description.length > 30
        ? "Rationale provided in description"
        : "Add rationale to description",
    },
    {
      key: "R",
      name: "Relevant",
      status: project.length > 0 ? "met" : "unmet",
      value: project.length > 0 ? project : "No linked project",
    },
    {
      key: "T",
      name: "Time-bound",
      status: goal.startDate && goal.endDate ? "met" : "unmet",
      value: timeBound,
    },
  ];
}

const SMART_INDICATOR: Record<SmartStatus, string> = {
  met: "✓",
  unmet: "✗",
  neutral: "—",
};

const SmartCriteriaSection: FC<{ goal: Goal }> = ({ goal }) => {
  const criteria = evaluateSmart(goal);
  return (
    <section class="detail-section goal-detail__smart">
      <h2 class="section-heading">SMART Criteria</h2>
      <div class="goal-smart-grid">
        {criteria.map((c) => (
          <article
            key={c.key}
            class={`goal-smart-card goal-smart-card--${c.status}`}
          >
            <div class="goal-smart-card__head">
              <span class="goal-smart-card__letter">{c.key}</span>
              <span class="goal-smart-card__indicator" aria-hidden="true">
                {SMART_INDICATOR[c.status]}
              </span>
            </div>
            <div class="goal-smart-card__name">{c.name}</div>
            <div class="goal-smart-card__value">{c.value}</div>
          </article>
        ))}
      </div>
    </section>
  );
};

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const SubGoalsTable: FC<{ childGoals: Goal[] }> = ({ childGoals }) => (
  <section class="detail-section goal-detail__section">
    <h2 class="section-heading">
      Sub-Goals ({childGoals.length})
    </h2>
    <table class="data-table">
      <thead>
        <tr>
          <th class="data-table__th">Title</th>
          <th class="data-table__th">Status</th>
          <th class="data-table__th">Progress</th>
        </tr>
      </thead>
      <tbody>
        {childGoals.map((child) => (
          <tr class="data-table__row">
            <td class="data-table__td">
              <a href={`/goals/${child.id}`}>{child.title}</a>
            </td>
            <td class="data-table__td">
              <span class={badgeClass(GOAL_STATUS_VARIANTS, child.status)}>
                {child.status}
              </span>
            </td>
            <td class="data-table__td">
              {child.progress != null
                ? (
                  <div class="goal-progress-cell">
                    <progress
                      class="progress-bar"
                      value={child.progress}
                      max={100}
                    />
                    <span>{child.progress}%</span>
                  </div>
                )
                : ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

export const GoalDetailView: FC<
  ViewProps & {
    item: Goal;
    portfolioItems?: PortfolioItem[];
    parentGoal?: Goal | null;
    linkedMilestones?: MilestoneBase[];
    childGoals?: Goal[];
    personByName?: Record<string, string>;
    editing?: boolean;
  }
> = (
  {
    item: goal,
    portfolioItems = [],
    parentGoal,
    linkedMilestones = [],
    childGoals = [],
    personByName = {},
    editing = false,
    ...viewProps
  },
) => {
  const portfolioByName = portfolioItems.find((p) => p.name === goal.project);
  const portfolioIdByName = portfolioByName?.id;
  const isCompleted = goal.status === "success" || goal.status === "failed";
  const deadline = isCompleted ? "" : dueIn(goal.endDate);
  const isOverdue = deadline.includes("overdue");
  const tookDays = isCompleted && goal.startDate
    ? Math.max(
      0,
      Math.round(
        (parseDate(goal.updatedAt).getTime() -
          parseDate(goal.startDate).getTime()) / 86400000,
      ),
    )
    : null;

  const projectSlug = goal.project ? toKebab(goal.project) : "";

  const hasOverview = goal.owner || goal.priority || goal.project || parentGoal;
  const hasKpi = goal.kpi || goal.kpiMetric ||
    goal.kpiValue !== undefined || goal.kpiTarget !== undefined ||
    goal.progress !== undefined;
  const hasTimeline = goal.startDate || goal.endDate;
  const hasRelationships = (goal.contributors?.length ?? 0) > 0 ||
    linkedMilestones.length > 0 || (goal.tags?.length ?? 0) > 0;

  return (
    <MainLayout
      title={goal.title}
      {...viewProps}
      styles={["/css/views/goals.css"]}
      scripts={["/js/kpi-gauge.js", "/js/inline-edit.js"]}
    >
      <SseRefresh
        getUrl={"/goals/" + goal.id + (editing ? "?editing=true" : "")}
        trigger="sse:goal.updated"
        targetId="goal-detail-root"
      />
      <main
        id="goal-detail-root"
        class={`detail-view goal-detail${
          editing ? " goal-detail--editing" : ""
        }`}
      >
        <Breadcrumb
          items={[
            { label: "Goals", href: "/goals" },
            { label: goal.title },
          ]}
        />
        <BackButton href="/goals" label="Back to Goals" />

        {/* ── Header ─────────────────────────────────────────────── */}
        <header class="detail-section detail-header goal-detail__header">
          <div class="detail-title-row goal-detail__title-row">
            <h1 class="detail-title goal-detail__title">{goal.title}</h1>
            <span class={badgeClass(GOAL_STATUS_VARIANTS, goal.status)}>
              {goal.status}
            </span>
            <span class={badgeClass(GOAL_TYPE_VARIANTS, goal.type)}>
              {goal.type}
            </span>
            {deadline && (
              <span
                class={`goal-deadline${
                  isOverdue ? " goal-deadline--overdue" : ""
                }`}
              >
                {deadline}
              </span>
            )}
            {tookDays !== null && (
              <span class="goal-deadline">
                took {tookDays} day{tookDays !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <DetailActions
            entity="goals"
            id={goal.id}
            title={goal.title}
            formContainerId="goals-form-container"
            archived={goal.archived === true}
          >
            <EditModeToggle href={`/goals/${goal.id}`} editing={editing} />
          </DetailActions>
        </header>

        <ArchivedBanner entity={goal} />

        {/* ── Overview row ───────────────────────────────────────── */}
        {hasOverview && (
          <div class="detail-section detail-info-row">
            {goal.priority && (
              <InfoItem label="Priority">
                <span class={`badge priority--${goal.priority}`}>
                  {PRIORITY_LABELS[String(goal.priority)] ??
                    `P${goal.priority}`}
                </span>
              </InfoItem>
            )}
            {goal.owner && (
              <InfoItem label="Owner">
                {personByName[goal.owner]
                  ? (
                    <a href={`/people/${personByName[goal.owner]}`}>
                      {goal.owner}
                    </a>
                  )
                  : goal.owner}
              </InfoItem>
            )}
            {goal.project && (
              <InfoItem label="Project">
                <a href={`/portfolio/${portfolioIdByName ?? projectSlug}`}>
                  {goal.project}
                </a>
              </InfoItem>
            )}
            {parentGoal && (
              <InfoItem label="Parent Goal">
                <a href={`/goals/${parentGoal.id}`}>{parentGoal.title}</a>
              </InfoItem>
            )}
          </div>
        )}

        {/* ── Measurement row ────────────────────────────────────── */}
        {hasKpi && (
          <div class="detail-section detail-info-row">
            {goal.kpi && <InfoItem label="KPI">{goal.kpi}</InfoItem>}
            {goal.kpiMetric && (
              <InfoItem label="Metric">{goal.kpiMetric}</InfoItem>
            )}
            {goal.kpiValue != null && goal.kpiTarget != null
              ? (
                <InfoItem label="KPI Progress">
                  <KpiGauge value={goal.kpiValue} target={goal.kpiTarget} />
                </InfoItem>
              )
              : (
                <>
                  {goal.kpiTarget != null && (
                    <InfoItem label="Target">{goal.kpiTarget}</InfoItem>
                  )}
                  {goal.kpiValue != null && (
                    <InfoItem label="Value">{goal.kpiValue}</InfoItem>
                  )}
                </>
              )}
            {goal.progress != null && (
              <InfoItem label="Progress">
                <div class="goal-progress-cell">
                  <progress
                    class="progress-bar"
                    value={goal.progress}
                    max={100}
                  />
                  <span>{goal.progress}%</span>
                </div>
              </InfoItem>
            )}
          </div>
        )}

        {/* ── Timeline row ───────────────────────────────────────── */}
        {hasTimeline && (
          <div class="detail-section detail-info-row">
            {goal.startDate && (
              <InfoItem label="Start">{formatDate(goal.startDate)}</InfoItem>
            )}
            {goal.endDate && (
              <InfoItem label="End">{formatDate(goal.endDate)}</InfoItem>
            )}
          </div>
        )}

        {/* ── Relationships row ──────────────────────────────────── */}
        {hasRelationships && (
          <div class="detail-section detail-info-row">
            {(goal.contributors?.length ?? 0) > 0 && (
              <InfoItem label="Contributors">
                <span class="goal-detail__links">
                  {(goal.contributors ?? []).map((c) => (
                    personByName[c]
                      ? (
                        <a href={`/people/${personByName[c]}`} class="badge">
                          {c}
                        </a>
                      )
                      : <span class="badge">{c}</span>
                  ))}
                </span>
              </InfoItem>
            )}
            {linkedMilestones.length > 0 && (
              <InfoItem label="Milestones">
                <span class="goal-detail__links">
                  {linkedMilestones.map((m) => (
                    <a href={`/milestones/${m.id}`} class="badge">
                      {m.name}
                    </a>
                  ))}
                </span>
              </InfoItem>
            )}
            {(goal.tags?.length ?? 0) > 0 && (
              <InfoItem label="Tags">
                <span class="goal-detail__links">
                  {(goal.tags ?? []).map((t) => (
                    <span key={t} class="badge">{t}</span>
                  ))}
                </span>
              </InfoItem>
            )}
          </div>
        )}

        {/* ── Description ────────────────────────────────────────── */}
        {editing
          ? (
            <InlineEditSection
              goal={goal}
              field="description"
              title="Description"
            />
          )
          : <MarkdownSection title="Description" markdown={goal.description} />}

        {/* ── Notes ──────────────────────────────────────────────── */}
        {editing
          ? <InlineEditSection goal={goal} field="notes" title="Notes" />
          : <MarkdownSection title="Notes" markdown={goal.notes} />}

        {/* ── Sub-Goals ──────────────────────────────────────────── */}
        {childGoals.length > 0 && <SubGoalsTable childGoals={childGoals} />}
        {/* ── SMART criteria ─────────────────────────────────────── */}
        <SmartCriteriaSection goal={goal} />

        <AuditMeta
          createdAt={goal.createdAt}
          updatedAt={goal.updatedAt}
          createdBy={goal.createdBy}
          updatedBy={goal.updatedBy}
        />
      </main>

      <div id="goals-form-container" />
    </MainLayout>
  );
};
