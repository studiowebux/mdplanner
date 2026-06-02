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

/** Default milestone status values — used when project has none configured. */
export const DEFAULT_MILESTONE_STATUSES: string[] = ["open", "completed"];

/** Default KPI metric keys — shown in goal form when project has none configured. */
export const DEFAULT_KPI_METRICS: string[] = [
  "mrr",
  "arr",
  "revenue",
  "churn_rate",
  "retention_rate",
  "conversion_rate",
  "ltv",
  "cac",
  "arpu",
  "burn_rate",
  "growth_rate",
  "active_users",
  "nrr",
  "gross_margin",
  "nps",
  "uptime",
];

export const PRIORITY_OPTIONS = [
  { value: "1", label: "P1 — Critical" },
  { value: "2", label: "P2 — High" },
  { value: "3", label: "P3 — Medium" },
  { value: "4", label: "P4 — Low" },
  { value: "5", label: "P5 — Minimal" },
];

export const PRIORITY_LABELS: Record<string, string> = {
  "1": "P1",
  "2": "P2",
  "3": "P3",
  "4": "P4",
  "5": "P5",
};

/** Milliseconds in one day. */
export const MS_PER_DAY = 86_400_000;

/** Default stale threshold when project config has no staleDays. */
export const DEFAULT_STALE_DAYS = 14;

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  task: "Task",
  note: "Note",
  goal: "Goal",
  milestone: "Milestone",
  idea: "Idea",
  brainstorm: "Brainstorm",
  brainstorm_template: "Brainstorm Template",
  reflection_template: "Reflection Template",
  reflection: "Reflection",
  retrospective: "Retrospective",
  sticky_note: "Sticky Note",
  mindmap: "Mindmap",
  c4_component: "C4 Component",
  swot: "SWOT",
  risk: "Risk",
  safe: "SAFE",
  lean_canvas: "Lean Canvas",
  business_model: "Business Model",
  project_value: "Project Value",
  brief: "Brief",
  capacity_plan: "Capacity Plan",
  strategic_builder: "Strategic Levels",
  customer: "Customer",
  rate: "Billing Rate",
  quote: "Quote",
  invoice: "Invoice",
  company: "Company",
  contact: "Contact",
  deal: "Deal",
  portfolio: "Portfolio",
  person: "Person",
  meeting: "Meeting",
  moscow: "MoSCoW",
  eisenhower: "Eisenhower",
  safe_agreement: "SAFe Agreement",
  investor: "Investor",
  onboarding: "Onboarding",
  onboarding_template: "Onboarding Template",
  finance: "Finances",
  payment: "Payment",
  time_entry: "Time Entry",
  vacation: "Vacation",
  journal: "Journal",
  habit: "Habit",
  dns_domain: "DNS Domain",
  fishbone: "Fishbone",
  marketing_plan: "Marketing Plan",
  ai_chat: "AI Chat",
  analytics: "Analytics",
  github: "GitHub",
  upload: "Uploads",
  dashboard: "Dashboard",
  me: "My Work",
};

/**
 * Default sidebar navigation categories — used when project.md has no
 * nav_categories field. Insertion order defines display order.
 * Keys not listed here fall into "Other".
 */
