/**
 * Soft-delete acceptance suite — Fishbone.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 * Custom serialize() — archive guard preserves archived/_at/_by.
 */

import { registerFishboneEntity } from "../../src/domains/fishbone/cache.ts";
import { FishboneRepository } from "../../src/repositories/fishbone.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Fishbone",
  table: "fishbone",
  makeRepo: (dir) => new FishboneRepository(dir),
  registerEntity: (repo) => registerFishboneEntity(repo as FishboneRepository),
  seedTarget: () => ({
    title: "To Be Archived",
    causes: [{ section: "Process", items: ["a"] }],
  }),
  seedControl: () => ({
    title: "Stays Visible",
    causes: [{ section: "People", items: ["b"] }],
  }),
});
