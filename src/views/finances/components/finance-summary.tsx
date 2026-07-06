import type { FC } from "hono/jsx";
import type { FinanceSummary } from "../../../types/finance.types.ts";
import type { CurrencySubtotal } from "../../../utils/money.ts";
import { MoneyStatValue } from "../../components/money-stat-value.tsx";

type Totals = { subtotals: CurrencySubtotal[]; mixed: boolean };

export const FinanceSummaryBanner: FC<{
  summary: FinanceSummary;
  incomeTotals: Totals;
  expenseTotals: Totals;
  balanceTotals: Totals;
}> = ({ summary, incomeTotals, expenseTotals, balanceTotals }) => {
  return (
    <div class="finance-summary">
      <div class="finance-summary__tile" data-type="income">
        <span class="finance-summary__label">Income</span>
        <span class="finance-summary__value">
          <MoneyStatValue totals={incomeTotals} />
        </span>
      </div>
      <div class="finance-summary__tile" data-type="expense">
        <span class="finance-summary__label">Expenses</span>
        <span class="finance-summary__value">
          <MoneyStatValue totals={expenseTotals} />
        </span>
      </div>
      <div
        class="finance-summary__tile finance-summary__tile--balance"
        data-positive={summary.balance >= 0 ? "true" : "false"}
      >
        <span class="finance-summary__label">Balance</span>
        <span class="finance-summary__value">
          <MoneyStatValue totals={balanceTotals} />
        </span>
      </div>
    </div>
  );
};
