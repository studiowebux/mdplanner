import type { FC } from "hono/jsx";
import type { BusinessModel } from "../../types/business-model.types.ts";
import { BUSINESS_MODEL_SECTION_KEYS } from "../../types/business-model.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { toKebab } from "../../utils/slug.ts";
import { formatDate } from "../../utils/time.ts";

type Props = { item: BusinessModel; q?: string };

export const BusinessModelCard: FC<Props> = ({ item, q }) => {
  const total = BUSINESS_MODEL_SECTION_KEYS.reduce(
    (sum, k) => sum + item[k].length,
    0,
  );
  return (
    <DomainCard
      href={`/business-models/${item.id}`}
      name={item.title}
      q={q}
      domain="business-models"
      id={item.id}
      badge={<span class="badge bmc-date-badge">{formatDate(item.date)}</span>}
    >
      <CardMeta>
        {item.project && (
          <CardMetaItem label="Project">
            <a href={`/portfolio/${toKebab(item.project)}`}>
              {item.project}
            </a>
          </CardMetaItem>
        )}
        <CardMetaItem label="Items">{total}</CardMetaItem>
      </CardMeta>
    </DomainCard>
  );
};
