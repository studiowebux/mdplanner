/**
 * Soft-delete acceptance suite — Vacation.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import {
  registerVacationEntity,
  VACATION_TABLE,
} from "../../v2/domains/vacation/cache.ts";
import { VacationRepository } from "../../v2/repositories/vacation.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Vacation",
  table: VACATION_TABLE,
  makeRepo: (dir) => new VacationRepository(dir),
  registerEntity: (repo) => registerVacationEntity(repo as VacationRepository),
  seedTarget: () => ({
    personId: "person_target",
    startDate: "2026-07-01",
    endDate: "2026-07-05",
    type: "vacation" as const,
    status: "pending" as const,
  }),
  seedControl: () => ({
    personId: "person_control",
    startDate: "2026-08-01",
    endDate: "2026-08-03",
    type: "vacation" as const,
    status: "approved" as const,
  }),
});
