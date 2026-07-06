// Renders a money rollup value: a single project-currency total when all
// amounts share a currency, or a per-currency breakdown (with a "mixed" hint)
// when they don't. formatCurrency renders one project currency, so a blended
// cross-currency sum would be silently wrong — see utils/money.sumByCurrency.

import type { FC } from "hono/jsx";
import {
  type CurrencySubtotal,
  formatCurrencySubtotal,
  formatMoney,
} from "../../utils/money.ts";

export const MoneyStatValue: FC<{
  totals: { subtotals: CurrencySubtotal[]; mixed: boolean };
}> = ({ totals }) => {
  if (!totals.mixed) {
    return <>{formatMoney(totals.subtotals[0]?.amount ?? 0) || "$0"}</>;
  }
  return (
    <span class="money-mixed" title="Mixed currencies — shown per currency">
      {totals.subtotals.map((s) => (
        <span key={s.currency} class="money-mixed__line">
          {formatCurrencySubtotal(s)}
        </span>
      ))}
    </span>
  );
};
