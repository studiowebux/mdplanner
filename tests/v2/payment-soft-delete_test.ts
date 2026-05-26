/**
 * Soft-delete acceptance suite — Payment.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerPaymentEntity } from "../../v2/domains/payment/cache.ts";
import { PaymentRepository } from "../../v2/repositories/payment.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Payment",
  table: "payments",
  // Repo directory is "billing/payments"; table is "payments" — override.
  filePath: (dir, id) => `${dir}/billing/payments/${id}.md`,
  makeRepo: (dir) => new PaymentRepository(dir),
  registerEntity: (repo) => registerPaymentEntity(repo as PaymentRepository),
  seedTarget: () => ({
    invoiceId: "invoice_target",
    amount: 100,
    date: "2026-05-25",
  }),
  seedControl: () => ({
    invoiceId: "invoice_control",
    amount: 200,
    date: "2026-05-25",
  }),
});
