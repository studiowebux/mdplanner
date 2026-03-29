import type { FC } from "hono/jsx";
import type { MarketingPlan } from "../../types/marketing-plan.types.ts";
import { MARKETING_PLAN_COMPLETED_STATUSES } from "../../types/marketing-plan.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { toKebab } from "../../utils/slug.ts";
import { MKTPLAN_STATUS_VARIANTS } from "../../domains/marketing-plan/constants.tsx";

type Props = { item: MarketingPlan; q?: string };

export const MarketingPlanCard: FC<Props> = ({ item, q }) => {
  const isCompleted = MARKETING_PLAN_COMPLETED_STATUSES.has(item.status);
  const audienceCount = item.targetAudiences?.length ?? 0;
  const channelCount = item.channels?.length ?? 0;
  const campaignCount = item.campaigns?.length ?? 0;
  const goalCount = item.linkedGoals?.length ?? 0;
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
        <span
          class={`badge badge--${
            MKTPLAN_STATUS_VARIANTS[item.status] ?? "neutral"
          }`}
        >
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
