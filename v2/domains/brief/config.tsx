// Brief domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  Brief,
  CreateBrief,
  UpdateBrief,
} from "../../types/brief.types.ts";
import { getBriefService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  BRIEF_FORM_FIELDS,
  BRIEF_TABLE_COLUMNS,
  briefToRow,
} from "./constants.tsx";
import { BriefCard } from "../../views/components/brief-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const briefConfig: DomainConfig<Brief, CreateBrief, UpdateBrief> = {
  name: "briefs",
  singular: "Brief",
  path: "/briefs",
  ssePrefix: "brief",
  styles: ["/css/views/briefs.css"],
  emptyMessage: "No briefs yet. Create one to get started.",
  defaultView: "table",

  stateKeys: ["view", "q", "sort", "order"],
  columns: BRIEF_TABLE_COLUMNS,
  formFields: BRIEF_FORM_FIELDS,

  filters: [],

  toRow: briefToRow,

  Card: ({ item, q }) => <BriefCard item={item} q={q} />,

  parseCreate: (body) => parseFormBody(BRIEF_FORM_FIELDS, body) as CreateBrief,

  parseUpdate: (body) =>
    parseFormBody(BRIEF_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateBrief>,

  getService: () => getBriefService(),

  searchPredicate: createSearchPredicate<Brief>([
    { type: "string", get: (b) => b.title },
    { type: "array", get: (b) => b.summary },
    { type: "array", get: (b) => b.mission },
  ]),
};
