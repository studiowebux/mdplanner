/**
 * Soft-delete acceptance suite — Contact.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerContactEntity } from "../../src/domains/contact/cache.ts";
import { ContactRepository } from "../../src/repositories/contact.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Contact",
  table: "contacts",
  makeRepo: (dir) => new ContactRepository(dir),
  registerEntity: (repo) => registerContactEntity(repo as ContactRepository),
  seedTarget: () => ({ name: "To Be Archived" }),
  seedControl: () => ({ name: "Stays Visible" }),
});
