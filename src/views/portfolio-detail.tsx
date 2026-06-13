import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { PortfolioItem } from "../types/portfolio.types.ts";
import type { Goal } from "../types/goal.types.ts";
import type { Customer } from "../types/customer.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatCurrency } from "../utils/format.ts";
import { formatDate } from "../utils/time.ts";
import { GitHubSection } from "./github.tsx";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { KpiGauge } from "../components/ui/kpi-gauge.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { PORTFOLIO_STATUS_VARIANTS } from "../domains/portfolio/constants.tsx";
import { GOAL_STATUS_VARIANTS } from "../domains/goal/constants.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";
import { InlineEditable } from "./components/inline-editable.tsx";
import { FormTextarea } from "../components/ui/form-textarea.tsx";

import type { PortfolioStatusUpdate } from "../types/portfolio.types.ts";

type Props = ViewProps & {
  item: PortfolioItem;
  goals?: Goal[];
  personById?: Record<string, string>;
  customer?: Customer | null;
  clientCustomer?: Customer | null;
  editing?: boolean;
};

const DescriptionSection: FC<{ item: PortfolioItem }> = ({ item }) => (
  <section class="detail-section">
    <h2 class="section-heading">Description</h2>
    <InlineEditable
      fieldId="portfolio-description"
      name="description"
      value={item.description ?? ""}
      hxPut={`/portfolio/${item.id}/description?editing=true`}
      rootId="portfolio-detail-root"
    />
  </section>
);

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
        hx-confirm="Delete this status update?"
        hx-target={`#update-${u.id}`}
        hx-swap="outerHTML"
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
    <FormTextarea name="message" rows={2} value={u.message} />
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

/** Quick-add status update form — prepends new rows into #status-updates-list. */
export const StatusUpdateForm: FC<{ itemId: string }> = ({ itemId }) => (
  <form
    class="portfolio-detail__update-form"
    hx-post={`/portfolio/${itemId}/status-updates`}
    hx-target="#status-updates-list"
    hx-swap="afterbegin"
  >
    <FormTextarea
      name="message"
      placeholder="Add a status update..."
      rows={2}
      required
    />
    <button class="btn btn--primary btn--sm" type="submit">
      Add Update
    </button>
  </form>
);

/** Title, status, meta line and progress bar. */
const HeaderSection: FC<{
  item: PortfolioItem;
  clientCustomer: Customer | null;
  editing: boolean;
}> = ({ item, clientCustomer, editing }) => {
  const pct = item.progress ?? 0;
  return (
    <header class="detail-section detail-header portfolio-detail__header">
      <div class="detail-title-row portfolio-detail__title-row">
        {item.logo && (
          <img
            class="portfolio-detail__logo"
            src={item.logo}
            alt={`${item.name} logo`}
          />
        )}
        <h1 class="detail-title portfolio-detail__title">{item.name}</h1>
        <span class={badgeClass(PORTFOLIO_STATUS_VARIANTS, item.status)}>
          {item.status}
        </span>
      </div>
      <DetailActions
        entity="portfolio"
        id={item.id}
        title={item.name}
        formContainerId="portfolio-form-container"
        archived={item.archived === true}
      >
        <EditModeToggle href={`/portfolio/${item.id}`} editing={editing} />
      </DetailActions>
      <p class="portfolio-detail__meta">
        {item.category}
        {(clientCustomer || item.client) && (
          <>
            {" "}&middot; {clientCustomer
              ? (
                <a href={`/customers/${clientCustomer.id}`}>
                  {clientCustomer.name}
                </a>
              )
              : item.client}
          </>
        )}
        {item.startDate && <>{" "}&middot; {item.startDate}</>}
        {item.endDate && <>{" "}to {item.endDate}</>}
        {item.license && <>{" "}&middot; {item.license}</>}
      </p>
      <div class="portfolio-detail__progress">
        <div class="portfolio-progress">
          <progress
            class="progress-bar portfolio-progress__bar"
            value={pct}
            max={100}
          />
          <span class="portfolio-progress__label">{pct}%</span>
        </div>
      </div>
    </header>
  );
};

/** Billing-customer / brain-managed info row. */
const ExtraInfoRow: FC<{ item: PortfolioItem; customer: Customer | null }> = (
  { item, customer },
) => {
  if (!item.billingCustomerId && item.brainManaged == null) return null;
  return (
    <div class="detail-section detail-info-row">
      {item.billingCustomerId && (
        <InfoItem label="Billing customer">
          {customer
            ? <a href={`/customers/${customer.id}`}>{customer.name}</a>
            : item.billingCustomerId}
        </InfoItem>
      )}
      {item.brainManaged != null && (
        <InfoItem label="Brain managed">
          {item.brainManaged ? "Yes" : "No"}
        </InfoItem>
      )}
    </div>
  );
};

/** Revenue / expenses / profit cards. */
const FinancialsSection: FC<{ item: PortfolioItem }> = ({ item }) => {
  if (item.revenue == null && item.expenses == null) return null;
  const profit = (item.revenue ?? 0) - (item.expenses ?? 0);
  return (
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
  );
};

/** Description block — editable form or rendered markdown. */
const DescriptionBlock: FC<{ item: PortfolioItem; editing: boolean }> = (
  { item, editing },
) =>
  editing
    ? <DescriptionSection item={item} />
    : <MarkdownSection title="Description" markdown={item.description} />;

/** Tech-stack badges. */
const TechStackSection: FC<{ item: PortfolioItem }> = ({ item }) => {
  if (!item.techStack || item.techStack.length === 0) return null;
  return (
    <section class="detail-section portfolio-detail__section">
      <h2 class="section-heading">Tech Stack</h2>
      <div class="portfolio-card__tech-stack">
        {item.techStack.map((t) => <span key={t} class="badge">{t}</span>)}
      </div>
    </section>
  );
};

