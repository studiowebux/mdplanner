// Onboarding domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateOnboarding,
  Onboarding,
  UpdateOnboarding,
} from "../../types/onboarding.types.ts";
import { getOnboardingService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  ONBOARDING_FORM_FIELDS,
  ONBOARDING_TABLE_COLUMNS,
  onboardingToRow,
} from "./constants.tsx";
import { OnboardingCard } from "../../views/components/onboarding-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const onboardingConfig: DomainConfig<
  Onboarding,
  CreateOnboarding,
  UpdateOnboarding
> = {
  name: "onboarding",
  singular: "Onboarding",
  path: "/onboarding",
  ssePrefix: "onboarding",
  styles: ["/css/views/onboarding.css"],
  emptyMessage: "No onboarding records yet. Create one to get started.",
  defaultView: "table",

  stateKeys: ["view", "q", "sort", "order"],
  columns: ONBOARDING_TABLE_COLUMNS,
  formFields: ONBOARDING_FORM_FIELDS,

  toRow: onboardingToRow,

  Card: ({ item, q }) => <OnboardingCard item={item} q={q} />,

  parseCreate: (body) =>
    parseFormBody(ONBOARDING_FORM_FIELDS, body) as CreateOnboarding,

  parseUpdate: (body) =>
    parseFormBody(ONBOARDING_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateOnboarding>,

  getService: () => getOnboardingService(),

  searchPredicate: createSearchPredicate<Onboarding>([
    { type: "string", get: (o) => o.employeeName },
    { type: "string", get: (o) => o.role },
    { type: "string", get: (o) => o.notes ?? "" },
  ]),
};