export const DEFAULT_NAV_CATEGORIES: Record<string, string[]> = {
  Personal: ["me"],
  Work: ["task", "milestone", "goal"],
  Planning: [
    "idea",
    "brainstorm",
    "brainstorm_template",
    "brief",
    "reflection",
    "reflection_template",
    "retrospective",
  ],
  Prioritization: ["moscow", "eisenhower"],
  Strategy: [
    "swot",
    "risk",
    "safe",
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
    "finance",
  ],
  CRM: ["company", "contact", "deal"],
  Team: [
    "person",
    "meeting",
    "capacity_plan",
    "time_entry",
    "vacation",
    "onboarding",
    "onboarding_template",
    "safe_agreement",
  ],
  Notes: ["note", "journal", "habit"],
  Diagrams: ["sticky_note", "mindmap", "c4_component"],
  Portfolio: ["portfolio", "dashboard"],
  Infrastructure: ["dns_domain", "github"],
  AI: ["ai_chat"],
  Tools: ["analytics", "upload"],
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
  // Seed from defaults so new features land in their intended category
  // even when the user has a saved custom config.
  for (const [category, keys] of Object.entries(DEFAULT_NAV_CATEGORIES)) {
    for (const key of keys) {
      keyToCategory[key] = category;
    }
  }
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

// -- Per-domain supported view modes --------------------------------------
//
// Every factory-based domain supports `grid` + `table`. A domain may also
// declare `extraViewModes` in its `config.tsx` (e.g. board, timeline, org,
// canvas, calendar). The Settings "View defaults" selector reads this map so
// it shows only the views a domain actually supports — picking a mode the
// domain can't render would silently fall back to the default.
//
// New domains: add an entry here whenever you add `extraViewModes` to a
// domain config. Hand-maintained, same as ENTITY_TYPE_LABELS / _ROUTES above.

export type ViewModeOption = { key: string; label: string };

export const DEFAULT_VIEW_MODES: ReadonlyArray<ViewModeOption> = [
  { key: "grid", label: "Grid" },
  { key: "table", label: "Table" },
];

export const DOMAIN_VIEW_MODES: Record<string, ReadonlyArray<ViewModeOption>> =
  {
    task: [
      ...DEFAULT_VIEW_MODES,
      { key: "list", label: "List" },
      { key: "board", label: "Board" },
      { key: "timeline", label: "Timeline" },
    ],
    goal: [...DEFAULT_VIEW_MODES, { key: "tree", label: "Tree" }],
    person: [...DEFAULT_VIEW_MODES, { key: "org", label: "Org chart" }],
    deal: [...DEFAULT_VIEW_MODES, { key: "pipeline", label: "Pipeline" }],
    idea: [...DEFAULT_VIEW_MODES, { key: "graph", label: "Graph" }],
    risk: [...DEFAULT_VIEW_MODES, { key: "matrix", label: "Matrix" }],
    c4_component: [...DEFAULT_VIEW_MODES, { key: "canvas", label: "Canvas" }],
    sticky_note: [...DEFAULT_VIEW_MODES, { key: "canvas", label: "Canvas" }],
    vacation: [...DEFAULT_VIEW_MODES, { key: "calendar", label: "Calendar" }],
  };

/** Returns the view modes a domain supports, or the factory default. */
export function getDomainViewModes(
  domainKey: string,
): ReadonlyArray<ViewModeOption> {
  return DOMAIN_VIEW_MODES[domainKey] ?? DEFAULT_VIEW_MODES;
}

/** Maps entity FTS type to the URL path prefix for that domain's list view. */
export const ENTITY_TYPE_ROUTES: Record<string, string> = {
  task: "/tasks",
  note: "/notes",
  goal: "/goals",
  milestone: "/milestones",
  idea: "/ideas",
  brainstorm: "/brainstorms",
  brainstorm_template: "/brainstorm-templates",
  reflection_template: "/reflection-templates",
  reflection: "/reflections",
  retrospective: "/retrospectives",
  sticky_note: "/sticky-notes",
  mindmap: "/mindmaps",
  c4_component: "/c4",
  swot: "/swot",
  risk: "/risks",
  safe: "/safe",
  lean_canvas: "/lean-canvases",
  business_model: "/business-models",
  project_value: "/project-value",
  brief: "/briefs",
  capacity_plan: "/capacity-plans",
  strategic_builder: "/strategic-levels",
  customer: "/customers",
  rate: "/billing-rates",
  quote: "/quotes",
  invoice: "/invoices",
  company: "/companies",
  contact: "/contacts",
  deal: "/deals",
  portfolio: "/portfolio",
  person: "/people",
  meeting: "/meetings",
  moscow: "/moscow",
  eisenhower: "/eisenhower",
  safe_agreement: "/safe",
  investor: "/investors",
  onboarding: "/onboarding",
  onboarding_template: "/onboarding-templates",
  finance: "/finances",
  payment: "/payments",
  time_entry: "/time-entries",
  vacation: "/vacation",
  journal: "/journal",
  habit: "/habits",
  dns_domain: "/dns",
  fishbone: "/fishbones",
  marketing_plan: "/marketing-plans",
  ai_chat: "/ai-chat",
  analytics: "/analytics",
  github: "/github",
  upload: "/uploads",
  dashboard: "/portfolio/dashboard",
  me: "/me",
};

// ---------------------------------------------------------------------------
// Search result type maps — superset of ENTITY_TYPE_* that includes
// searchable-but-not-feature FTS types (e.g. sticky_board, registered by the
// sticky-note domain alongside sticky_note). Settings keeps using the
// ENTITY_TYPE_* maps for its feature toggle list so no bogus entries appear.
// ---------------------------------------------------------------------------

export const SEARCH_TYPE_LABELS: Record<string, string> = {
  ...ENTITY_TYPE_LABELS,
  sticky_board: "Sticky Board",
};

export const SEARCH_TYPE_ROUTES: Record<string, string> = {
  ...ENTITY_TYPE_ROUTES,
  sticky_board: "/sticky-notes",
};
