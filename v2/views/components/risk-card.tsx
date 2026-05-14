import type { FC } from "hono/jsx";
import type { Risk } from "../../types/risk.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { toKebab } from "../../utils/slug.ts";
import { badgeClass } from "../../components/ui/status-badge.tsx";
import { RISK_STATUS_VARIANTS } from "../../domains/risk/constants.tsx";

type Props = { item: Risk; q?: string };

export const RiskCard: FC<Props> = ({ item, q }) => {
  return (
    <DomainCard
      href={`/risks/${item.id}`}
      name={item.title}
      q={q}
      domain="risks"
      id={item.id}
      badge={
        <span class={badgeClass(RISK_STATUS_VARIANTS, item.status)}>{item.status}</span>
      }
    >
      <CardMeta>
        <CardMetaItem label="Category">{item.category}</CardMetaItem>
        <CardMetaItem label="Likelihood">
          <span class="risk-score">{item.likelihood}/5</span>
        </CardMetaItem>
        <CardMetaItem label="Impact">
          <span class="risk-score">{item.impact}/5</span>
        </CardMetaItem>
        {item.project && (
          <CardMetaItem label="Project">
            <a href={`/portfolio/${toKebab(item.project)}`}>
              {item.project}
            </a>
          </CardMetaItem>
        )}
      </CardMeta>
    </DomainCard>
  );
};
