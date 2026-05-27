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

/**
 * Flatten parseFormBody's array-table output (`Array<{ text: string }>`) back
 * into the entity's `string[]` shape. Trims and drops empty rows.
 */
function flattenPrompts(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) =>
      row && typeof row === "object"
        ? String((row as Record<string, unknown>).text ?? "")
        : String(row)
    )
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
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

  // `description` is edited in-place on the detail page via "Edit Mode".
  inlineEditFields: ["description"],

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
      prompts: flattenPrompts(base.prompts),
    } as CreateReflectionTemplate;
  },

  parseUpdate: (body) => {
    const base = parseFormBody(REFLECTION_TEMPLATE_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Record<string, unknown>;
    return {
      ...base,
      prompts: flattenPrompts(base.prompts),
    } as Partial<UpdateReflectionTemplate>;
  },

  // Reshape `prompts: string[]` into the wire shape `array-table` expects
  // (`[{ text: "..." }, ...]` JSON-stringified) for the edit form. Keeps the
  // public entity shape unchanged across types/repo/cache/MCP/API.
  formValueOverrides: (item) => ({
    prompts: JSON.stringify(
      (item.prompts ?? []).map((text) => ({ text })),
    ),
  }),

  getService: () => getReflectionTemplateService(),

  searchPredicate: createSearchPredicate<ReflectionTemplate>([
    { type: "string", get: (t) => t.name },
    { type: "string", get: (t) => t.categories?.join(" ") ?? "" },
    { type: "string", get: (t) => t.prompts.join(" ") },
  ]),
};
