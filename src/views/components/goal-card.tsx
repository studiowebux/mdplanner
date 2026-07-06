import type { FC } from "hono/jsx";
import type { Goal } from "../../types/goal.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { KpiGauge } from "../../components/ui/kpi-gauge.tsx";
import { PRIORITY_LABELS } from "../../constants/mod.ts";
import {
  goalPersonById,
  goalPersonByName,
} from "../../domains/goal/config.tsx";
import { GOAL_STATUS_VARIANTS } from "../../domains/goal/constants.tsx";
import { badgeClass } from "../../components/ui/status-badge.tsx";
import { dueIn, parseDate } from "../../utils/time.ts";
import { toKebab } from "../../utils/slug.ts";

type Props = { item: Goal; q?: string };

/** Derived progress/deadline state for a goal card. */
interface GoalProgressInfo {
  isCompleted: boolean;
  deadline: string;
  isOverdue: boolean;
  tookDays: number | null;
  progress: number;
  progressLabel: string;
  hasBar: boolean;
}

/** Compute the card's progress bar + deadline state from the goal's dates. */
function computeGoalProgress(item: Goal): GoalProgressInfo {
  const isCompleted = item.status === "success" || item.status === "failed";
  const deadline = isCompleted ? "" : dueIn(item.endDate);
  const tookDays = isCompleted && item.startDate
    ? Math.max(
      0,
      Math.round(
        (parseDate(item.updatedAt).getTime() -
          parseDate(item.startDate).getTime()) / 86400000,
      ),
    )
    : null;
  const now = Date.now();
  const start = item.startDate ? parseDate(item.startDate).getTime() : 0;
  const end = item.endDate ? parseDate(item.endDate).getTime() : 0;
  const hasManualProgress = item.progress !== undefined &&
    item.progress !== null;
  const timeProgress = start && end && end > start
    ? Math.min(
      100,
      Math.max(0, Math.round(((now - start) / (end - start)) * 100)),
    )
    : 0;
  return {
    isCompleted,
    deadline,
    isOverdue: deadline.includes("overdue"),
    tookDays,
    progress: hasManualProgress ? item.progress! : timeProgress,
    progressLabel: hasManualProgress ? "progress" : "elapsed",
    hasBar: hasManualProgress || (start > 0 && end > 0),
  };
}

/** Status + priority badges for the card header. */
const GoalBadges: FC<{ item: Goal }> = ({ item }) => (
  <>
    <span class={badgeClass(GOAL_STATUS_VARIANTS, item.status)}>
      {item.status}
    </span>
    {item.priority && (
      <span class={`badge priority--${item.priority}`}>
        {PRIORITY_LABELS[String(item.priority)] ?? `P${item.priority}`}
      </span>
    )}
  </>
);

/** Compact meta — project, owner, KPI. */
const GoalMeta: FC<{ item: Goal }> = ({ item }) => (
  <CardMeta>
    {item.project && (
      <CardMetaItem label="Project">
        <a href={`/portfolio/${toKebab(item.project)}`}>
          {item.project}
        </a>
      </CardMetaItem>
    )}
    {item.owner && (
      <CardMetaItem label="Owner">
        <a
          href={goalPersonById[item.owner]
            ? `/people/${item.owner}`
            : goalPersonByName[item.owner]
            ? `/people/${goalPersonByName[item.owner]}`
            : `/people?q=${encodeURIComponent(item.owner)}`}
        >
          {goalPersonById[item.owner] ?? item.owner}
        </a>
      </CardMetaItem>
    )}
    {item.kpi && (
      <CardMetaItem label="KPI">
        {item.kpiValue != null && item.kpiTarget != null
          ? <KpiGauge value={item.kpiValue} target={item.kpiTarget} />
          : item.kpi}
      </CardMetaItem>
    )}
  </CardMeta>
);

/** Progress bar — manual or time-elapsed — with deadline / duration note. */
const GoalProgress: FC<{ info: GoalProgressInfo }> = ({ info }) => {
  if (!info.hasBar) return null;
  return (
    <div class="progress-group">
      <progress class="progress-bar" value={info.progress} max={100} />
      <span class="progress-label">
        {info.progress}% {info.progressLabel}
        {info.deadline && (
          <span
            class={`goal-deadline${
              info.isOverdue ? " goal-deadline--overdue" : ""
            }`}
          >
            {" — "}
            {info.deadline}
          </span>
        )}
        {info.tookDays !== null && (
          <span class="goal-deadline">
            &mdash; took {info.tookDays} day{info.tookDays !== 1 ? "s" : ""}
          </span>
        )}
      </span>
    </div>
  );
};

export const GoalCard: FC<Props> = ({ item, q }) => {
  const info = computeGoalProgress(item);
  return (
    <DomainCard
      href={`/goals/${item.id}`}
      name={item.title}
      q={q}
      domain="goals"
      id={item.id}
      className={info.isCompleted ? "goal-card--completed" : undefined}
      badge={<GoalBadges item={item} />}
    >
      <GoalMeta item={item} />
      <GoalProgress info={info} />
    </DomainCard>
  );
};
