/**
 * Soft-delete acceptance suite — Customer.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerCustomerEntity } from "../../src/domains/customer/cache.ts";
import { CustomerRepository } from "../../src/repositories/customer.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Customer",
  table: "customers",
  filePath: (dir, id) => `${dir}/billing/customers/${id}.md`,
  makeRepo: (dir) => new CustomerRepository(dir),
  registerEntity: (repo) => registerCustomerEntity(repo as CustomerRepository),
  seedTarget: () => ({ name: "To Be Archived" }),
  seedControl: () => ({ name: "Stays Visible" }),
});
