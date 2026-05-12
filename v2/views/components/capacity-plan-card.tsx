import type { FC } from "hono/jsx";
import type { CapacityPlan } from "../../types/capacity-plan.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";

type Props = { item: CapacityPlan; q?: string };

export const CapacityPlanCard: FC<Props> = ({ item, q }) => {
  return (
    <DomainCard
      href={`/capacity-plans/${item.id}`}
      name={item.title}
      q={q}
      domain="capacity-plans"
      id={item.id}
    >
      <CardMeta>
        {item.startDate && (
          <CardMetaItem label="Start">{item.startDate}</CardMetaItem>
        )}
        {item.endDate && <CardMetaItem label="End">{item.endDate}
        </CardMetaItem>}
        {item.budgetHours != null && (
          <CardMetaItem label="Budget">{item.budgetHours}h</CardMetaItem>
        )}
        <CardMetaItem label="Members">
          {(item.teamMembers ?? []).length}
        </CardMetaItem>
        <CardMetaItem label="Allocations">
          {(item.allocations ?? []).length}
        </CardMetaItem>
      </CardMeta>
    </DomainCard>
  );
};