/** Team member chips. */
const TeamSection: FC<{
  item: PortfolioItem;
  personById: Record<string, string>;
}> = ({ item, personById }) => {
  if (!item.team || item.team.length === 0) return null;
  return (
    <section class="detail-section portfolio-detail__section">
      <h2 class="section-heading">Team</h2>
      <div class="portfolio-detail__team">
        {item.team.map((m) => {
          const name = personById[m.personId] ?? m.personId;
          return (
            <div key={m.personId} class="portfolio-detail__team-member">
              <a
                href={`/people/${m.personId}`}
                class="portfolio-detail__team-chip"
              >
                {name}
              </a>
              {m.role && (
                <span class="portfolio-detail__team-role">{m.role}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

/** KPI table. */
const KpisSection: FC<{ item: PortfolioItem }> = ({ item }) => {
  if (!item.kpis || item.kpis.length === 0) return null;
  return (
    <section class="portfolio-detail__kpis">
      <h2 class="section-heading">KPIs</h2>
      <table class="data-table data-table--header-bg">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Value</th>
            <th scope="col">Target</th>
            <th scope="col">Unit</th>
          </tr>
        </thead>
        <tbody>
          {item.kpis.map((kpi) => {
            const met = kpi.target != null &&
              Number(kpi.value) >= Number(kpi.target);
            return (
              <tr key={kpi.name}>
                <td>{kpi.name}</td>
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
  );
};

/** External link buttons. */
const LinksSection: FC<{ item: PortfolioItem }> = ({ item }) => {
  if (!item.urls || item.urls.length === 0) return null;
  return (
    <section class="detail-section portfolio-detail__section">
      <h2 class="section-heading">Links</h2>
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
  );
};

/** Status-update feed with quick-add form. */
const StatusUpdatesSection: FC<{ item: PortfolioItem }> = ({ item }) => (
  <section class="portfolio-detail__status-updates">
    <h2 class="section-heading">Status Updates</h2>

    <StatusUpdateForm itemId={item.id} />

    <div id="status-updates-list">
      {(item.statusUpdates ?? []).map((u) => (
        <StatusUpdateRow key={u.id} u={u} itemId={item.id} />
      ))}
    </div>
  </section>
);

/** Linked-goals table. */
const LinkedGoalsSection: FC<{ goals: Goal[] }> = ({ goals }) => {
  if (goals.length === 0) return null;
  return (
    <section class="detail-section portfolio-detail__section">
      <h2 class="section-heading">Linked Goals</h2>
      <table class="data-table data-table--header-bg">
        <thead>
          <tr>
            <th scope="col">Goal</th>
            <th scope="col">Status</th>
            <th scope="col">KPI</th>
            <th scope="col">Metric</th>
            <th scope="col">Value</th>
            <th scope="col">Target</th>
          </tr>
        </thead>
        <tbody>
          {goals.map((g) => (
            <tr key={g.id}>
              <td>
                <a href={`/goals/${g.id}`}>{g.title}</a>
              </td>
              <td>
                <span class={badgeClass(GOAL_STATUS_VARIANTS, g.status)}>
                  {g.status}
                </span>
              </td>
              <td>{g.kpi ?? ""}</td>
              <td>{g.kpiMetric ?? ""}</td>
              <td>
                {g.kpiValue != null && g.kpiTarget != null
                  ? <KpiGauge value={g.kpiValue} target={g.kpiTarget} />
                  : (g.kpiValue ?? "")}
              </td>
              <td>{g.kpiTarget ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export const PortfolioDetailView: FC<Props> = (
  {
    item,
    goals = [],
    personById = {},
    customer = null,
    clientCustomer = null,
    editing = false,
    ...viewProps
  },
) => (
  <MainLayout
    title={item.name}
    {...viewProps}
    styles={[
      "/css/views/portfolio.css",
      "/css/views/github.css",
      ...(goals.length ? ["/css/views/goals.css"] : []),
    ]}
    scripts={[
      ...(item.githubRepo ? ["/js/github-tabs.js"] : []),
      ...(goals.length || item.githubRepo ? ["/js/kpi-gauge.js"] : []),
      "/js/inline-edit.js",
    ]}
  >
    <SseRefresh
      getUrl={"/portfolio/" + item.id + (editing ? "?editing=true" : "")}
      trigger="sse:portfolio.updated, sse:portfolio.deleted"
      targetId="portfolio-detail-root"
    />
    <main
      id="portfolio-detail-root"
      class={`detail-view portfolio-detail${
        editing ? " portfolio-detail--editing" : ""
      }`}
    >
      <Breadcrumb
        items={[
          { label: "Portfolio", href: "/portfolio" },
          { label: item.name },
        ]}
      />
      <BackButton href="/portfolio" label="Back to portfolio" />

      <ArchivedBanner entity={item} />

      <HeaderSection
        item={item}
        clientCustomer={clientCustomer}
        editing={editing}
      />
      <ExtraInfoRow item={item} customer={customer} />
      <FinancialsSection item={item} />
      <DescriptionBlock item={item} editing={editing} />
      <TechStackSection item={item} />
      <TeamSection item={item} personById={personById} />
      <KpisSection item={item} />
      <LinksSection item={item} />
      <StatusUpdatesSection item={item} />
      <LinkedGoalsSection goals={goals} />

      {item.githubRepo && <GitHubSection itemId={item.id} />}
      <AuditMeta
        createdAt={item.createdAt}
        updatedAt={item.updatedAt}
        createdBy={item.createdBy}
        updatedBy={item.updatedBy}
      />
    </main>
    <div id="portfolio-form-container" />
  </MainLayout>
);
