export const APP_NAME = "MDPlanner";
export const APP_VERSION = "2.0.0-alpha";
export const DEFAULT_PORT = 8003;

/**
 * Default display order for task board sections in summary views.
 * Sections discovered on disk that are not in this list appear after these.
 */
export const SECTION_DISPLAY_ORDER = [
  "Backlog",
  "Todo",
  "In Progress",
  "Pending Review",
  "Done",
] as const;

let _sectionOrder: readonly string[] = SECTION_DISPLAY_ORDER;

/** Set section order from project config. Call once after boot. */
export function setSectionOrder(order: string[]): void {
  _sectionOrder = order;
}

/** Get the active section display order (project config or default). */
export function getSectionOrder(): readonly string[] {
  return _sectionOrder;
}

export const WEEKDAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

/** The section name that represents completed tasks. */
export const DONE_SECTION = "Done" as const;

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  task: "Task",
  note: "Note",
  goal: "Goal",
  milestone: "Milestone",
  idea: "Idea",
  brainstorm: "Brainstorm",
  reflection_template: "Reflection Template",
  reflection: "Reflection",
  retrospective: "Retrospective",
  sticky_note: "Sticky Note",
  mindmap: "Mindmap",
  c4_component: "C4 Component",
  swot: "SWOT",
  risk: "Risk",
  lean_canvas: "Lean Canvas",
  business_model: "Business Model",
  project_value: "Project Value",
  brief: "Brief",
  capacity_plan: "Capacity Plan",
  strategic_builder: "Strategic Builder",
  customer: "Customer",
  rate: "Rate",
  quote: "Quote",
  invoice: "Invoice",
  company: "Company",
  contact: "Contact",
  deal: "Deal",
  interaction: "Interaction",
  portfolio: "Portfolio",
  person: "Person",
  org_member: "Org Member",
  meeting: "Meeting",
  moscow: "MoSCoW",
  eisenhower: "Eisenhower",
  safe_agreement: "SAFe Agreement",
  investor: "Investor",
  kpi_snapshot: "KPI Snapshot",
  onboarding: "Onboarding",
  onboarding_template: "Onboarding Template",
  financial_period: "Financial Period",
  payment: "Payment",
  time_entry: "Time Entry",
  journal: "Journal",
  habit: "Habit",
  dns_domain: "DNS Domain",
  fishbone: "Fishbone",
  marketing_plan: "Marketing Plan",
};

/**
 * Default sidebar navigation categories — used when project.md has no
 * nav_categories field. Insertion order defines display order.
 * Keys not listed here fall into "Other".
 */
export const DEFAULT_NAV_CATEGORIES: Record<string, string[]> = {
  Work: ["task", "milestone", "goal"],
  Planning: [
    "idea",
    "brainstorm",
    "brief",
    "reflection",
    "reflection_template",
    "retrospective",
  ],
  Prioritization: ["moscow", "eisenhower"],
  Strategy: [
    "swot",
    "risk",
    "lean_canvas",
    "business_model",
    "project_value",
    "strategic_builder",
    "fishbone",
    "marketing_plan",
  ],
  Finances: [
    "invoice",
    "quote",
    "rate",
    "payment",
    "customer",
    "investor",
    "financial_period",
    "kpi_snapshot",
  ],
  CRM: ["company", "contact", "deal", "interaction"],
  Team: [
    "person",
    "org_member",
    "meeting",
    "capacity_plan",
    "time_entry",
    "onboarding",
    "onboarding_template",
    "safe_agreement",
  ],
  Notes: ["note", "journal", "habit"],
  Diagrams: ["sticky_note", "mindmap", "c4_component"],
  Portfolio: ["portfolio"],
  Infrastructure: ["dns_domain"],
};

// -- Nav link types and builders ------------------------------------------

export type NavLink = { key: string; href: string; label: string };
export type CategoryGroup = { name: string; links: NavLink[] };

/** Build sorted nav links from enabled feature keys. */
export function buildNavLinks(enabledFeatures: string[]): NavLink[] {
  return enabledFeatures
    .filter((key) => ENTITY_TYPE_ROUTES[key] && ENTITY_TYPE_LABELS[key])
    .map((key) => ({
      key,
      href: ENTITY_TYPE_ROUTES[key],
      label: ENTITY_TYPE_LABELS[key],
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Group nav links into ordered categories. Uncategorized keys go to "Other". */
export function groupByCategory(
  links: NavLink[],
  categories: Record<string, string[]> = DEFAULT_NAV_CATEGORIES,
): CategoryGroup[] {
  const keyToCategory: Record<string, string> = {};
  for (const [category, keys] of Object.entries(categories)) {
    for (const key of keys) {
      keyToCategory[key] = category;
    }
  }

  const groups: Record<string, NavLink[]> = {};
  const uncategorized: NavLink[] = [];

  for (const link of links) {
    const cat = keyToCategory[link.key];
    if (cat) {
      (groups[cat] ??= []).push(link);
    } else {
      uncategorized.push(link);
    }
  }

  const ordered: CategoryGroup[] = [];
  for (const name of Object.keys(categories)) {
    if (groups[name]?.length) {
      ordered.push({ name, links: groups[name] });
    }
  }
  if (uncategorized.length) {
    ordered.push({ name: "Other", links: uncategorized });
  }
  return ordered;
}

/** Maps entity FTS type to the URL path prefix for that domain's list view. */
export const ENTITY_TYPE_ROUTES: Record<string, string> = {
  task: "/tasks",
  note: "/notes",
  goal: "/goals",
  milestone: "/milestones",
  idea: "/ideas",
  brainstorm: "/brainstorms",
  reflection_template: "/reflection-templates",
  reflection: "/reflections",
  retrospective: "/retrospectives",
  sticky_note: "/sticky-notes",
  mindmap: "/mindmaps",
  c4_component: "/c4",
  swot: "/swot",
  risk: "/risks",
  lean_canvas: "/lean-canvases",
  business_model: "/business-models",
  project_value: "/project-value",
  brief: "/briefs",
  capacity_plan: "/capacity-plans",
  strategic_builder: "/strategic-builders",
  customer: "/customers",
  rate: "/rates",
  quote: "/quotes",
  invoice: "/invoices",
  company: "/companies",
  contact: "/contacts",
  deal: "/deals",
  interaction: "/interactions",
  portfolio: "/portfolio",
  person: "/people",
  org_member: "/org",
  meeting: "/meetings",
  moscow: "/moscow",
  eisenhower: "/eisenhower",
  safe_agreement: "/safe",
  investor: "/investors",
  kpi_snapshot: "/kpis",
  onboarding: "/onboarding",
  onboarding_template: "/onboarding-templates",
  financial_period: "/finances",
  payment: "/payments",
  time_entry: "/time-entries",
  journal: "/journal",
  habit: "/habits",
  dns_domain: "/dns",
  fishbone: "/fishbones",
  marketing_plan: "/marketing-plans",
};
