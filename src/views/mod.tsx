// SSR view router — mounts all view routers. Add new domains here.
// Each domain owns its routes file under views/<domain>/routes.tsx.

import { Hono } from "hono";
import { identityRouter } from "./identity/routes.tsx";
import { dnsRouter } from "./dns/routes.tsx";
import { goalsRouter as goalsViewRouter } from "./goals/routes.tsx";
import { ideasRouter } from "./ideas/routes.tsx";
import { homeViewRouter } from "./home/routes.tsx";
import { milestonesRouter } from "./milestones/routes.tsx";
import { peopleRouter } from "./people/routes.tsx";
import { notesRouter as notesViewRouter } from "./notes/routes.tsx";
import { tasksRouter } from "./tasks/routes.tsx";
import { settingsViewRouter } from "./settings/routes.tsx";
import { cerveauViewRouter } from "./cerveau/routes.tsx";
import { portfolioRouter } from "./portfolio/routes.tsx";
import { githubSummaryRouter } from "./github-summary/routes.tsx";
import { searchRouter } from "./search/routes.tsx";
import { sidebarRouter } from "./sidebar/routes.tsx";
import { autocompleteRouter } from "./autocomplete/routes.ts";
import { billingRatesRouter } from "./billing-rates/routes.tsx";
import { contactsRouter } from "./contacts/routes.tsx";
import { companiesRouter } from "./companies/routes.tsx";
import { dealsRouter } from "./deals/routes.tsx";
import { financesRouter } from "./finances/routes.tsx";
import { customersRouter } from "./customers/routes.tsx";
import { invoicesRouter } from "./invoices/routes.tsx";
import { paymentsRouter } from "./payments/routes.tsx";
import { quotesRouter } from "./quotes/routes.tsx";
import { marketingPlansRouter } from "./marketing-plans/routes.tsx";
import { swotRouter } from "./swot/routes.tsx";
import { moscowRouter } from "./moscow/routes.tsx";
import { eisenhowerRouter } from "./eisenhower/routes.tsx";
import { mindmapRouter } from "./mindmaps/routes.tsx";
import { fishboneRouter } from "./fishbones/routes.tsx";
import { businessModelRouter } from "./business-models/routes.tsx";
import { habitRouter } from "./habits/routes.tsx";
import { journalRouter } from "./journal/routes.tsx";
import { reflectionRouter } from "./reflections/routes.tsx";
import { riskRouter } from "./risks/routes.tsx";
import { vacationRouter } from "./vacation/routes.tsx";
import { investorRouter } from "./investors/routes.tsx";
import { safeRouter } from "./safe/routes.tsx";
import { projectValueBoardRouter } from "./project-value-boards/routes.tsx";
import { strategicLevelsRouter } from "./strategic-levels/routes.tsx";
import { c4Router } from "./c4/routes.tsx";
import { brainstormsRouter } from "./brainstorms/routes.tsx";
import { brainstormTemplatesRouter } from "./brainstorm-templates/routes.tsx";
import { reflectionTemplatesRouter } from "./reflection-templates/routes.tsx";
import { onboardingRouter } from "./onboarding/routes.tsx";
import { onboardingTemplatesRouter } from "./onboarding-templates/routes.tsx";
import { briefsRouter } from "./briefs/routes.tsx";
import { retrospectivesRouter } from "./retrospectives/routes.tsx";
import { meetingsRouter as meetingsViewRouter } from "./meetings/routes.tsx";
import { leanCanvasesRouter } from "./lean-canvases/routes.tsx";
import { stickyNotesRouter } from "./sticky-notes/routes.tsx";
import { capacityPlansViewRouter } from "./capacity-plans/routes.tsx";
import { timeEntriesRouter } from "./time-entries/routes.tsx";
import { analyticsViewRouter } from "./analytics/routes.tsx";
import { uploadsRouter } from "./uploads/routes.tsx";
import { meRouter } from "./me/routes.tsx";
import {
  getArrayTableSection,
  registerArrayTableSection,
} from "../components/ui/array-table-registry.ts";
import { ArrayTableRow } from "../components/ui/form-builder.tsx";
import { BRAINSTORM_FORM_FIELDS } from "../domains/brainstorm/constants.tsx";
import { INVOICE_FORM_FIELDS } from "../domains/invoice/constants.tsx";
import { MKTPLAN_FORM_FIELDS } from "../domains/marketing-plan/constants.tsx";
import { ONBOARDING_FORM_FIELDS } from "../domains/onboarding/constants.tsx";
import { ONBOARDING_TEMPLATE_FORM_FIELDS } from "../domains/onboarding-template/constants.tsx";
import { REFLECTION_TEMPLATE_FORM_FIELDS } from "../domains/reflection-template/constants.tsx";
import { MEETING_FORM_FIELDS } from "../domains/meeting/constants.tsx";
import { PORTFOLIO_FORM_FIELDS } from "../domains/portfolio/config.tsx";
import { QUOTE_FORM_FIELDS } from "../domains/quote/constants.tsx";
import { PEOPLE_FORM_FIELDS } from "../domains/people/config.tsx";
import { SETTINGS_FORM_FIELDS } from "./settings/tabs/shortcuts-tab.tsx";
import type { FieldDef } from "../components/ui/form-builder.tsx";
import type { AppVariables } from "../types/app.ts";
// Autocomplete sources register themselves on import (side effect).
import "./autocomplete/sources.ts";

