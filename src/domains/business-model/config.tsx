// Business Model Canvas domain config — drives the factory.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  BusinessModel,
  CreateBusinessModel,
  UpdateBusinessModel,
} from "../../types/business-model.types.ts";
import { BUSINESS_MODEL_SECTION_KEYS } from "../../types/business-model.types.ts";
import { getBusinessModelService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  BUSINESS_MODEL_FORM_FIELDS,
  BUSINESS_MODEL_TABLE_COLUMNS,
  businessModelToRow,
} from "./constants.tsx";
import { BusinessModelCard } from "../../views/components/business-model-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const businessModelConfig: DomainConfig<
  BusinessModel,
  CreateBusinessModel,
  UpdateBusinessModel
> = {
  name: "business-models",
  singular: "Business Model Canvas",
  plural: "Business Model Canvases",
  path: "/business-models",
  ssePrefix: "business-model",
  styles: ["/css/views/business-model.css"],
  emptyMessage: "No business model canvases yet. Create one to get started.",
  defaultView: "card",

  stateKeys: ["view", "project", "q", "sort", "order"],
  columns: BUSINESS_MODEL_TABLE_COLUMNS,
  formFields: BUSINESS_MODEL_FORM_FIELDS,
  // `notes` is edited in-place on the detail page via "Edit Mode".
  // Quadrant sections use their own inline section editor (see routes).
  inlineEditFields: ["notes"],

  filters: [{ name: "project", label: "All projects", options: [] }],

  toRow: businessModelToRow,

  Card: ({ item, q }) => <BusinessModelCard item={item} q={q} />,

  parseCreate: (body) =>
    parseFormBody(BUSINESS_MODEL_FORM_FIELDS, body) as CreateBusinessModel,

  parseUpdate: (body) =>
    parseFormBody(BUSINESS_MODEL_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateBusinessModel>,

  getService: () => getBusinessModelService(),
  projectField: "project",

  extractFilterOptions: async () => {
    const items = await getBusinessModelService().list();
    const projects = [
      ...new Set(
        items.map((b) => b.project).filter(Boolean) as string[],
      ),
    ].sort();
    return { project: projects };
  },

  searchPredicate: createSearchPredicate<BusinessModel>([
    { type: "string", get: (b) => b.title },
    ...BUSINESS_MODEL_SECTION_KEYS.map((k) => ({
      type: "array" as const,
      get: (b: BusinessModel) => b[k],
    })),
    { type: "string", get: (b) => b.notes },
  ]),
};
