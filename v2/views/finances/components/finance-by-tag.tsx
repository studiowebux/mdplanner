// "By Category" view — groups finance entries by tag with subtotal headers.
// Entries with no tags fall into an "Uncategorized" bucket. Each entry
// contributes once per tag (multi-tag entries appear under every tag), so
// per-group subtotals can exceed the overall total — matches the existing
// `FinanceService.aggregateByTag` convention used by the chart view.

import type { FC } from "hono/jsx";
import type { Finance } from "../../../types/finance.types.ts";
import { FINANCE_TYPE_LABELS } from "../../../types/finance.types.ts";
import {
  badgeClass,
  type BadgeVariant,
} from "../../../components/ui/status-badge.tsx";
import { formatCurrency } from "../../../utils/format.ts";
import { formatDate } from "../../../utils/time.ts";

const TYPE_VARIANTS: Record<string, BadgeVariant> = {
  income: "success",
  expense: "error",
};

const UNCATEGORIZED = "Uncategorized";

type Group = {
  tag: string;
  items: Finance[];
  income: number;
  expense: number;
};

function buildGroups(items: Finance[]): Group[] {
  const map = new Map<string, Group>();
  for (const f of items) {
    const tags = f.tags?.length ? f.tags : [UNCATEGORIZED];
    for (const tag of tags) {
      let g = map.get(tag);
      if (!g) {
        g = { tag, items: [], income: 0, expense: 0 };
        map.set(tag, g);
      }
      g.items.push(f);
      if (f.type === "income") g.income += f.amount;
      else g.expense += f.amount;
    }
  }
  return [...map.values()].sort((a, b) => {
    // Uncategorized always last; rest by net descending.
    if (a.tag === UNCATEGORIZED) return 1;
    if (b.tag === UNCATEGORIZED) return -1;
    return (b.income - b.expense) - (a.income - a.expense);
  });
}

export const FinanceByTag: FC<{ items: Finance[] }> = ({ items }) => {
  const groups = buildGroups(items);
  return (
    <div class="finance-bytag">
      {groups.map((g) => {
        const net = g.income - g.expense;
        return (
          <section key={g.tag} class="finance-bytag__group">
            <header class="finance-bytag__header">
              <h2 class="finance-bytag__title">{g.tag}</h2>
              <div class="finance-bytag__subtotals">
                <span
                  class="finance-bytag__subtotal"
                  data-type="income"
                >
                  <span class="finance-bytag__subtotal-label">Income</span>
                  <span class="finance-bytag__subtotal-value">
                    {formatCurrency(g.income, { decimals: 2 })}
                  </span>
                </span>
                <span
                  class="finance-bytag__subtotal"
                  data-type="expense"
                >
                  <span class="finance-bytag__subtotal-label">Expenses</span>
                  <span class="finance-bytag__subtotal-value">
                    {formatCurrency(g.expense, { decimals: 2 })}
                  </span>
                </span>
                <span
                  class="finance-bytag__subtotal finance-bytag__subtotal--net"
                  data-positive={net >= 0 ? "true" : "false"}
                >
                  <span class="finance-bytag__subtotal-label">Net</span>
                  <span class="finance-bytag__subtotal-value">
                    {formatCurrency(net, { decimals: 2 })}
                  </span>
                </span>
                <span class="finance-bytag__count">
                  {g.items.length} {g.items.length === 1 ? "entry" : "entries"}
                </span>
              </div>
            </header>
            <ul class="finance-bytag__list">
              {g.items.map((f) => (
                <li key={f.id} class="finance-bytag__item">
                  <a
                    href={`/finances/${f.id}`}
                    class="finance-bytag__item-title"
                  >
                    {f.title}
                  </a>
                  <span class={badgeClass(TYPE_VARIANTS, f.type)}>
                    {FINANCE_TYPE_LABELS[f.type]}
                  </span>
                  <span class="finance-bytag__item-amount">
                    {formatCurrency(f.amount, { decimals: 2 })}
                  </span>
                  <span class="finance-bytag__item-date">
                    {f.date ? formatDate(f.date) : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};
