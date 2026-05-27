// Project Value Board domain config — drives the factory.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateProjectValueBoard,
  ProjectValueBoard,
  UpdateProjectValueBoard,
} from "../../types/project-value-board.types.ts";
import { PROJECT_VALUE_BOARD_SECTION_KEYS } from "../../types/project-value-board.types.ts";
import { getProjectValueBoardService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  PROJECT_VALUE_BOARD_FORM_FIELDS,
  PROJECT_VALUE_BOARD_TABLE_COLUMNS,
  projectValueBoardToRow,
} from "./constants.tsx";
import { ProjectValueBoardCard } from "../../views/components/project-value-board-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const projectValueBoardConfig: DomainConfig<
  ProjectValueBoard,
  CreateProjectValueBoard,
  UpdateProjectValueBoard
> = {
  name: "project-value",
  singular: "Project Value Board",
  plural: "Project Value Boards",
  path: "/project-value",
  ssePrefix: "project-value-board",
  styles: ["/css/views/project-value-boards.css"],
  emptyMessage: "No project value boards yet. Create one to get started.",
  defaultView: "card",

  // `notes` is edited in-place on the detail page via "Edit Mode".
  // (Section items use the bespoke `quadrant-card__inline-edit` editor.)
  inlineEditFields: ["notes"],

  stateKeys: ["view", "project", "q", "sort", "order"],
  columns: PROJECT_VALUE_BOARD_TABLE_COLUMNS,
  formFields: PROJECT_VALUE_BOARD_FORM_FIELDS,

  filters: [{ name: "project", label: "All projects", options: [] }],

  toRow: projectValueBoardToRow,

  Card: ({ item, q }) => <ProjectValueBoardCard item={item} q={q} />,

  parseCreate: (body) =>
    parseFormBody(
      PROJECT_VALUE_BOARD_FORM_FIELDS,
      body,
    ) as CreateProjectValueBoard,

  parseUpdate: (body) =>
    parseFormBody(PROJECT_VALUE_BOARD_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateProjectValueBoard>,

  getService: () => getProjectValueBoardService(),
  projectField: "project",

  extractFilterOptions: async () => {
    const items = await getProjectValueBoardService().list();
    const projects = [
      ...new Set(
        items.map((b) => b.project).filter(Boolean) as string[],
      ),
    ].sort();
    return { project: projects };
  },

  searchPredicate: createSearchPredicate<ProjectValueBoard>([
    { type: "string", get: (b) => b.title },
    ...PROJECT_VALUE_BOARD_SECTION_KEYS.map((k) => ({
      type: "array" as const,
      get: (b: ProjectValueBoard) => b[k],
    })),
    { type: "string", get: (b) => b.notes },
  ]),
};
