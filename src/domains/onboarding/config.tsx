// Onboarding domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreateOnboarding,
  Onboarding,
  OnboardingStep,
  UpdateOnboarding,
} from "../../types/onboarding.types.ts";
import {
  getOnboardingService,
  getOnboardingTemplateService,
  getPeopleService,
} from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  ONBOARDING_FORM_FIELDS,
  ONBOARDING_TABLE_COLUMNS,
  onboardingToRow,
} from "./constants.tsx";
import { OnboardingCard } from "../../views/components/onboarding-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

// Normalize parsed steps: backfill missing id (new rows) + default status.
// Form rows have hidden id for existing steps; new rows arrive with no id.
function normalizeSteps(raw: unknown): OnboardingStep[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((r) => {
    const s = r as Record<string, unknown>;
    return {
      id: s.id ? String(s.id) : crypto.randomUUID().slice(0, 8),
      title: String(s.title ?? ""),
      category: (s.category ? String(s.category) : "other") as OnboardingStep[
        "category"
      ],
      status: (s.status ? String(s.status) : "not_started") as OnboardingStep[
        "status"
      ],
      owner: s.owner != null && String(s.owner).length > 0
        ? String(s.owner)
        : undefined,
    };
  }).filter((s) => s.title.length > 0);
}

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

  // `notes` is edited in-place on the detail page via "Edit Mode".
  // (Step titles use their own always-on inline editor — bespoke exception.)
  inlineEditFields: ["notes"],

  stateKeys: ["view", "q", "sort", "order"],
  columns: ONBOARDING_TABLE_COLUMNS,
  formFields: ONBOARDING_FORM_FIELDS,

  assigneeField: "personId",
  assigneeIsId: true,

  toRow: onboardingToRow,

  Card: ({ item, q }) => <OnboardingCard item={item} q={q} />,

  parseCreate: (body) => {
    const parsed = parseFormBody(
      ONBOARDING_FORM_FIELDS,
      body,
    ) as CreateOnboarding & { steps?: unknown; templateId?: unknown };
    const steps = normalizeSteps(parsed.steps);
    // templateId is a UI-only seed selector — steps are copied, not linked.
    delete (parsed as Record<string, unknown>).templateId;
    return { ...parsed, steps: steps ?? [] } as CreateOnboarding;
  },

  parseUpdate: (body) => {
    const parsed = parseFormBody(ONBOARDING_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateOnboarding> & { steps?: unknown; templateId?: unknown };
    const out: Partial<UpdateOnboarding> = { ...parsed };
    delete (out as Record<string, unknown>).templateId;
    if ("steps" in parsed) {
      out.steps = normalizeSteps(parsed.steps) ?? [];
    }
    return out;
  },

  // Populate the "Seed from template" selector with available templates.
  extractFormOptions: async () => {
    const templates = await getOnboardingTemplateService().list();
    return {
      templateId: [
        { value: "", label: "— None (enter steps manually) —" },
        ...templates.map((t) => ({ value: t.id, label: t.name })),
      ],
    };
  },

  resolveFormValues: async (values) => {
    const resolved = { ...values };
    if (values.personId) {
      const person = await getPeopleService().getById(values.personId);
      if (person) resolved.personId = person.name;
    }
    return resolved;
  },

  getService: () => getOnboardingService(),

  searchPredicate: createSearchPredicate<Onboarding>([
    { type: "string", get: (o) => o.employeeName },
    { type: "string", get: (o) => o.role },
    { type: "string", get: (o) => o.notes ?? "" },
  ]),
};
