import type { FC } from "hono/jsx";
import type { OnboardingTemplate } from "../../types/onboarding-template.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";

type Props = { item: OnboardingTemplate; q?: string };

export const OnboardingTemplateCard: FC<Props> = ({ item, q }) => (
  <DomainCard
    href={`/onboarding-templates/${item.id}`}
    name={item.name}
    q={q}
    domain="onboarding-templates"
    id={item.id}
  >
    <CardMeta>
      {item.role && <CardMetaItem label="Role">{item.role}</CardMetaItem>}
      <CardMetaItem label="Steps">{item.steps.length}</CardMetaItem>
      {item.tags && item.tags.length > 0 && (
        <CardMetaItem label="Tags">{item.tags.join(", ")}</CardMetaItem>
      )}
    </CardMeta>
  </DomainCard>
);
