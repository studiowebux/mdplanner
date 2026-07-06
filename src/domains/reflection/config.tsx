// Reflection domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateReflection,
  Reflection,
  UpdateReflection,
} from "../../types/reflection.types.ts";
import {
  getReflectionService,
  getReflectionTemplateService,
} from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  REFLECTION_FORM_FIELDS,
  REFLECTION_PERIOD_OPTIONS,
  REFLECTION_TABLE_COLUMNS,
  reflectionToRow,
} from "./constants.tsx";
import { ReflectionCard } from "../../views/components/reflection-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const reflectionConfig: DomainConfig<
  Reflection,
  CreateReflection,
  UpdateReflection
> = {
  name: "reflections",
  singular: "Reflection",
  plural: "Reflections",
  path: "/reflections",
  ssePrefix: "reflection",
  styles: ["/css/views/reflections.css"],
  emptyMessage: "No reflections yet. Create one to get started.",
  defaultView: "table",

  stateKeys: ["view", "period", "from", "to", "q", "sort", "order"],
  columns: REFLECTION_TABLE_COLUMNS,
  formFields: REFLECTION_FORM_FIELDS,
  // `content` is edited in-place on the detail page via "Edit Mode".
  inlineEditFields: ["content"],

  filters: [
    {
      name: "period",
      label: "All periods",
      options: REFLECTION_PERIOD_OPTIONS,
    },
  ],

  toRow: reflectionToRow,

  Card: ({ item, q }) => <ReflectionCard item={item} q={q} />,

  parseCreate: (body) =>
    parseFormBody(REFLECTION_FORM_FIELDS, body) as CreateReflection,

  parseUpdate: (body) =>
    parseFormBody(REFLECTION_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateReflection>,

  getService: () => getReflectionService(),

  // Edit form: resolve templateId (an ID) to the template name so the
  // autocomplete search input shows the readable label. The hidden input
  // still carries the ID for submit.
  resolveFormValues: async (values) => {
    const resolved = { ...values };
    if (values.templateId) {
      const tpl = await getReflectionTemplateService().getById(
        values.templateId,
      );
      if (tpl) resolved.templateId = tpl.name;
    }
    return resolved;
  },

  extractFilterOptions: async () => {
    const items = await getReflectionService().list();
    const periods = [
      ...new Set(items.map((r) => r.period).filter(Boolean) as string[]),
    ].sort();
    return { period: periods };
  },

  searchPredicate: createSearchPredicate<Reflection>([
    { type: "string", get: (r) => r.title },
    { type: "string", get: (r) => r.content },
  ]),
};
