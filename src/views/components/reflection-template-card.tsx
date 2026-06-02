import type { FC } from "hono/jsx";
import type { ReflectionTemplate } from "../../types/reflection-template.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";

type Props = { item: ReflectionTemplate; q?: string };

export const ReflectionTemplateCard: FC<Props> = ({ item, q }) => {
  return (
    <DomainCard
      href={`/reflection-templates/${item.id}`}
      name={item.name}
      q={q}
      domain="reflection-templates"
      id={item.id}
    >
      <CardMeta>
        <CardMetaItem label="Prompts">
          {item.prompts.length}
        </CardMetaItem>
        {item.period && (
          <CardMetaItem label="Period">{item.period}</CardMetaItem>
        )}
        {item.categories && item.categories.length > 0 && (
          <CardMetaItem label="Categories">
            {item.categories.slice(0, 3).join(", ")}
          </CardMetaItem>
        )}
      </CardMeta>
    </DomainCard>
  );
};
