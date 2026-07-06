import type { FC } from "hono/jsx";
import type { PortfolioItem } from "../../types/portfolio.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { formatCurrency } from "../../utils/format.ts";
import { Highlight } from "../../utils/highlight.tsx";
import { PORTFOLIO_STATUS_VARIANTS } from "../../domains/portfolio/constants.tsx";
import {
  badgeClass,
  ExternalBadges,
} from "../../components/ui/status-badge.tsx";

type Props = { item: PortfolioItem; q?: string };

const FinancialsMeta: FC<
  { revenue?: number | null; expenses?: number | null }
> = ({ revenue, expenses }) => {
  if (revenue == null && expenses == null) return null;
  return (
    <CardMetaItem label="Financials">
      {formatCurrency(revenue ?? undefined)}
      {revenue && expenses ? " / " : ""}
      {expenses ? formatCurrency(expenses) : ""}
    </CardMetaItem>
  );
};

const TechStack: FC<{ techStack?: string[] | null }> = ({ techStack }) => {
  if (!techStack || techStack.length === 0) return null;
  return (
    <div class="portfolio-card__tech-stack">
      {techStack.slice(0, 4).map((t) => <span key={t} class="badge">{t}</span>)}
      {techStack.length > 4 && (
        <span class="badge badge--overflow">+{techStack.length - 4}</span>
      )}
    </div>
  );
};

const LinkedGoalsBadge: FC<{ linkedGoals?: string[] | null }> = (
  { linkedGoals },
) => {
  if (!linkedGoals || linkedGoals.length === 0) return null;
  return (
    <div class="portfolio-card__tech-stack">
      <span class="badge">
        {linkedGoals.length} goal{linkedGoals.length !== 1 ? "s" : ""}
      </span>
    </div>
  );
};

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
        <span class={badgeClass(PORTFOLIO_STATUS_VARIANTS, item.status)}>
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

        <FinancialsMeta revenue={item.revenue} expenses={item.expenses} />

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

      <TechStack techStack={item.techStack} />

      {item.badges && item.badges.length > 0 && (
        <div class="portfolio-card__badges">
          <ExternalBadges badges={item.badges} />
        </div>
      )}

      <LinkedGoalsBadge linkedGoals={item.linkedGoals} />
    </DomainCard>
  );
};
