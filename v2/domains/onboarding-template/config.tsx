// OnboardingTemplate domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateOnboardingTemplate,
  OnboardingTemplate,
  UpdateOnboardingTemplate,
} from "../../types/onboarding-template.types.ts";
import { getOnboardingTemplateService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  ONBOARDING_TEMPLATE_FORM_FIELDS,
  ONBOARDING_TEMPLATE_TABLE_COLUMNS,
  onboardingTemplateToRow,
} from "./constants.tsx";
import { OnboardingTemplateCard } from "../../views/components/onboarding-template-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const onboardingTemplateConfig: DomainConfig<
  OnboardingTemplate,
  CreateOnboardingTemplate,
  UpdateOnboardingTemplate
> = {
  name: "onboarding-templates",
  singular: "Onboarding Template",
  path: "/onboarding-templates",
  ssePrefix: "onboarding_template",
  styles: ["/css/views/onboarding-templates.css"],
  emptyMessage: "No onboarding templates yet. Create one to get started.",
  defaultView: "table",

  stateKeys: ["view", "q", "sort", "order"],
  columns: ONBOARDING_TEMPLATE_TABLE_COLUMNS,
  formFields: ONBOARDING_TEMPLATE_FORM_FIELDS,

  toRow: onboardingTemplateToRow,

  Card: ({ item, q }) => <OnboardingTemplateCard item={item} q={q} />,

  parseCreate: (body) =>
    parseFormBody(
      ONBOARDING_TEMPLATE_FORM_FIELDS,
      body,
    ) as CreateOnboardingTemplate,

  parseUpdate: (body) =>
    parseFormBody(ONBOARDING_TEMPLATE_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateOnboardingTemplate>,

  getService: () => getOnboardingTemplateService(),

  searchPredicate: createSearchPredicate<OnboardingTemplate>([
    { type: "string", get: (t) => t.name },
    { type: "string", get: (t) => t.role ?? "" },
    { type: "string", get: (t) => t.tags?.join(" ") ?? "" },
    { type: "string", get: (t) => t.steps.map((s) => s.title).join(" ") },
  ]),
};
