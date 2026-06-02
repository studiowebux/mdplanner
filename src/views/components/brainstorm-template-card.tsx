import type { FC } from "hono/jsx";
import type { BrainstormTemplate } from "../../types/brainstorm-template.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";

type Props = { item: BrainstormTemplate; q?: string };

export const BrainstormTemplateCard: FC<Props> = ({ item, q }) => {
  return (
    <DomainCard
      href={`/brainstorm-templates/${item.id}`}
      name={item.name}
      q={q}
      domain="brainstorm-templates"
      id={item.id}
    >
      <CardMeta>
        <CardMetaItem label="Questions">
          {item.questions.length}
        </CardMetaItem>
        {item.categories && item.categories.length > 0 && (
          <CardMetaItem label="Categories">
            {item.categories.slice(0, 3).join(", ")}
          </CardMetaItem>
        )}
      </CardMeta>
    </DomainCard>
  );
};
