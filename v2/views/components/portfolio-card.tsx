import type { FC } from "hono/jsx";
import type { PortfolioItem } from "../../types/portfolio.types.ts";
import { formatCurrency } from "../../utils/format.ts";
import { Highlight } from "../../utils/highlight.tsx";

type Props = { item: PortfolioItem; q?: string };

export const PortfolioCard: FC<Props> = ({ item, q }) => {
  const pct = item.progress ?? 0;

  return (
    <article class="portfolio-card" data-filterable-card>
      <header class="portfolio-card__header">
        <h2 class="portfolio-card__name">
          <a href={`/portfolio/${item.id}`}>
            <Highlight text={item.name} q={q} />
          </a>
        </h2>
        <span
          class={`portfolio-card__badge portfolio-card__badge--${item.status}`}
        >
          {item.status}
        </span>
      </header>

      <dl class="portfolio-card__meta">
        <dt class="portfolio-card__meta-label">Category</dt>
        <dd class="portfolio-card__meta-value">
          <Highlight text={item.category} q={q} />
        </dd>

        {item.client && (
          <>
            <dt class="portfolio-card__meta-label">Client</dt>
            <dd class="portfolio-card__meta-value">
              <Highlight text={item.client} q={q} />
            </dd>
          </>
        )}

        {(item.revenue != null || item.expenses != null) && (
          <>
            <dt class="portfolio-card__meta-label">Financials</dt>
            <dd class="portfolio-card__meta-value">
              {formatCurrency(item.revenue)}
              {item.revenue && item.expenses ? " / " : ""}
              {item.expenses ? formatCurrency(item.expenses) : ""}
            </dd>
          </>
        )}

        {item.startDate && (
          <>
            <dt class="portfolio-card__meta-label">Start</dt>
            <dd class="portfolio-card__meta-value">{item.startDate}</dd>
          </>
        )}
      </dl>

      <div class="portfolio-card__progress">
        <div class="portfolio-progress">
          <div class="portfolio-progress__bar" style={`width:${pct}%`} />
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

      <div class="portfolio-card__actions">
        <a class="btn btn--secondary" href={`/portfolio/${item.id}`}>
          View
        </a>
        <button
          class="btn btn--secondary"
          type="button"
          hx-get={`/portfolio/${item.id}/edit`}
          hx-target="#portfolio-form-container"
          hx-swap="innerHTML"
        >
          Edit
        </button>
        <button
          class="btn btn--danger"
          type="button"
          hx-delete={`/portfolio/${item.id}`}
          hx-swap="none"
          hx-confirm-dialog={`Delete "${item.name}"? This cannot be undone.`}
          data-confirm-name={item.name}
        >
          Delete
        </button>
      </div>
    </article>
  );
};
