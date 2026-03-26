import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { PortfolioItem } from "../types/portfolio.types.ts";
import type { Goal } from "../types/goal.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatCurrency } from "../utils/format.ts";
import { formatDate } from "../utils/time.ts";
import { markdownToHtml } from "../utils/markdown.ts";
import { GitHubSection } from "./github.tsx";

import type { PortfolioStatusUpdate } from "../types/portfolio.types.ts";

type Props = ViewProps & { item: PortfolioItem; goals?: Goal[] };

/** Single status update row — reused by detail page and fragment routes. */
export const StatusUpdateRow: FC<{
  u: PortfolioStatusUpdate;
  itemId: string;
}> = ({ u, itemId }) => (
  <div id={`update-${u.id}`} class="portfolio-detail__update">
    <span class="portfolio-detail__update-date">{formatDate(u.date)}</span>
    <span class="portfolio-detail__update-message">{u.message}</span>
    <span class="portfolio-detail__update-actions">
      <button
        class="btn btn--secondary btn--sm"
        type="button"
        hx-get={`/portfolio/${itemId}/status-updates/${u.id}/edit`}
        hx-target={`#update-${u.id}`}
        hx-swap="outerHTML"
      >
        Edit
      </button>
      <button
        class="btn btn--danger btn--sm"
        type="button"
        hx-delete={`/portfolio/${itemId}/status-updates/${u.id}`}
        hx-target={`#update-${u.id}`}
        hx-swap="outerHTML"
        hx-confirm-dialog="Delete this status update?"
      >
        Delete
      </button>
    </span>
  </div>
);

/** Inline edit form — swapped in by GET /:id/status-updates/:updateId/edit */
export const StatusUpdateEditRow: FC<{
  u: PortfolioStatusUpdate;
  itemId: string;
}> = ({ u, itemId }) => (
  <form
    id={`update-${u.id}`}
    class="portfolio-detail__update portfolio-detail__update--editing"
    hx-post={`/portfolio/${itemId}/status-updates/${u.id}`}
    hx-target={`#update-${u.id}`}
    hx-swap="outerHTML"
  >
    <span class="portfolio-detail__update-date">{formatDate(u.date)}</span>
    <textarea class="form__input" name="message" rows={2}>{u.message}</textarea>
    <span class="portfolio-detail__update-actions">
      <button class="btn btn--primary btn--sm" type="submit">Save</button>
      <button
        class="btn btn--secondary btn--sm"
        type="button"
        hx-get={`/portfolio/${itemId}/status-updates/${u.id}/row`}
        hx-target={`#update-${u.id}`}
        hx-swap="outerHTML"
      >
        Cancel
      </button>
    </span>
  </form>
);

