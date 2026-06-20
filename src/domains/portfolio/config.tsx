// Portfolio domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreatePortfolioItem,
  PortfolioItem,
  UpdatePortfolioItem,
} from "../../types/portfolio.types.ts";
import { PORTFOLIO_STATUS_OPTIONS } from "../../types/portfolio.types.ts";
import { getPortfolioService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import { PortfolioCard } from "../../views/components/portfolio-card.tsx";
import { PORTFOLIO_TABLE_COLUMNS, portfolioToRow } from "./constants.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";
import { buildTeamPersonById } from "./owners.ts";

export const PORTFOLIO_FORM_FIELDS: FieldDef[] = [
  { type: "text", name: "name", label: "Name", required: true, maxLength: 200 },
  {
    type: "autocomplete",
    name: "category",
    label: "Category",
    source: "portfolio-categories",
    placeholder: "Search categories...",
    freetext: true,
  },
  {
    type: "select",
    name: "status",
    label: "Status",
    options: PORTFOLIO_STATUS_OPTIONS,
  },
  { type: "textarea", name: "description", label: "Description", rows: 4 },
  {
    type: "autocomplete",
    name: "client",
    label: "Client",
    source: "customers",
    placeholder: "Search customers...",
  },
  { type: "money", name: "revenue", label: "Revenue" },
  { type: "money", name: "expenses", label: "Expenses" },
  { type: "number", name: "progress", label: "Progress (%)" },
  { type: "date", name: "startDate", label: "Start date" },
  { type: "date", name: "endDate", label: "End date" },
  {
    type: "array-table",
    name: "team",
    label: "Team Member",
    section: "portfolio_team",
    addLabel: "Add member",
    itemFields: [
      {
        type: "autocomplete",
        name: "personId",
        label: "Person",
        source: "people",
        placeholder: "Search people...",
      },
      {
        type: "text",
        name: "role",
        label: "Role",
        placeholder: "e.g. Tech Lead",
      },
    ],
  },
  {
    type: "tags",
    name: "techStack",
    label: "Tech stack",
    source: "portfolio-tech-stack",
    placeholder: "Search technologies...",
  },
  { type: "text", name: "logo", label: "Logo URL" },
  { type: "text", name: "license", label: "License" },
  { type: "text", name: "githubRepo", label: "GitHub repo (owner/repo)" },
  {
    type: "autocomplete",
    name: "billingCustomerId",
    label: "Billing customer",
    source: "customers",
    placeholder: "Search customers...",
  },
  {
    type: "boolean",
    name: "brainManaged",
    label: "Brain managed",
  },
  {
    type: "tags",
    name: "linkedGoals",
    label: "Linked goals",
    source: "goals-by-id",
    placeholder: "Search goals...",
  },
];

export const portfolioConfig: DomainConfig<
  PortfolioItem,
  CreatePortfolioItem,
  UpdatePortfolioItem
> = {
  name: "portfolio",
  singular: "Portfolio item",
  plural: "Portfolio",
  path: "/portfolio",
  ssePrefix: "portfolio",
  styles: ["/css/views/portfolio.css"],
  emptyMessage: "No portfolio items yet. Create one to get started.",

  // `description` is edited in-place on the detail page via "Edit Mode".
  // (Status updates use their own bespoke per-row inline editor.)
  inlineEditFields: ["description"],

  stateKeys: [
    "view",
    "status",
    "category",
    "q",
    "sort",
    "order",
  ],
  columns: PORTFOLIO_TABLE_COLUMNS,
  formFields: PORTFOLIO_FORM_FIELDS,

  filters: [
    {
      name: "status",
      label: "All statuses",
      options: PORTFOLIO_STATUS_OPTIONS,
    },
    {
      name: "category",
      label: "All categories",
      options: [],
    },
  ],

  toRow: portfolioToRow,

  Card: ({ item, q }) => <PortfolioCard item={item} q={q} />,

  parseCreate: (body) =>
    parseFormBody(PORTFOLIO_FORM_FIELDS, body) as CreatePortfolioItem,

  parseUpdate: (body) =>
    parseFormBody(PORTFOLIO_FORM_FIELDS, body, { clearEmpty: true }) as Partial<
      UpdatePortfolioItem
    >,

  // Resolve person IDs to names for the team[] array-table autocomplete.
  // Unresolved IDs produce an empty search input — user re-picks.
  resolveArrayDisplayValues: async (item) => {
    const personById = await buildTeamPersonById(item.team ?? []);
    return {
      team: (item.team ?? []).map((m) => ({
        personId: (m.personId && personById[m.personId]) || "",
      })),
    };
  },

  getService: () => getPortfolioService(),

  extractFilterOptions: async (items) => ({
    category: [...new Set(items.map((p) => p.category))].sort(),
  }),

  searchPredicate: createSearchPredicate<PortfolioItem>([
    { type: "string", get: (i) => i.name },
    { type: "string", get: (i) => i.category },
    { type: "string", get: (i) => i.client },
    { type: "string", get: (i) => i.description },
    { type: "array", get: (i) => i.techStack },
  ]),
};
