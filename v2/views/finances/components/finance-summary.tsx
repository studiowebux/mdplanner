import type { FC } from "hono/jsx";
import type { FinanceSummary } from "../../../types/finance.types.ts";

export const FinanceSummaryBanner: FC<{ summary: FinanceSummary }> = (
  { summary },
) => {
  const balance = summary.balance;
  return (
    <div class="finance-summary">
      <div class="finance-summary__tile" data-type="income">
        <span class="finance-summary__label">Income</span>
        <span class="finance-summary__value">
          {summary.totalIncome.toLocaleString()}
        </span>
      </div>
      <div class="finance-summary__tile" data-type="expense">
        <span class="finance-summary__label">Expenses</span>
        <span class="finance-summary__value">
          {summary.totalExpense.toLocaleString()}
        </span>
      </div>
      <div
        class="finance-summary__tile finance-summary__tile--balance"
        data-positive={balance >= 0 ? "true" : "false"}
      >
        <span class="finance-summary__label">Balance</span>
        <span class="finance-summary__value">
          {balance.toLocaleString()}
        </span>
      </div>
    </div>
  );
};
