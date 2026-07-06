// Finance chart — two SVG visualisations for the Finance Entries chart view:
//   1. Monthly grouped bars (income vs. expense per YYYY-MM bucket)
//   2. Horizontal by-tag breakdown (one bar per (tag, type) row)
//
// Pure server-rendered SVG. All dimensions are SVG attributes (CSP-safe), all
// colors come from CSS classes resolving to `--color-*` tokens.

import type { FC } from "hono/jsx";
import type {
  FinanceMonthlyTotal,
  FinanceSummary,
} from "../../../types/finance.types.ts";
import { EmptyState } from "../../../components/ui/empty-state.tsx";

// ---------------------------------------------------------------------------
// Geometry — fixed pixel constants drive the SVG viewBox; CSS only paints.
// ---------------------------------------------------------------------------

const MONTHLY = {
  paddingL: 56,
  paddingR: 16,
  paddingT: 16,
  paddingB: 40,
  plotH: 200,
  groupW: 64,
  barW: 24,
  interBar: 4,
  yTicks: 4,
} as const;

const BY_TAG = {
  rowH: 28,
  rowGap: 6,
  labelW: 160,
  valueW: 96,
  barH: 18,
  paddingX: 12,
  paddingY: 12,
} as const;

function niceMax(raw: number): number {
  if (raw <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalized = raw / magnitude;
  let nice: number;
  if (normalized <= 1) nice = 1;
  else if (normalized <= 2) nice = 2;
  else if (normalized <= 5) nice = 5;
  else nice = 10;
  return nice * magnitude;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

// ---------------------------------------------------------------------------
// Monthly chart — grouped bars per month
// ---------------------------------------------------------------------------

const MonthlyBars: FC<{ monthly: FinanceMonthlyTotal[] }> = ({ monthly }) => {
  const rawMax = monthly.reduce(
    (m, x) => Math.max(m, x.income, x.expense),
    0,
  );
  const yMax = niceMax(rawMax);
  const plotW = monthly.length * MONTHLY.groupW;
  const totalW = MONTHLY.paddingL + plotW + MONTHLY.paddingR;
  const totalH = MONTHLY.paddingT + MONTHLY.plotH + MONTHLY.paddingB;
  const plotTop = MONTHLY.paddingT;
  const plotBottom = plotTop + MONTHLY.plotH;
  const groupGap = (MONTHLY.groupW - 2 * MONTHLY.barW - MONTHLY.interBar) / 2;

  const yTickVals = Array.from(
    { length: MONTHLY.yTicks + 1 },
    (_, i) => (yMax * i) / MONTHLY.yTicks,
  );

  return (
    <svg
      class="finance-chart__svg finance-chart__svg--monthly"
      viewBox={`0 0 ${totalW} ${totalH}`}
      preserveAspectRatio="xMinYMid meet"
      role="img"
      aria-label="Monthly income vs. expense"
    >
      {yTickVals.map((v, i) => {
        const y = plotBottom - (v / yMax) * MONTHLY.plotH;
        return (
          <g key={`tick-${i}`} class="finance-chart__y-tick">
            <line
              x1={MONTHLY.paddingL}
              x2={totalW - MONTHLY.paddingR}
              y1={y}
              y2={y}
              class="finance-chart__gridline"
            />
            <text
              x={MONTHLY.paddingL - 8}
              y={y}
              class="finance-chart__axis-label finance-chart__axis-label--y"
              text-anchor="end"
              dominant-baseline="middle"
            >
              {fmt(v)}
            </text>
          </g>
        );
      })}

      {monthly.map((m, i) => {
        const groupX = MONTHLY.paddingL + i * MONTHLY.groupW;
        const incomeH = yMax > 0 ? (m.income / yMax) * MONTHLY.plotH : 0;
        const expenseH = yMax > 0 ? (m.expense / yMax) * MONTHLY.plotH : 0;
        const incomeX = groupX + groupGap;
        const expenseX = incomeX + MONTHLY.barW + MONTHLY.interBar;
        return (
          <g key={m.month} class="finance-chart__group">
            <rect
              class="finance-chart__bar finance-chart__bar--income"
              x={incomeX}
              y={plotBottom - incomeH}
              width={MONTHLY.barW}
              height={incomeH}
            >
              <title>
                {`${m.month} income — ${m.income.toLocaleString()}`}
              </title>
            </rect>
            <rect
              class="finance-chart__bar finance-chart__bar--expense"
              x={expenseX}
              y={plotBottom - expenseH}
              width={MONTHLY.barW}
              height={expenseH}
            >
              <title>
                {`${m.month} expense — ${m.expense.toLocaleString()}`}
              </title>
            </rect>
            <text
              x={groupX + MONTHLY.groupW / 2}
              y={plotBottom + 20}
              class="finance-chart__axis-label finance-chart__axis-label--x"
              text-anchor="middle"
            >
              {m.month}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// ---------------------------------------------------------------------------
// By-tag breakdown — horizontal bars, one per (tag, type) row
// ---------------------------------------------------------------------------

const ByTagBars: FC<{ byTag: FinanceSummary["byTag"] }> = ({ byTag }) => {
  const rawMax = byTag.reduce((m, r) => Math.max(m, r.total), 0);
  const xMax = niceMax(rawMax);
  const rows = byTag.length;
  const innerH = rows * BY_TAG.rowH + (rows - 1) * BY_TAG.rowGap;
  const totalH = BY_TAG.paddingY * 2 + innerH;
  // Total width is responsive — declared at 100% of container; viewBox uses a
  // canonical 720px coordinate space so labels stay legible at any scale.
  const totalW = 720;
  const barAreaX = BY_TAG.paddingX + BY_TAG.labelW;
  const barAreaW = totalW - barAreaX - BY_TAG.paddingX - BY_TAG.valueW;

  return (
    <svg
      class="finance-chart__svg finance-chart__svg--by-tag"
      viewBox={`0 0 ${totalW} ${totalH}`}
      preserveAspectRatio="xMinYMin meet"
      role="img"
      aria-label="Income and expense totals by tag"
    >
      {byTag.map((row, i) => {
        const y = BY_TAG.paddingY + i * (BY_TAG.rowH + BY_TAG.rowGap);
        const barW = xMax > 0 ? (row.total / xMax) * barAreaW : 0;
        const variant = row.type === "income" ? "income" : "expense";
        return (
          <g key={`${row.tag}-${row.type}`} class="finance-chart__tag-row">
            <text
              x={BY_TAG.paddingX}
              y={y + BY_TAG.rowH / 2}
              class="finance-chart__axis-label finance-chart__axis-label--tag"
              dominant-baseline="middle"
            >
              {`${row.tag} · ${variant}`}
            </text>
            <rect
              x={barAreaX}
              y={y + (BY_TAG.rowH - BY_TAG.barH) / 2}
              width={Math.max(barW, 1)}
              height={BY_TAG.barH}
              class={`finance-chart__bar finance-chart__bar--${variant}`}
            >
              <title>
                {`${row.tag} ${variant} — ${row.total.toLocaleString()}`}
              </title>
            </rect>
            <text
              x={totalW - BY_TAG.paddingX}
              y={y + BY_TAG.rowH / 2}
              class="finance-chart__axis-label finance-chart__axis-label--value"
              text-anchor="end"
              dominant-baseline="middle"
            >
              {row.total.toLocaleString()}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Top-level chart view — two sections, each with its own empty state
// ---------------------------------------------------------------------------

type Props = {
  monthly: FinanceMonthlyTotal[];
  byTag: FinanceSummary["byTag"];
};

export const FinanceChart: FC<Props> = ({ monthly, byTag }) => {
  return (
    <div class="finance-chart">
      <section class="finance-chart__section">
        <header class="finance-chart__header">
          <h2 class="finance-chart__title">Monthly income vs. expense</h2>
          <ul class="finance-chart__legend" aria-hidden="true">
            <li class="finance-chart__legend-item">
              <span class="finance-chart__legend-swatch finance-chart__legend-swatch--income" />
              Income
            </li>
            <li class="finance-chart__legend-item">
              <span class="finance-chart__legend-swatch finance-chart__legend-swatch--expense" />
              Expense
            </li>
          </ul>
        </header>
        {monthly.length === 0
          ? (
            <EmptyState message="No finance entries with a date in the current filter — monthly chart needs dated entries." />
          )
          : (
            <div class="finance-chart__scroll">
              <MonthlyBars monthly={monthly} />
            </div>
          )}
      </section>

      <section class="finance-chart__section">
        <header class="finance-chart__header">
          <h2 class="finance-chart__title">Breakdown by tag</h2>
        </header>
        {byTag.length === 0
          ? <EmptyState message="No finance entries in the current filter." />
          : <ByTagBars byTag={byTag} />}
      </section>
    </div>
  );
};
