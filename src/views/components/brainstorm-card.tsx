import type { FC } from "hono/jsx";
import type { Brainstorm } from "../../types/brainstorm.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";

type Props = { item: Brainstorm; q?: string };

export const BrainstormCard: FC<Props> = ({ item, q }) => {
  return (
    <DomainCard
      href={`/brainstorms/${item.id}`}
      name={item.title}
      q={q}
      domain="brainstorms"
      id={item.id}
    >
      <CardMeta>
        <CardMetaItem label="Questions">
          {item.questions.length}
        </CardMetaItem>
        {item.tags && item.tags.length > 0 && (
          <CardMetaItem label="Tags">
            {item.tags.slice(0, 3).join(", ")}
          </CardMetaItem>
        )}
      </CardMeta>
    </DomainCard>
  );
};
