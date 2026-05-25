/**
 * Soft-delete acceptance suite — Finance.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerFinanceEntity } from "../../v2/domains/finance/cache.ts";
import { FinanceRepository } from "../../v2/repositories/finance.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Finance",
  table: "finances",
  makeRepo: (dir) => new FinanceRepository(dir),
  registerEntity: (repo) => registerFinanceEntity(repo as FinanceRepository),
  seedTarget: () => ({ title: "To Be Archived", type: "expense", amount: 10 }),
  seedControl: () => ({ title: "Stays Visible", type: "income", amount: 20 }),
});
