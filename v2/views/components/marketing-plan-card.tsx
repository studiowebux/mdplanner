import type { FC } from "hono/jsx";
import type { MarketingPlan } from "../../types/marketing-plan.types.ts";
import { MARKETING_PLAN_COMPLETED_STATUSES } from "../../types/marketing-plan.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { toKebab } from "../../utils/slug.ts";

type Props = { item: MarketingPlan; q?: string };

export const MarketingPlanCard: FC<Props> = ({ item, q }) => {
  const isCompleted = MARKETING_PLAN_COMPLETED_STATUSES.has(item.status);
  const audienceCount = item.targetAudiences?.length ?? 0;
  const channelCount = item.channels?.length ?? 0;
  const campaignCount = item.campaigns?.length ?? 0;
  const kpiCount = item.kpiTargets?.length ?? 0;
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
        <span class={`badge mktplan-status mktplan-status--${item.status}`}>
          {item.status}
        </span>
      }
    >
      <dl class="domain-card__meta">
        {item.project && (
          <>
            <dt class="domain-card__meta-label">Project</dt>
            <dd class="domain-card__meta-value">
              <a href={`/portfolio/${toKebab(item.project)}`}>
                {item.project}
              </a>
            </dd>
          </>
        )}
        {budget && (
          <>
            <dt class="domain-card__meta-label">Budget</dt>
            <dd class="domain-card__meta-value">{budget}</dd>
          </>
        )}
        {item.startDate && (
          <>
            <dt class="domain-card__meta-label">Period</dt>
            <dd class="domain-card__meta-value">
              {item.startDate}
              {item.endDate ? ` — ${item.endDate}` : ""}
            </dd>
          </>
        )}
        {audienceCount > 0 && (
          <>
            <dt class="domain-card__meta-label">Audiences</dt>
            <dd class="domain-card__meta-value">{audienceCount}</dd>
          </>
        )}
        {channelCount > 0 && (
          <>
            <dt class="domain-card__meta-label">Channels</dt>
            <dd class="domain-card__meta-value">{channelCount}</dd>
          </>
        )}
        {campaignCount > 0 && (
          <>
            <dt class="domain-card__meta-label">Campaigns</dt>
            <dd class="domain-card__meta-value">{campaignCount}</dd>
          </>
        )}
        {kpiCount > 0 && (
          <>
            <dt class="domain-card__meta-label">KPIs</dt>
            <dd class="domain-card__meta-value">{kpiCount}</dd>
          </>
        )}
      </dl>
    </DomainCard>
  );
};
