/**
 * Soft-delete acceptance suite — Project Value Board.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerProjectValueBoardEntity } from "../../v2/domains/project-value-board/cache.ts";
import { ProjectValueBoardRepository } from "../../v2/repositories/project-value-board.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "ProjectValueBoard",
  table: "project_value_board",
  filePath: (dir, id) => `${dir}/projectvalue/${id}.md`,
  makeRepo: (dir) => new ProjectValueBoardRepository(dir),
  registerEntity: (repo) =>
    registerProjectValueBoardEntity(repo as ProjectValueBoardRepository),
  seedTarget: () => ({ title: "To Be Archived" }),
  seedControl: () => ({ title: "Stays Visible" }),
});
