/**
 * Soft-delete acceptance suite — Company.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerCompanyEntity } from "../../src/domains/company/cache.ts";
import { CompanyRepository } from "../../src/repositories/company.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Company",
  table: "companies",
  makeRepo: (dir) => new CompanyRepository(dir),
  registerEntity: (repo) => registerCompanyEntity(repo as CompanyRepository),
  seedTarget: () => ({ name: "To Be Archived" }),
  seedControl: () => ({ name: "Stays Visible" }),
});
