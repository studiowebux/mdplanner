// Brainstorm domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  Brainstorm,
  CreateBrainstorm,
  UpdateBrainstorm,
} from "../../types/brainstorm.types.ts";
import { getBrainstormService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  BRAINSTORM_FORM_FIELDS,
  BRAINSTORM_TABLE_COLUMNS,
  brainstormToRow,
} from "./constants.tsx";
import { BrainstormCard } from "../../views/components/brainstorm-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const brainstormConfig: DomainConfig<
  Brainstorm,
  CreateBrainstorm,
  UpdateBrainstorm
> = {
  name: "brainstorms",
  singular: "Brainstorm",
  path: "/brainstorms",
  ssePrefix: "brainstorm",
  styles: ["/css/views/brainstorms.css"],
  emptyMessage: "No brainstorms yet. Create one to get started.",
  defaultView: "table",

  stateKeys: ["view", "tag", "q", "sort", "order"],
  columns: BRAINSTORM_TABLE_COLUMNS,
  formFields: BRAINSTORM_FORM_FIELDS,

  filters: [],

  toRow: brainstormToRow,

  Card: ({ item, q }) => <BrainstormCard item={item} q={q} />,

  parseCreate: (body) =>
    parseFormBody(BRAINSTORM_FORM_FIELDS, body) as CreateBrainstorm,

  parseUpdate: (body) =>
    parseFormBody(BRAINSTORM_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateBrainstorm>,

  getService: () => getBrainstormService(),

  searchPredicate: createSearchPredicate<Brainstorm>([
    { type: "string", get: (b) => b.title },
    {
      type: "string",
      get: (b) => b.questions.map((q) => q.question).join(" "),
    },
  ]),
};