export const views = new Hono<{ Variables: AppVariables }>();

views.route("/identity", identityRouter);
views.route("/", homeViewRouter);
views.route("/billing-rates", billingRatesRouter);
views.route("/contacts", contactsRouter);
views.route("/companies", companiesRouter);
views.route("/deals", dealsRouter);
views.route("/finances", financesRouter);
views.route("/habits", habitRouter);
views.route("/journal", journalRouter);
views.route("/reflections", reflectionRouter);
views.route("/customers", customersRouter);
views.route("/invoices", invoicesRouter);
views.route("/payments", paymentsRouter);
views.route("/quotes", quotesRouter);
views.route("/dns", dnsRouter);
views.route("/goals", goalsViewRouter);
views.route("/ideas", ideasRouter);
views.route("/milestones", milestonesRouter);
views.route("/notes", notesViewRouter);
views.route("/people", peopleRouter);
views.route("/portfolio", portfolioRouter);
views.route("/tasks", tasksRouter);
views.route("/github", githubSummaryRouter);
views.route("/settings", settingsViewRouter);
views.route("/cerveau", cerveauViewRouter);
views.route("/search", searchRouter);
views.route("/marketing-plans", marketingPlansRouter);
views.route("/swot", swotRouter);
views.route("/moscow", moscowRouter);
views.route("/eisenhower", eisenhowerRouter);
views.route("/mindmaps", mindmapRouter);
views.route("/fishbones", fishboneRouter);
views.route("/business-models", businessModelRouter);
views.route("/risks", riskRouter);
views.route("/vacation", vacationRouter);
views.route("/investors", investorRouter);
views.route("/safe", safeRouter);
views.route("/project-value", projectValueBoardRouter);
views.route("/strategic-levels", strategicLevelsRouter);
views.route("/c4", c4Router);
views.route("/brainstorms", brainstormsRouter);
views.route("/brainstorm-templates", brainstormTemplatesRouter);
views.route("/reflection-templates", reflectionTemplatesRouter);
views.route("/onboarding", onboardingRouter);
views.route("/onboarding-templates", onboardingTemplatesRouter);
views.route("/briefs", briefsRouter);
views.route("/retrospectives", retrospectivesRouter);
views.route("/meetings", meetingsViewRouter);
views.route("/lean-canvases", leanCanvasesRouter);
views.route("/sticky-notes", stickyNotesRouter);
views.route("/capacity-plans", capacityPlansViewRouter);
views.route("/time-entries", timeEntriesRouter);
views.route("/analytics", analyticsViewRouter);
views.route("/uploads", uploadsRouter);
views.route("/me", meRouter);
views.route("/autocomplete", autocompleteRouter);
views.route("/sidebar", sidebarRouter);

// Register array-table sections for server-rendered row fragments.
for (
  const fields of [
    MKTPLAN_FORM_FIELDS,
    MEETING_FORM_FIELDS,
    QUOTE_FORM_FIELDS,
    INVOICE_FORM_FIELDS,
    BRAINSTORM_FORM_FIELDS,
    PORTFOLIO_FORM_FIELDS,
    PEOPLE_FORM_FIELDS,
    ONBOARDING_FORM_FIELDS,
    ONBOARDING_TEMPLATE_FORM_FIELDS,
    REFLECTION_TEMPLATE_FORM_FIELDS,
    SETTINGS_FORM_FIELDS,
  ]
) {
  for (const field of fields) {
    if ((field as FieldDef & { type: string }).type === "array-table") {
      const f = field as Extract<FieldDef, { type: "array-table" }>;
      registerArrayTableSection(f.section, f.itemFields);
    }
  }
}

// Array-table: return a single empty row fragment for the "Add" button.
// Uses a timestamp-based index to guarantee uniqueness regardless of row removals.
views.get("/forms/array-row/:section", (c) => {
  const section = c.req.param("section");
  const itemFields = getArrayTableSection(section);
  if (!itemFields) return c.notFound();
  const idx = Date.now();
  return c.html(
    <ArrayTableRow section={section} idx={idx} itemFields={itemFields} />,
  );
});
