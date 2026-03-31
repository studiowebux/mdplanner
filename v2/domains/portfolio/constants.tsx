import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { PortfolioItem } from "../../types/portfolio.types.ts";
import {
  type BadgeVariant,
  statusBadgeRenderer,
} from "../../components/ui/status-badge.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatCurrency } from "../../utils/format.ts";
import { formatDate } from "../../utils/time.ts";

export const PORTFOLIO_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  active: "accent",
  completed: "success",
  production: "teal",
  planning: "info",
  scoping: "purple",
  discovery: "pink",
  paused: "warning",
  "on-hold": "orange",
  maintenance: "teal",
  archived: "neutral",
  cancelled: "error",
};

const actionBtns = (_value: unknown, row: Record<string, unknown>) => (
  <div class="portfolio-card__actions">
    <a class="btn btn--secondary btn--sm" href={`/portfolio/${row.id}`}>
      View
    </a>
    <button
      class="btn btn--secondary btn--sm"
      type="button"
      hx-get={`/portfolio/${row.id}/edit`}
      hx-target="#portfolio-form-container"
      hx-swap="innerHTML"
    >
      Edit
    </button>
    <button
      class="btn btn--danger btn--sm"
      type="button"
      hx-delete={`/portfolio/${row.id}`}
      hx-confirm={`Delete "${row.name}"? This cannot be undone.`}
      hx-swap="none"
    >
      Delete
    </button>
  </div>
);

const progressRenderer = (v: unknown) => {
  const pct = Number(v) || 0;
  return (
    <div class="portfolio-progress">
      <progress
        class="progress-bar portfolio-progress__bar"
        value={pct}
        max={100}
      />
      <span class="portfolio-progress__label">{pct}%</span>
    </div>
  );
};

const currencyRenderer = (v: unknown) => formatCurrency(Number(v) || undefined);

export const PORTFOLIO_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (v, row) => (
      <a href={`/portfolio/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "category",
    label: "Category",
    sortable: true,
    render: (v, row) => <Highlight text={String(v)} q={row._q as string} />,
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: statusBadgeRenderer(PORTFOLIO_STATUS_VARIANTS),
  },
  {
    key: "client",
    label: "Client",
    sortable: true,
    render: (v, row) => <Highlight text={String(v)} q={row._q as string} />,
  },
  {
    key: "progress",
    label: "Progress",
    sortable: true,
    render: progressRenderer,
  },
  {
    key: "revenue",
    label: "Revenue",
    sortable: true,
    render: currencyRenderer,
  },
  {
    key: "expenses",
    label: "Expenses",
    sortable: true,
    render: currencyRenderer,
  },
  {
    key: "startDate",
    label: "Start",
    sortable: true,
    render: (v) => formatDate(v as string),
  },
  {
    key: "endDate",
    label: "End",
    sortable: true,
    render: (v) => formatDate(v as string),
  },
  { key: "_actions", label: "", render: actionBtns },
];

export function portfolioToRow(p: PortfolioItem): Record<string, unknown> {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    status: p.status,
    client: p.client ?? "",
    progress: p.progress ?? 0,
    revenue: p.revenue ?? 0,
    expenses: p.expenses ?? 0,
    startDate: p.startDate ?? "",
    endDate: p.endDate ?? "",
    techStack: (p.techStack ?? []).join(", "),
    description: p.description ?? "",
  };
}
