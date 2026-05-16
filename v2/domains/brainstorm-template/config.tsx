// BrainstormTemplate domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  BrainstormTemplate,
  CreateBrainstormTemplate,
  UpdateBrainstormTemplate,
} from "../../types/brainstorm-template.types.ts";
import { getBrainstormTemplateService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  BRAINSTORM_TEMPLATE_FORM_FIELDS,
  BRAINSTORM_TEMPLATE_TABLE_COLUMNS,
  brainstormTemplateToRow,
} from "./constants.tsx";
import { BrainstormTemplateCard } from "../../views/components/brainstorm-template-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

function splitQuestions(body: Record<string, string>): string[] {
  const raw = body["questions"] ?? "";
  return String(raw).split("\n").map((q) => q.trim()).filter((q) =>
    q.length > 0
  );
}

export const brainstormTemplateConfig: DomainConfig<
  BrainstormTemplate,
  CreateBrainstormTemplate,
  UpdateBrainstormTemplate
> = {
  name: "brainstorm-templates",
  singular: "Brainstorm Template",
  path: "/brainstorm-templates",
  ssePrefix: "btemplate",
  styles: ["/css/views/brainstorm-templates.css"],
  emptyMessage: "No brainstorm templates yet. Create one to get started.",
  defaultView: "table",

  stateKeys: ["view", "category", "q", "sort", "order"],
  columns: BRAINSTORM_TEMPLATE_TABLE_COLUMNS,
  formFields: BRAINSTORM_TEMPLATE_FORM_FIELDS,

  filters: [],

  toRow: brainstormTemplateToRow,

  Card: ({ item, q }) => <BrainstormTemplateCard item={item} q={q} />,

  parseCreate: (body) => {
    const base = parseFormBody(BRAINSTORM_TEMPLATE_FORM_FIELDS, body) as Record<
      string,
      unknown
    >;
    return {
      ...base,
      questions: splitQuestions(body as Record<string, string>),
    } as CreateBrainstormTemplate;
  },

  parseUpdate: (body) => {
    const base = parseFormBody(BRAINSTORM_TEMPLATE_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Record<string, unknown>;
    return {
      ...base,
      questions: splitQuestions(body as Record<string, string>),
    } as Partial<UpdateBrainstormTemplate>;
  },

  getService: () => getBrainstormTemplateService(),

  searchPredicate: createSearchPredicate<BrainstormTemplate>([
    { type: "string", get: (t) => t.name },
    { type: "string", get: (t) => t.categories?.join(" ") ?? "" },
    { type: "string", get: (t) => t.questions.join(" ") },
  ]),
};
