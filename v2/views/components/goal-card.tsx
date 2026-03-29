import type { FC } from "hono/jsx";
import type { Goal } from "../../types/goal.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { KpiGauge } from "../../components/ui/kpi-gauge.tsx";
import { PRIORITY_LABELS } from "../../constants/mod.ts";
import { goalPersonByName } from "../../domains/goal/config.tsx";
import { GOAL_STATUS_VARIANTS } from "../../domains/goal/constants.tsx";
import { dueIn } from "../../utils/time.ts";
import { toKebab } from "../../utils/slug.ts";

type Props = { item: Goal; q?: string };

export const GoalCard: FC<Props> = ({ item, q }) => {
  const isCompleted = item.status === "success" || item.status === "failed";
  const deadline = isCompleted ? "" : dueIn(item.endDate);
  const isOverdue = deadline.includes("overdue");
  const tookDays = isCompleted && item.startDate
    ? Math.max(
      0,
      Math.round(
        (new Date(item.updatedAt).getTime() -
          new Date(item.startDate).getTime()) / 86400000,
      ),
    )
    : null;
  const now = Date.now();
  const start = item.startDate ? new Date(item.startDate).getTime() : 0;
  const end = item.endDate ? new Date(item.endDate).getTime() : 0;
  const hasManualProgress = item.progress !== undefined &&
    item.progress !== null;
  const timeProgress = start && end && end > start
    ? Math.min(
      100,
      Math.max(0, Math.round(((now - start) / (end - start)) * 100)),
    )
    : 0;
  const progress = hasManualProgress ? item.progress! : timeProgress;
  const progressLabel = hasManualProgress ? "progress" : "elapsed";

  return (
    <DomainCard
      href={`/goals/${item.id}`}
      name={item.title}
      q={q}
      domain="goals"
      id={item.id}
      className={isCompleted ? "goal-card--completed" : undefined}
      badge={
        <>
          <span
            class={`badge badge--${
              GOAL_STATUS_VARIANTS[item.status] ?? "neutral"
            }`}
          >
            {item.status}
          </span>
          {item.priority && (
            <span class={`badge priority--${item.priority}`}>
              {PRIORITY_LABELS[String(item.priority)] ?? `P${item.priority}`}
            </span>
          )}
        </>
      }
    >
      {/* Compact meta — owner + KPI only */}
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
              href={goalPersonByName[item.owner!]
                ? `/people/${goalPersonByName[item.owner!]}`
                : `/people?q=${encodeURIComponent(item.owner!)}`}
            >
              {item.owner}
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

      {/* Progress bar — manual or time-elapsed */}
      {(hasManualProgress || (start > 0 && end > 0)) && (
        <div class="progress-group">
          <progress
            class="progress-bar"
            value={progress}
            max={100}
          />
          <span class="progress-label">
            {progress}% {progressLabel}
            {deadline && (
              <span
                class={`goal-deadline${
                  isOverdue ? " goal-deadline--overdue" : ""
                }`}
              >
                {" — "}
                {deadline}
              </span>
            )}
            {tookDays !== null && (
              <span class="goal-deadline">
                &mdash; took {tookDays} day{tookDays !== 1 ? "s" : ""}
              </span>
            )}
          </span>
        </div>
      )}
    </DomainCard>
  );
};
