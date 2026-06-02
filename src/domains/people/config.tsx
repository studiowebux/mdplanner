// People domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import { OrgTree } from "../../views/components/org-tree.tsx";
import { PeopleService } from "../../services/people.service.ts";
import type {
  CreatePerson,
  Person,
  UpdatePerson,
} from "../../types/person.types.ts";
import { AGENT_TYPE_OPTIONS } from "../../types/person.types.ts";
import { getPeopleService } from "../../singletons/services.ts";
import { parseFormBody } from "../../utils/form-parser.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import { PersonCard } from "../../views/components/person-card.tsx";
import { PEOPLE_TABLE_COLUMNS, personToRow } from "./constants.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";

/** Convert array-table rows [{ key, value }] to Record<string, string>. */
function accountsFromRows(
  rows: { key?: string; value?: string }[] | null | undefined,
): Record<string, string> | undefined {
  if (!Array.isArray(rows) || rows.length === 0) return undefined;
  const acc: Record<string, string> = {};
  for (const row of rows) {
    // First occurrence wins — duplicates silently dropped (client blocks them too).
    if (row.key && row.value && !acc[row.key]) acc[row.key] = row.value;
  }
  return Object.keys(acc).length > 0 ? acc : undefined;
}

export const PEOPLE_FORM_FIELDS: FieldDef[] = [
  { type: "text", name: "name", label: "Name", required: true, maxLength: 200 },
  { type: "text", name: "title", label: "Title" },
  { type: "text", name: "role", label: "Role" },
  {
    type: "tags",
    name: "departments",
    label: "Departments",
    source: "people-departments",
    placeholder: "Type and press Enter...",
  },
  { type: "text", name: "email", label: "Email" },
  { type: "text", name: "phone", label: "Phone" },
  {
    type: "autocomplete",
    name: "reportsTo",
    label: "Reports to",
    source: "people",
    placeholder: "Search people...",
  },
  { type: "date", name: "startDate", label: "Start date" },
  { type: "number", name: "hoursPerDay", label: "Hours per day" },
  {
    type: "select",
    name: "agentType",
    label: "Agent type",
    options: AGENT_TYPE_OPTIONS,
  },
  {
    type: "tags",
    name: "skills",
    label: "Skills",
    source: "people-skills",
    placeholder: "Type and press Enter...",
  },
  {
    type: "array-table",
    name: "accounts",
    label: "External accounts",
    section: "accounts",
    addLabel: "Add account",
    itemFields: [
      {
        type: "select",
        name: "key",
        label: "Provider",
        options: [
          { value: "github", label: "GitHub" },
          { value: "gitea", label: "Gitea" },
          { value: "asana", label: "Asana" },
          { value: "discord", label: "Discord" },
          { value: "whimsical", label: "Whimsical" },
          { value: "google", label: "Google" },
        ],
      },
      { type: "text", name: "value", label: "Username / handle" },
    ],
  },
];

export const peopleConfig: DomainConfig<
  Person,
  CreatePerson,
  UpdatePerson
> = {
  name: "people",
  singular: "Person",
  plural: "People",
  path: "/people",
  ssePrefix: "person",
  styles: ["/css/views/people.css"],
  scripts: [
    "/js/org-tree.js",
    "/js/org-tree-export.js",
    "/js/accounts-dedup.js",
  ],
  emptyMessage: "No people yet. Add someone to get started.",

  stateKeys: [
    "view",
    "department",
    "agentType",
    "q",
    "sort",
    "order",
  ],
  columns: PEOPLE_TABLE_COLUMNS,
  formFields: PEOPLE_FORM_FIELDS,

  filters: [
    {
      name: "department",
      label: "All departments",
      options: [],
      field: "departments",
    },
    {
      name: "agentType",
      label: "All types",
      options: AGENT_TYPE_OPTIONS,
    },
  ],

  toRow: personToRow,

  Card: ({ item, q }) => <PersonCard person={item} q={q} />,

  parseCreate: (body) => {
    const parsed = parseFormBody(PEOPLE_FORM_FIELDS, body) as CreatePerson;
    parsed.accounts = accountsFromRows(
      parsed.accounts as unknown as { key?: string; value?: string }[],
    );
    return parsed;
  },

  parseUpdate: (body) => {
    const parsed = parseFormBody(PEOPLE_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdatePerson>;
    if (parsed.accounts !== undefined) {
      parsed.accounts = accountsFromRows(
        parsed.accounts as unknown as { key?: string; value?: string }[],
      );
    }
    return parsed;
  },

  getService: () => getPeopleService(),

  resolveFormValues: async (values) => {
    const resolved = { ...values };
    if (values.reportsTo) {
      const manager = await getPeopleService().getById(values.reportsTo);
      if (manager) resolved.reportsTo = manager.name;
    }
    return resolved;
  },

  extractFilterOptions: (items) => ({
    department: [
      ...new Set(items.flatMap((p) => p.departments ?? [])),
    ].sort(),
  }),

  searchPredicate: createSearchPredicate<Person>([
    { type: "string", get: (i) => i.name },
    { type: "string", get: (i) => i.title },
    { type: "string", get: (i) => i.role },
    { type: "string", get: (i) => i.email },
    { type: "array", get: (i) => i.departments },
    { type: "array", get: (i) => i.skills },
  ]),

  extraViewModes: [{ key: "org", label: "Org" }],

  customViewRenderer: async (_view, _state, items, _nonce) => {
    const tree = PeopleService.buildTree(items);
    return <OrgTree tree={tree} />;
  },
};
