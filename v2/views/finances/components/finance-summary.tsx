import type { FC } from "hono/jsx";
import type { FinanceSummary } from "../../../types/finance.types.ts";
import { formatCurrency } from "../../../utils/format.ts";

export const FinanceSummaryBanner: FC<{ summary: FinanceSummary }> = (
  { summary },
) => {
  const balance = summary.balance;
  return (
    <div class="finance-summary">
      <div class="finance-summary__tile" data-type="income">
        <span class="finance-summary__label">Income</span>
        <span class="finance-summary__value">
          {formatCurrency(summary.totalIncome, { decimals: 2 })}
        </span>
      </div>
      <div class="finance-summary__tile" data-type="expense">
        <span class="finance-summary__label">Expenses</span>
        <span class="finance-summary__value">
          {formatCurrency(summary.totalExpense, { decimals: 2 })}
        </span>
      </div>
      <div
        class="finance-summary__tile finance-summary__tile--balance"
        data-positive={balance >= 0 ? "true" : "false"}
      >
        <span class="finance-summary__label">Balance</span>
        <span class="finance-summary__value">
          {formatCurrency(balance, { decimals: 2 })}
        </span>
      </div>
    </div>
  );
};
