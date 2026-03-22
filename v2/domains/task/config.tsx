// Task domain config — drives the factory for routes, views, and forms.
// Tasks use list as default view. Extra view modes: board (kanban), timeline (gantt).
// No grid view — list is the primary layout with section grouping.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type { CreateTask, Task, UpdateTask } from "../../types/task.types.ts";
import {
  getMilestoneService,
  getPeopleService,
  getPortfolioService,
  getTaskService,
} from "../../singletons/services.ts";
import { getSectionOrder } from "../../constants/mod.ts";
import { TaskListView } from "../../views/components/task-list.tsx";
import { TaskBoardView } from "../../views/components/task-board.tsx";
import { TaskTimelineView } from "../../views/components/task-timeline.tsx";
import {
  buildSectionOptions,
  TASK_PRIORITY_OPTIONS,
  TASK_STATE_KEYS,
  TASK_TABLE_COLUMNS,
  taskToRow,
} from "./constants.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

const FORM_FIELDS: FieldDef[] = [
  { type: "text", name: "title", label: "Title", required: true },
  {
    type: "select",
    name: "section",
    label: "Section",
    options: getSectionOrder().map((s) => ({ value: s, label: s })),
  },
  {
    type: "select",
    name: "priority",
    label: "Priority",
    options: TASK_PRIORITY_OPTIONS,
  },
  {
    type: "autocomplete",
    name: "assignee",
    label: "Assignee",
    source: "people",
    placeholder: "Search people...",
  },
  {
    type: "autocomplete",
    name: "milestone",
    label: "Milestone",
    source: "milestones",
    placeholder: "Search milestones...",
  },
  {
    type: "autocomplete",
    name: "project",
    label: "Project",
    source: "portfolio",
    placeholder: "Search projects...",
  },
  { type: "date", name: "due_date", label: "Due date" },
  { type: "date", name: "planned_start", label: "Planned start" },
  { type: "date", name: "planned_end", label: "Planned end" },
  { type: "number", name: "effort", label: "Effort (days)" },
  { type: "number", name: "order", label: "Sort order" },
  {
    type: "tags",
    name: "tags",
    label: "Tags",
    source: "project-tags",
    placeholder: "Type and press Enter...",
  },
  {
    type: "tags",
    name: "blocked_by",
    label: "Blocked by",
    source: "tasks",
    placeholder: "Search tasks...",
  },
  { type: "textarea", name: "description", label: "Description", rows: 4 },
];

export const taskConfig: DomainConfig<Task, CreateTask, UpdateTask> = {
  name: "tasks",
  singular: "Task",
  plural: "Tasks",
  path: "/tasks",
  ssePrefix: "task",
  defaultView: "list",
  hideDefaultViews: true,
  styles: ["/css/views/task.css"],
  scripts: [
    "/js/task-list.js",
    "/js/task-board.js",
    "/js/task-timeline.js",
    "/js/task-timeline-export.js",
  ],
  emptyMessage: "No tasks yet. Create one to get started.",

  stateKeys: TASK_STATE_KEYS,
  columns: TASK_TABLE_COLUMNS,
  formFields: FORM_FIELDS,

  filters: [
    {
      name: "section",
      label: "All sections",
      options: [],
    },
    {
      name: "project",
      label: "All projects",
      options: [],
    },
    {
      name: "milestone",
      label: "All milestones",
      options: [],
    },
    {
      name: "assignee",
      label: "All assignees",
      options: [],
    },
    {
      name: "priority",
      label: "All priorities",
      options: [],
    },
    {
      name: "tags",
      label: "All tags",
      options: [],
      field: "tags",
    },
  ],

  hideCompleted: { field: "completed", value: "true" },

  toRow: taskToRow,

  parseCreate: (body) =>
    parseFormBody(FORM_FIELDS, body, { splitTextarea: true }) as CreateTask,

  parseUpdate: (body) =>
    parseFormBody(FORM_FIELDS, body, {
      clearEmpty: true,
      splitTextarea: true,
    }) as Partial<UpdateTask>,

  getService: () => getTaskService(),

  resolveFormValues: async (values) => {
    const resolved = { ...values };
    if (values.assignee) {
      const person = await getPeopleService().getById(values.assignee);
      if (person) resolved.assignee = person.name;
    }
    return resolved;
  },

  extractFilterOptions: async (items) => {
    const sections = buildSectionOptions(items);
    const assigneeIds = [
      ...new Set(items.map((t) => t.assignee).filter(Boolean) as string[]),
    ];
    const [portfolio, milestones, people] = await Promise.all([
      getPortfolioService().list(),
      getMilestoneService().list(),
      getPeopleService().list(),
    ]);
    const peopleMap = new Map(people.map((p) => [p.id, p.name]));
    return {
      section: sections.map((s) => s.value),
      project: portfolio.map((p) => p.name).sort(),
      milestone: [...new Set(milestones.map((m) => m.name))].sort(),
      assignee: assigneeIds
        .map((id) => ({ value: id, label: peopleMap.get(id) ?? id }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      priority: TASK_PRIORITY_OPTIONS.filter((o) =>
        items.some((t) => String(t.priority) === o.value)
      ),
      tags: [...new Set(items.flatMap((t) => t.tags ?? []))].sort(),
    };
  },

  searchPredicate: (item, q) =>
    item.title.toLowerCase().includes(q) ||
    (item.description ?? []).some((d) => d.toLowerCase().includes(q)) ||
    (item.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
    (item.assignee ?? "").toLowerCase().includes(q) ||
    (item.milestone ?? "").toLowerCase().includes(q) ||
    (item.project ?? "").toLowerCase().includes(q),

  extraViewModes: [
    { key: "list", label: "List" },
    { key: "board", label: "Board" },
    { key: "timeline", label: "Timeline" },
  ],

  customViewRenderer: async (view, state, items) => {
    if (view === "list") {
      const people = await getPeopleService().list();
      const peopleOptions = people
        .map((p) => ({ value: p.id, label: p.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
      return (
        <TaskListView
          tasks={items}
          sort={state.sort}
          order={state.order}
          peopleOptions={peopleOptions}
        />
      );
    }
    if (view === "board") {
      return <TaskBoardView tasks={items} />;
    }
    if (view === "timeline") {
      const zoom = parseInt(String(state.zoom ?? "1")) || 1;
      return <TaskTimelineView tasks={items} zoom={zoom} />;
    }
    return undefined;
  },
};
