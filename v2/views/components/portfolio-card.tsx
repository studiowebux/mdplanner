import type { FC } from "hono/jsx";
import type { PortfolioItem } from "../../types/portfolio.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { formatCurrency } from "../../utils/format.ts";
import { Highlight } from "../../utils/highlight.tsx";

type Props = { item: PortfolioItem; q?: string };

export const PortfolioCard: FC<Props> = ({ item, q }) => {
  const pct = item.progress ?? 0;

  return (
    <DomainCard
      href={`/portfolio/${item.id}`}
      name={item.name}
      q={q}
      domain="portfolio"
      id={item.id}
      badge={
        <span
          class={`badge portfolio-card__badge portfolio-card__badge--${item.status}`}
        >
          {item.status}
        </span>
      }
    >
      <CardMeta>
        <CardMetaItem label="Category">
          <Highlight text={item.category} q={q} />
        </CardMetaItem>

        {item.client && (
          <CardMetaItem label="Client">
            <Highlight text={item.client} q={q} />
          </CardMetaItem>
        )}

        {(item.revenue != null || item.expenses != null) && (
          <CardMetaItem label="Financials">
            {formatCurrency(item.revenue)}
            {item.revenue && item.expenses ? " / " : ""}
            {item.expenses ? formatCurrency(item.expenses) : ""}
          </CardMetaItem>
        )}

        {item.startDate && (
          <CardMetaItem label="Start">{item.startDate}</CardMetaItem>
        )}
      </CardMeta>

      <div class="portfolio-card__progress">
        <div class="portfolio-progress">
          <progress
            class="progress-bar portfolio-progress__bar"
            value={pct}
            max={100}
          />
          <span class="portfolio-progress__label">{pct}%</span>
        </div>
      </div>

      {item.techStack && item.techStack.length > 0 && (
        <div class="portfolio-card__tech-stack">
          {item.techStack.slice(0, 4).map((t) => (
            <span key={t} class="badge">{t}</span>
          ))}
          {item.techStack.length > 4 && (
            <span class="badge badge--overflow">
              +{item.techStack.length - 4}
            </span>
          )}
        </div>
      )}

      {item.linkedGoals && item.linkedGoals.length > 0 && (
        <div class="portfolio-card__tech-stack">
          <span class="badge">
            {item.linkedGoals.length}{" "}
            goal{item.linkedGoals.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </DomainCard>
  );
};
