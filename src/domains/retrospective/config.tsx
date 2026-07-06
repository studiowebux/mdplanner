// Retrospective domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateRetrospective,
  Retrospective,
  UpdateRetrospective,
} from "../../types/retrospective.types.ts";
import { getRetrospectiveService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  RETROSPECTIVE_FORM_FIELDS,
  RETROSPECTIVE_TABLE_COLUMNS,
  retrospectiveToRow,
} from "./constants.tsx";
import { RetrospectiveCard } from "../../views/components/retrospective-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const retrospectiveConfig: DomainConfig<
  Retrospective,
  CreateRetrospective,
  UpdateRetrospective
> = {
  name: "retrospectives",
  singular: "Retrospective",
  path: "/retrospectives",
  ssePrefix: "retrospective",
  styles: ["/css/views/retrospectives.css"],
  emptyMessage: "No retrospectives yet. Create one to get started.",
  defaultView: "table",

  stateKeys: ["view", "q", "sort", "order", "status"],
  columns: RETROSPECTIVE_TABLE_COLUMNS,
  formFields: RETROSPECTIVE_FORM_FIELDS,

  filters: [
    {
      name: "status",
      label: "Status",
      options: [
        { value: "open", label: "Open" },
        { value: "closed", label: "Closed" },
      ],
    },
  ],

  toRow: retrospectiveToRow,

  Card: ({ item, q }) => <RetrospectiveCard item={item} q={q} />,

  parseCreate: (body) =>
    parseFormBody(RETROSPECTIVE_FORM_FIELDS, body) as CreateRetrospective,

  parseUpdate: (body) =>
    parseFormBody(RETROSPECTIVE_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateRetrospective>,

  getService: () => getRetrospectiveService(),

  searchPredicate: createSearchPredicate<Retrospective>([
    { type: "string", get: (r) => r.title },
    { type: "array", get: (r) => r.continue },
    { type: "array", get: (r) => r.stop },
    { type: "array", get: (r) => r.start },
  ]),
};
