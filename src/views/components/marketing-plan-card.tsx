import type { FC } from "hono/jsx";
import type { MarketingPlan } from "../../types/marketing-plan.types.ts";
import { MARKETING_PLAN_COMPLETED_STATUSES } from "../../types/marketing-plan.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { toKebab } from "../../utils/slug.ts";
import { MKTPLAN_STATUS_VARIANTS } from "../../domains/marketing-plan/constants.tsx";
import { badgeClass } from "../../components/ui/status-badge.tsx";

type Props = { item: MarketingPlan; q?: string };

function countItems(arr: unknown[] | undefined | null): number {
  return arr ? arr.length : 0;
}

export const MarketingPlanCard: FC<Props> = ({ item, q }) => {
  const isCompleted = MARKETING_PLAN_COMPLETED_STATUSES.has(item.status);
  const audienceCount = countItems(item.targetAudiences);
  const channelCount = countItems(item.channels);
  const campaignCount = countItems(item.campaigns);
  const goalCount = countItems(item.linkedGoals);
  const budget = item.budgetTotal != null
    ? `${item.budgetCurrency ?? ""} ${item.budgetTotal.toLocaleString()}`
      .trim()
    : "";

  return (
    <DomainCard
      href={`/marketing-plans/${item.id}`}
      name={item.name}
      q={q}
      domain="marketing-plans"
      id={item.id}
      className={isCompleted ? "mktplan-card--completed" : undefined}
      badge={
        <span class={badgeClass(MKTPLAN_STATUS_VARIANTS, item.status)}>
          {item.status}
        </span>
      }
    >
      <CardMeta>
        {item.project && (
          <CardMetaItem label="Project">
            <a href={`/portfolio/${toKebab(item.project)}`}>
              {item.project}
            </a>
          </CardMetaItem>
        )}
        {budget && <CardMetaItem label="Budget">{budget}</CardMetaItem>}
        {item.startDate && (
          <CardMetaItem label="Period">
            {item.startDate}
            {item.endDate ? ` — ${item.endDate}` : ""}
          </CardMetaItem>
        )}
        {audienceCount > 0 && (
          <CardMetaItem label="Audiences">{audienceCount}</CardMetaItem>
        )}
        {channelCount > 0 && (
          <CardMetaItem label="Channels">{channelCount}</CardMetaItem>
        )}
        {campaignCount > 0 && (
          <CardMetaItem label="Campaigns">{campaignCount}</CardMetaItem>
        )}
        {goalCount > 0 && <CardMetaItem label="Goals">{goalCount}
        </CardMetaItem>}
      </CardMeta>
    </DomainCard>
  );
};
