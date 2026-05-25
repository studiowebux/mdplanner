/**
 * Soft-delete acceptance suite — Invoice.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerInvoiceEntity } from "../../v2/domains/invoice/cache.ts";
import { InvoiceRepository } from "../../v2/repositories/invoice.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Invoice",
  table: "invoices",
  filePath: (dir, id) => `${dir}/billing/invoices/${id}.md`,
  makeRepo: (dir) => new InvoiceRepository(dir),
  registerEntity: (repo) => registerInvoiceEntity(repo as InvoiceRepository),
  seedTarget: () => ({
    title: "To Be Archived",
    customerId: "customer_x",
    lineItems: [],
  }),
  seedControl: () => ({
    title: "Stays Visible",
    customerId: "customer_y",
    lineItems: [],
  }),
});
