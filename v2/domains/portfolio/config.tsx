// Portfolio domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type {
  CreatePortfolioItem,
  PortfolioItem,
  UpdatePortfolioItem,
} from "../../types/portfolio.types.ts";
import { PORTFOLIO_STATUS_OPTIONS } from "../../types/portfolio.types.ts";
import { getPortfolioService } from "../../singletons/services.ts";
import { PortfolioCard } from "../../views/components/portfolio-card.tsx";
import { PORTFOLIO_TABLE_COLUMNS, portfolioToRow } from "./constants.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

const FORM_FIELDS: FieldDef[] = [
  { type: "text", name: "name", label: "Name", required: true, maxLength: 200 },
  {
    type: "autocomplete",
    name: "category",
    label: "Category",
    source: "portfolio-categories",
    placeholder: "Search categories...",
  },
  {
    type: "select",
    name: "status",
    label: "Status",
    options: PORTFOLIO_STATUS_OPTIONS,
  },
  { type: "textarea", name: "description", label: "Description", rows: 4 },
  { type: "text", name: "client", label: "Client" },
  { type: "number", name: "revenue", label: "Revenue" },
  { type: "number", name: "expenses", label: "Expenses" },
  { type: "number", name: "progress", label: "Progress (%)" },
  { type: "date", name: "startDate", label: "Start date" },
  { type: "date", name: "endDate", label: "End date" },
  {
    type: "tags",
    name: "team",
    label: "Team",
    source: "people",
    placeholder: "Search people...",
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
  { type: "text", name: "billingCustomerId", label: "Billing customer ID" },
  {
    type: "select",
    name: "brainManaged",
    label: "Brain managed",
    options: [
      { value: "", label: "No" },
      { value: "true", label: "Yes" },
    ],
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

  stateKeys: [
    "view",
    "status",
    "category",
    "q",
    "sort",
    "order",
  ],
  columns: PORTFOLIO_TABLE_COLUMNS,
  formFields: FORM_FIELDS,

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

  parseCreate: (body) => {
    const parsed = parseFormBody(FORM_FIELDS, body);
    if (parsed.brainManaged !== undefined) {
      parsed.brainManaged = parsed.brainManaged === "true";
    }
    return parsed as CreatePortfolioItem;
  },

  parseUpdate: (body) => {
    const parsed = parseFormBody(FORM_FIELDS, body, { clearEmpty: true });
    if (parsed.brainManaged !== undefined) {
      parsed.brainManaged = parsed.brainManaged === "true";
    }
    return parsed as Partial<UpdatePortfolioItem>;
  },

  getService: () => getPortfolioService(),

  extractFilterOptions: async (items) => ({
    category: [...new Set(items.map((p) => p.category))].sort(),
  }),

  searchPredicate: (item, q) =>
    item.name.toLowerCase().includes(q) ||
    item.category.toLowerCase().includes(q) ||
    (item.client ?? "").toLowerCase().includes(q) ||
    (item.description ?? "").toLowerCase().includes(q) ||
    (item.techStack ?? []).some((t) => t.toLowerCase().includes(q)),
};
