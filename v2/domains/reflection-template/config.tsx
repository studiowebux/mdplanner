// ReflectionTemplate domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateReflectionTemplate,
  ReflectionTemplate,
  UpdateReflectionTemplate,
} from "../../types/reflection-template.types.ts";
import { getReflectionTemplateService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  REFLECTION_TEMPLATE_FORM_FIELDS,
  REFLECTION_TEMPLATE_TABLE_COLUMNS,
  reflectionTemplateToRow,
} from "./constants.tsx";
import { ReflectionTemplateCard } from "../../views/components/reflection-template-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

function splitPrompts(body: Record<string, string>): string[] {
  const raw = body["prompts"] ?? "";
  return String(raw).split("\n").map((p) => p.trim()).filter((p) =>
    p.length > 0
  );
}

export const reflectionTemplateConfig: DomainConfig<
  ReflectionTemplate,
  CreateReflectionTemplate,
  UpdateReflectionTemplate
> = {
  name: "reflection-templates",
  singular: "Reflection Template",
  path: "/reflection-templates",
  ssePrefix: "rtemplate",
  styles: ["/css/views/reflection-templates.css"],
  emptyMessage: "No reflection templates yet. Create one to get started.",
  defaultView: "table",

  stateKeys: ["view", "category", "period", "q", "sort", "order"],
  columns: REFLECTION_TEMPLATE_TABLE_COLUMNS,
  formFields: REFLECTION_TEMPLATE_FORM_FIELDS,

  filters: [
    {
      name: "period",
      label: "All periods",
      options: [
        { value: "weekly", label: "Weekly" },
        { value: "monthly", label: "Monthly" },
        { value: "quarterly", label: "Quarterly" },
        { value: "annual", label: "Annual" },
      ],
    },
  ],

  toRow: reflectionTemplateToRow,

  Card: ({ item, q }) => <ReflectionTemplateCard item={item} q={q} />,

  parseCreate: (body) => {
    const base = parseFormBody(
      REFLECTION_TEMPLATE_FORM_FIELDS,
      body,
    ) as Record<string, unknown>;
    return {
      ...base,
      prompts: splitPrompts(body as Record<string, string>),
    } as CreateReflectionTemplate;
  },

  parseUpdate: (body) => {
    const base = parseFormBody(REFLECTION_TEMPLATE_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Record<string, unknown>;
    return {
      ...base,
      prompts: splitPrompts(body as Record<string, string>),
    } as Partial<UpdateReflectionTemplate>;
  },

  getService: () => getReflectionTemplateService(),

  searchPredicate: createSearchPredicate<ReflectionTemplate>([
    { type: "string", get: (t) => t.name },
    { type: "string", get: (t) => t.categories?.join(" ") ?? "" },
    { type: "string", get: (t) => t.prompts.join(" ") },
  ]),
};
