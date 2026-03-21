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
import { PersonCard } from "../../views/components/person-card.tsx";
import { PEOPLE_TABLE_COLUMNS, personToRow } from "./constants.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";

const FORM_FIELDS: FieldDef[] = [
  { type: "text", name: "name", label: "Name", required: true },
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
  scripts: ["/js/org-tree.js", "/js/org-tree-export.js"],
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
  formFields: FORM_FIELDS,

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

  parseCreate: (body) => ({
    name: String(body.name || ""),
    title: body.title ? String(body.title) : undefined,
    role: body.role ? String(body.role) : undefined,
    departments: body.departments
      ? String(body.departments).split(",").map((s) => s.trim()).filter(Boolean)
      : undefined,
    reportsTo: body.reportsTo ? String(body.reportsTo) : undefined,
    email: body.email ? String(body.email) : undefined,
    phone: body.phone ? String(body.phone) : undefined,
    startDate: body.startDate ? String(body.startDate) : undefined,
    hoursPerDay: body.hoursPerDay ? Number(body.hoursPerDay) : undefined,
    agentType: body.agentType
      ? String(body.agentType) as Person["agentType"]
      : undefined,
    skills: body.skills
      ? String(body.skills).split(",").map((s) => s.trim()).filter(Boolean)
      : undefined,
  }),

  parseUpdate: (body) => ({
    name: body.name ? String(body.name) : undefined,
    title: body.title ? String(body.title) : undefined,
    role: body.role ? String(body.role) : undefined,
    departments: body.departments
      ? String(body.departments).split(",").map((s) => s.trim()).filter(Boolean)
      : undefined,
    reportsTo: body.reportsTo ? String(body.reportsTo) : undefined,
    email: body.email ? String(body.email) : undefined,
    phone: body.phone ? String(body.phone) : undefined,
    startDate: body.startDate ? String(body.startDate) : undefined,
    hoursPerDay: body.hoursPerDay ? Number(body.hoursPerDay) : undefined,
    agentType: body.agentType
      ? String(body.agentType) as Person["agentType"]
      : undefined,
    skills: body.skills
      ? String(body.skills).split(",").map((s) => s.trim()).filter(Boolean)
      : undefined,
  }),

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

  searchPredicate: (item, q) =>
    item.name.toLowerCase().includes(q) ||
    (item.title ?? "").toLowerCase().includes(q) ||
    (item.role ?? "").toLowerCase().includes(q) ||
    (item.email ?? "").toLowerCase().includes(q) ||
    (item.departments ?? []).some((d) => d.toLowerCase().includes(q)) ||
    (item.skills ?? []).some((s) => s.toLowerCase().includes(q)),

  extraViewModes: [{ key: "org", label: "Org" }],

  customViewRenderer: async (_view, _state, items, _nonce) => {
    const tree = PeopleService.buildTree(items);
    return <OrgTree tree={tree} />;
  },
};
