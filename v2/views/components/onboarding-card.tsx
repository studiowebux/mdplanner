import type { FC } from "hono/jsx";
import type { Onboarding } from "../../types/onboarding.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";

type Props = { item: Onboarding; q?: string };

export const OnboardingCard: FC<Props> = ({ item, q }) => {
  const done = item.steps.filter((s) => s.status === "complete").length;

  return (
    <DomainCard
      href={`/onboarding/${item.id}`}
      name={item.employeeName}
      q={q}
      domain="onboarding"
      id={item.id}
    >
      <CardMeta>
        <CardMetaItem label="Role">{item.role}</CardMetaItem>
        {item.startDate && (
          <CardMetaItem label="Start">{item.startDate}</CardMetaItem>
        )}
        {item.steps.length > 0 && (
          <CardMetaItem label="Progress">
            {done}/{item.steps.length} steps
          </CardMetaItem>
        )}
      </CardMeta>
    </DomainCard>
  );
};
