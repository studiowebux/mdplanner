/**
 * Soft-delete acceptance suite — People.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerPeopleEntity } from "../../v2/domains/people/cache.ts";
import { PeopleRepository } from "../../v2/repositories/people.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "People",
  table: "people",
  makeRepo: (dir) => new PeopleRepository(dir),
  registerEntity: (repo) => registerPeopleEntity(repo as PeopleRepository),
  seedTarget: () => ({ name: "Archived Person" }),
  seedControl: () => ({ name: "Active Person" }),
});
