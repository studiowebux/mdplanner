import type { FC } from "hono/jsx";
import type { PortfolioItem } from "../../types/portfolio.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
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
      <dl class="domain-card__meta">
        <dt class="domain-card__meta-label">Category</dt>
        <dd class="domain-card__meta-value">
          <Highlight text={item.category} q={q} />
        </dd>

        {item.client && (
          <>
            <dt class="domain-card__meta-label">Client</dt>
            <dd class="domain-card__meta-value">
              <Highlight text={item.client} q={q} />
            </dd>
          </>
        )}

        {(item.revenue != null || item.expenses != null) && (
          <>
            <dt class="domain-card__meta-label">Financials</dt>
            <dd class="domain-card__meta-value">
              {formatCurrency(item.revenue)}
              {item.revenue && item.expenses ? " / " : ""}
              {item.expenses ? formatCurrency(item.expenses) : ""}
            </dd>
          </>
        )}

        {item.startDate && (
          <>
            <dt class="domain-card__meta-label">Start</dt>
            <dd class="domain-card__meta-value">{item.startDate}</dd>
          </>
        )}
      </dl>

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
            <span key={t} class="portfolio-pill">{t}</span>
          ))}
          {item.techStack.length > 4 && (
            <span class="portfolio-pill portfolio-pill--overflow">
              +{item.techStack.length - 4}
            </span>
          )}
        </div>
      )}

      {item.linkedGoals && item.linkedGoals.length > 0 && (
        <div class="portfolio-card__tech-stack">
          <span class="portfolio-pill">
            {item.linkedGoals.length}{" "}
            goal{item.linkedGoals.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </DomainCard>
  );
};
