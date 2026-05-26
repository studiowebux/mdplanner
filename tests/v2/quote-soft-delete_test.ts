/**
 * Soft-delete acceptance suite — Quote.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerQuoteEntity } from "../../v2/domains/quote/cache.ts";
import { QuoteRepository } from "../../v2/repositories/quote.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Quote",
  table: "quotes",
  filePath: (dir, id) => `${dir}/billing/quotes/${id}.md`,
  makeRepo: (dir) => new QuoteRepository(dir),
  registerEntity: (repo) => registerQuoteEntity(repo as QuoteRepository),
  seedTarget: () => ({
    customerId: "cust_a",
    title: "To Be Archived",
  }),
  seedControl: () => ({
    customerId: "cust_b",
    title: "Stays Visible",
  }),
});
