/**
 * Soft-delete acceptance suite — Meeting.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerMeetingEntity } from "../../src/domains/meeting/cache.ts";
import { MeetingRepository } from "../../src/repositories/meeting.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Meeting",
  table: "meetings",
  makeRepo: (dir) => new MeetingRepository(dir),
  registerEntity: (repo) => registerMeetingEntity(repo as MeetingRepository),
  seedTarget: () => ({ title: "To Be Archived", date: "2026-05-25" }),
  seedControl: () => ({ title: "Stays Visible", date: "2026-05-25" }),
});