export const PortfolioDetailView: FC<Props> = (
  { item, goals = [], ...viewProps },
) => {
  const descHtml = markdownToHtml(item.description);
  const profit = (item.revenue ?? 0) - (item.expenses ?? 0);
  const pct = item.progress ?? 0;

  return (
    <MainLayout
      title={item.name}
      {...viewProps}
      styles={[
        "/css/views/portfolio.css",
        "/css/views/github.css",
        ...(goals.length ? ["/css/views/goals.css"] : []),
      ]}
      scripts={item.githubRepo ? ["/js/github-tabs.js"] : []}
    >
      <div
        hx-ext="sse"
        sse-connect="/sse"
        hx-get={`/portfolio/${item.id}`}
        hx-trigger="sse:portfolio.updated, sse:portfolio.deleted"
        hx-target="#portfolio-detail-root"
        hx-select="#portfolio-detail-root"
        hx-swap="outerHTML"
      />
      <main id="portfolio-detail-root" class="portfolio-detail">
        <div class="portfolio-detail__back">
          <a href="/portfolio" class="btn btn--secondary">
            Back to portfolio
          </a>
        </div>

        <header class="portfolio-detail__header">
          <div class="portfolio-detail__title-row">
            <h1 class="portfolio-detail__title">{item.name}</h1>
            <span
              class={`portfolio-card__badge portfolio-card__badge--${item.status}`}
            >
              {item.status}
            </span>
          </div>
          <p class="portfolio-detail__meta">
            {item.category}
            {item.client && <>&middot; {item.client}</>}
            {item.startDate && <>&middot; {item.startDate}</>}
            {item.endDate && <>to {item.endDate}</>}
            {item.license && <>&middot; {item.license}</>}
          </p>
          <div class="portfolio-detail__progress">
            <div class="portfolio-progress">
              <progress class="portfolio-progress__bar" value={pct} max={100} />
              <span class="portfolio-progress__label">{pct}%</span>
            </div>
          </div>
        </header>

        {(item.revenue != null || item.expenses != null) && (
          <div class="portfolio-detail__financials">
            <div class="portfolio-detail__financial-card">
              <div class="portfolio-detail__financial-label">Revenue</div>
              <div class="portfolio-detail__financial-value">
                {formatCurrency(item.revenue) || "$0"}
              </div>
            </div>
            <div class="portfolio-detail__financial-card">
              <div class="portfolio-detail__financial-label">Expenses</div>
              <div class="portfolio-detail__financial-value">
                {formatCurrency(item.expenses) || "$0"}
              </div>
            </div>
            <div class="portfolio-detail__financial-card">
              <div class="portfolio-detail__financial-label">Profit</div>
              <div
                class={`portfolio-detail__financial-value ${
                  profit >= 0
                    ? "portfolio-detail__financial-value--profit"
                    : "portfolio-detail__financial-value--loss"
                }`}
              >
                {formatCurrency(profit) || "$0"}
              </div>
            </div>
          </div>
        )}

        {descHtml && (
          <section class="portfolio-detail__section">
            <h2 class="portfolio-detail__section-heading">Description</h2>
            <div
              class="markdown-body"
              dangerouslySetInnerHTML={{ __html: descHtml }}
            />
          </section>
        )}

        {item.techStack && item.techStack.length > 0 && (
          <section class="portfolio-detail__section">
            <h2 class="portfolio-detail__section-heading">Tech Stack</h2>
            <div class="portfolio-card__tech-stack">
              {item.techStack.map((t) => (
                <span key={t} class="portfolio-pill">{t}</span>
              ))}
            </div>
          </section>
        )}

        {item.team && item.team.length > 0 && (
          <section class="portfolio-detail__section">
            <h2 class="portfolio-detail__section-heading">Team</h2>
            <div class="portfolio-detail__team">
              {item.team.map((m) => (
                <span key={m} class="portfolio-detail__team-chip">{m}</span>
              ))}
            </div>
          </section>
        )}

        {item.kpis && item.kpis.length > 0 && (
          <section class="portfolio-detail__kpis">
            <h2 class="portfolio-detail__section-heading">KPIs</h2>
            <table class="portfolio-detail__kpi-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Value</th>
                  <th>Target</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                {item.kpis.map((kpi) => {
                  const met = kpi.target != null &&
                    Number(kpi.value) >= Number(kpi.target);
                  return (
                    <tr key={kpi.name}>
                      <td>
                        <a href={`/kpis?q=${encodeURIComponent(kpi.name)}`}>
                          {kpi.name}
                        </a>
                      </td>
                      <td class={met ? "portfolio-detail__kpi-met" : ""}>
                        {kpi.value}
                      </td>
                      <td>{kpi.target ?? ""}</td>
                      <td>{kpi.unit ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        {item.urls && item.urls.length > 0 && (
          <section class="portfolio-detail__section">
            <h2 class="portfolio-detail__section-heading">Links</h2>
            <div class="portfolio-detail__urls">
              {item.urls.map((u) => (
                <a
                  key={u.href}
                  href={u.href}
                  class="btn btn--secondary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {u.label}
                </a>
              ))}
            </div>
          </section>
        )}

        <section class="portfolio-detail__status-updates">
          <h2 class="portfolio-detail__section-heading">Status Updates</h2>

          <form
            class="portfolio-detail__update-form"
            hx-post={`/portfolio/${item.id}/status-updates`}
            hx-target="#status-updates-list"
            hx-swap="afterbegin"
          >
            <textarea
              class="form__input"
              name="message"
              placeholder="Add a status update..."
              rows={2}
              required
            />
            <button class="btn btn--primary btn--sm" type="submit">
              Add Update
            </button>
          </form>

          <div id="status-updates-list">
            {(item.statusUpdates ?? []).map((u) => (
              <StatusUpdateRow key={u.id} u={u} itemId={item.id} />
            ))}
          </div>
        </section>

        {item.githubRepo && <GitHubSection itemId={item.id} />}

        {goals.length > 0 && (
          <section class="portfolio-detail__section">
            <h2 class="portfolio-detail__section-heading">Linked Goals</h2>
            <div class="goal-detail__links">
              {goals.map((g) => (
                <a
                  key={g.id}
                  href={`/goals/${g.id}`}
                  class="btn btn--secondary btn--sm"
                >
                  <span class={`goal-status goal-status--${g.status}`}>
                    {g.status}
                  </span>{" "}
                  {g.title}
                </a>
              ))}
            </div>
          </section>
        )}

        <div class="detail-actions">
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
      </main>
      <div id="portfolio-form-container" />
    </MainLayout>
  );
};
