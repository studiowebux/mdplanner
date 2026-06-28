// Portfolio Grid — read-only visual triage view. Projects grouped
// Client → Category as status-colour-coded cards (left-border accent).
// Thin shell + exported sub-components (god-file decomposition pattern);
// SSE live-refresh on portfolio.updated. Build ticket task_1781387420081_u9yph1.

import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { ViewProps } from "../types/app.ts";
import type { PortfolioItem } from "../types/portfolio.types.ts";
import { StatusBadge } from "../components/ui/status-badge.tsx";
import { PORTFOLIO_STATUS_VARIANTS } from "../domains/portfolio/constants.tsx";
import type { GridClientGroup } from "./portfolio/helpers.ts";

// ---------------------------------------------------------------------------
// Sub-components (exported for render tests)
// ---------------------------------------------------------------------------

/** One project card — name link + status badge, left-border tinted by status. */
export const ProjectCard: FC<{ item: PortfolioItem }> = ({ item }) => {
  const variant = PORTFOLIO_STATUS_VARIANTS[item.status] ?? "neutral";
  return (
    <a
      href={`/portfolio/${item.id}`}
      class={`portfolio-grid__card portfolio-grid__card--${variant}`}
    >
      <span class="portfolio-grid__card-name">{item.name}</span>
      <StatusBadge status={item.status} variant={variant} />
    </a>
  );
};

/** A labelled category box holding a wrapping grid of project cards. */
export const CategoryBox: FC<{ category: string; items: PortfolioItem[] }> = (
  { category, items },
) => (
  <div class="portfolio-grid__category">
    <h3 class="portfolio-grid__category-title">
      {category}
      <span class="portfolio-grid__category-count">{items.length}</span>
    </h3>
    <div class="portfolio-grid__cards">
      {items.map((item) => <ProjectCard key={item.id} item={item} />)}
    </div>
  </div>
);

/** A client section — header + the client's category boxes. */
export const ClientSection: FC<{ group: GridClientGroup }> = ({ group }) => (
  <section class="portfolio-grid__client">
    <h2 class="portfolio-grid__client-title">{group.client}</h2>
    <div class="portfolio-grid__categories">
      {group.categories.map((cat) => (
        <CategoryBox
          key={cat.category}
          category={cat.category}
          items={cat.items}
        />
      ))}
    </div>
  </section>
);

// ---------------------------------------------------------------------------
// Grid fragment — SSE/hx-get target
// ---------------------------------------------------------------------------

export const PortfolioGrid: FC<{ groups: GridClientGroup[] }> = (
  { groups },
) => (
  <div id="portfolio-grid-view" class="portfolio-grid">
    {groups.length === 0
      ? <p class="empty-text">No portfolio items</p>
      : groups.map((group) => (
        <ClientSection
          key={group.client}
          group={group}
        />
      ))}
  </div>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type Props = ViewProps & { groups: GridClientGroup[] };

export const PortfolioGridView: FC<Props> = ({ groups, ...props }) => {
  const total = groups.reduce(
    (sum, g) => sum + g.categories.reduce((s, c) => s + c.items.length, 0),
    0,
  );
  return (
    <MainLayout
      title="Portfolio Grid"
      {...props}
      styles={["/css/views/portfolio.css"]}
    >
      <main
        class="domain-page"
        data-domain="portfolio-grid"
        hx-ext="sse, morph"
        sse-connect="/sse"
        hx-get="/portfolio/grid/view"
        hx-trigger="sse:portfolio.created, sse:portfolio.updated, sse:portfolio.deleted"
        hx-target="#portfolio-grid-view"
        hx-swap="morph:outerHTML"
      >
        <header class="domain-page__header">
          <h1 class="domain-page__title">Portfolio Grid</h1>
          <span class="domain-page__count">{total} projects</span>
        </header>

        <PortfolioGrid groups={groups} />
      </main>
    </MainLayout>
  );
};
