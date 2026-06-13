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
import { InlineEditable } from "./components/inline-editable.tsx";

const InlineEditSection: FC<{
  goal: Goal;
  field: "description" | "notes";
  title: string;
}> = ({ goal, field, title }) => {
  const value = (goal[field] ?? "") as string;
  return (
    <section class="detail-section">
      <h2 class="section-heading">{title}</h2>
      <InlineEditable
        fieldId={`goal-${field}`}
        name={field}
        value={value}
        hxPut={`/goals/${goal.id}/${field}?editing=true`}
        rootId="goal-detail-root"
      />
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

/** Human-readable "Measurable" criterion value for a goal. */
function smartMeasurable(goal: Goal): string {
  const kpi = (goal.kpi ?? "").trim();
  const kpiMetric = (goal.kpiMetric ?? "").trim();
  if (kpi) return `KPI: ${kpi}`;
  if (kpiMetric) return `Metric: ${kpiMetric}`;
  if (goal.kpiTarget != null) return `Target: ${goal.kpiTarget}`;
  if (goal.progress != null) return `Progress: ${goal.progress}%`;
  return "No measurable target";
}

/** Human-readable "Time-bound" criterion value for a goal. */
function smartTimeBound(goal: Goal): string {
  if (goal.startDate && goal.endDate) {
    return `${formatDate(goal.startDate)} → ${formatDate(goal.endDate)}`;
  }
  if (goal.startDate) return `From ${formatDate(goal.startDate)}`;
  if (goal.endDate) return `Until ${formatDate(goal.endDate)}`;
  return "No timeline";
}

function evaluateSmart(goal: Goal): SmartCriterion[] {
  const title = (goal.title ?? "").trim();
  const description = (goal.description ?? "").trim();
  const project = (goal.project ?? "").trim();

  const measurableValue = smartMeasurable(goal);
  const isMeasurable = (goal.kpi ?? "").trim().length > 0 ||
    (goal.kpiMetric ?? "").trim().length > 0 ||
    goal.kpiTarget != null || goal.progress != null;
  const timeBound = smartTimeBound(goal);

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
// Person link — owner / contributor resolution (id → name → raw)
// ---------------------------------------------------------------------------

const PersonLink: FC<{
  ref: string;
  personById: Record<string, string>;
  personByName: Record<string, string>;
  class?: string;
}> = ({ ref, personById, personByName, class: cls }) => {
  if (personById[ref]) {
    return <a href={`/people/${ref}`} class={cls}>{personById[ref]}</a>;
  }
  if (personByName[ref]) {
    return <a href={`/people/${personByName[ref]}`} class={cls}>{ref}</a>;
  }
  return cls ? <span class={cls}>{ref}</span> : <>{ref}</>;
};

// ---------------------------------------------------------------------------
// Detail header — title row, status/type badges, deadline, actions
// ---------------------------------------------------------------------------

const GoalDetailHeader: FC<{ goal: Goal; editing: boolean }> = (
  { goal, editing },
) => {
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

  return (
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
            class={`goal-deadline${isOverdue ? " goal-deadline--overdue" : ""}`}
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
  );
};

// ---------------------------------------------------------------------------
// Info rows — each owns its visibility check, renders null when empty
// ---------------------------------------------------------------------------

const GoalOverviewRow: FC<{
  goal: Goal;
  parentGoal?: Goal | null;
  personById: Record<string, string>;
  personByName: Record<string, string>;
  portfolioIdByName?: string;
  projectSlug: string;
}> = (
  {
    goal,
    parentGoal,
    personById,
    personByName,
    portfolioIdByName,
    projectSlug,
  },
) => {
  const hasOverview = goal.owner || goal.priority || goal.project || parentGoal;
  if (!hasOverview) return null;
  return (
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
          <PersonLink
            ref={goal.owner}
            personById={personById}
            personByName={personByName}
          />
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
  );
};

const GoalMeasurementRow: FC<{ goal: Goal }> = ({ goal }) => {
  const hasKpi = goal.kpi || goal.kpiMetric ||
    goal.kpiValue !== undefined || goal.kpiTarget !== undefined ||
    goal.progress !== undefined;
  if (!hasKpi) return null;
  return (
    <div class="detail-section detail-info-row">
      {goal.kpi && <InfoItem label="KPI">{goal.kpi}</InfoItem>}
      {goal.kpiMetric && <InfoItem label="Metric">{goal.kpiMetric}</InfoItem>}
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
  );
};

const GoalTimelineRow: FC<{ goal: Goal }> = ({ goal }) => {
  if (!goal.startDate && !goal.endDate) return null;
  return (
    <div class="detail-section detail-info-row">
      {goal.startDate && (
        <InfoItem label="Start">{formatDate(goal.startDate)}</InfoItem>
      )}
      {goal.endDate && (
        <InfoItem label="End">{formatDate(goal.endDate)}</InfoItem>
      )}
    </div>
  );
};

const GoalRelationshipsRow: FC<{
  goal: Goal;
  linkedMilestones: MilestoneBase[];
  personById: Record<string, string>;
  personByName: Record<string, string>;
}> = ({ goal, linkedMilestones, personById, personByName }) => {
  const hasRelationships = (goal.contributors?.length ?? 0) > 0 ||
    linkedMilestones.length > 0 || (goal.tags?.length ?? 0) > 0;
  if (!hasRelationships) return null;
  return (
    <div class="detail-section detail-info-row">
      {(goal.contributors?.length ?? 0) > 0 && (
        <InfoItem label="Contributors">
          <span class="goal-detail__links">
            {(goal.contributors ?? []).map((c) => (
              <PersonLink
                ref={c}
                personById={personById}
                personByName={personByName}
                class="badge"
              />
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
          <th scope="col" class="data-table__th">Title</th>
          <th scope="col" class="data-table__th">Status</th>
          <th scope="col" class="data-table__th">Progress</th>
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
    personById?: Record<string, string>;
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
    personById = {},
    editing = false,
    ...viewProps
  },
) => {
  const portfolioByName = portfolioItems.find((p) => p.name === goal.project);
  const portfolioIdByName = portfolioByName?.id;
  const projectSlug = goal.project ? toKebab(goal.project) : "";

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
        <GoalDetailHeader goal={goal} editing={editing} />

        <ArchivedBanner entity={goal} />

        {/* ── Overview row ───────────────────────────────────────── */}
        <GoalOverviewRow
          goal={goal}
          parentGoal={parentGoal}
          personById={personById}
          personByName={personByName}
          portfolioIdByName={portfolioIdByName}
          projectSlug={projectSlug}
        />

        {/* ── Measurement row ────────────────────────────────────── */}
        <GoalMeasurementRow goal={goal} />

        {/* ── Timeline row ───────────────────────────────────────── */}
        <GoalTimelineRow goal={goal} />

        {/* ── Relationships row ──────────────────────────────────── */}
        <GoalRelationshipsRow
          goal={goal}
          linkedMilestones={linkedMilestones}
          personById={personById}
          personByName={personByName}
        />

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
