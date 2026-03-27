import type { FC } from "hono/jsx";
import type { Swot } from "../../types/swot.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { toKebab } from "../../utils/slug.ts";
import { formatDate } from "../../utils/time.ts";

type Props = { item: Swot; q?: string };

export const SwotCard: FC<Props> = ({ item, q }) => {
  return (
    <DomainCard
      href={`/swot/${item.id}`}
      name={item.title}
      q={q}
      domain="swot"
      id={item.id}
      badge={<span class="badge swot-date-badge">{formatDate(item.date)}</span>}
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
      </dl>
      <div class="swot-card__counts">
        <span class="badge swot-card__count--s">
          S {item.strengths.length}
        </span>
        <span class="badge swot-card__count--w">
          W {item.weaknesses.length}
        </span>
        <span class="badge swot-card__count--o">
          O {item.opportunities.length}
        </span>
        <span class="badge swot-card__count--t">
          T {item.threats.length}
        </span>
      </div>
    </DomainCard>
  );
};
