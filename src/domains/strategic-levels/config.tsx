// Strategic Levels domain config — drives factory routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateStrategicLevelsBuilder,
  StrategicLevelsBuilder,
  UpdateStrategicLevelsBuilder,
} from "../../types/strategic-levels.types.ts";
import { getStrategicLevelsService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  STRATEGIC_LEVELS_FORM_FIELDS,
  STRATEGIC_LEVELS_TABLE_COLUMNS,
  strategicLevelsToRow,
} from "./constants.tsx";
import { StrategicLevelsCard } from "../../views/components/strategic-levels-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const strategicLevelsConfig: DomainConfig<
  StrategicLevelsBuilder,
  CreateStrategicLevelsBuilder,
  UpdateStrategicLevelsBuilder
> = {
  name: "strategic-levels",
  singular: "Strategic Levels",
  plural: "Strategic Levels",
  path: "/strategic-levels",
  ssePrefix: "strategic-levels",
  styles: ["/css/views/strategic-levels.css"],
  emptyMessage: "No strategic level builders yet. Create one to get started.",
  defaultView: "table",

  stateKeys: ["view", "q", "sort", "order"],
  columns: STRATEGIC_LEVELS_TABLE_COLUMNS,
  formFields: STRATEGIC_LEVELS_FORM_FIELDS,

  filters: [],

  toRow: strategicLevelsToRow,

  Card: ({ item, q }) => <StrategicLevelsCard item={item} q={q} />,

  parseCreate: (body) =>
    parseFormBody(
      STRATEGIC_LEVELS_FORM_FIELDS,
      body,
    ) as CreateStrategicLevelsBuilder,

  parseUpdate: (body) =>
    parseFormBody(STRATEGIC_LEVELS_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateStrategicLevelsBuilder>,

  getService: () => getStrategicLevelsService(),

  searchPredicate: createSearchPredicate<StrategicLevelsBuilder>([
    { type: "string", get: (b) => b.title },
  ]),
};
