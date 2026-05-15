// Idea domain config — drives the factory for routes, views, and forms.

import type { DomainConfig } from "../../factories/domain.types.ts";
import type { CreateIdea, Idea, UpdateIdea } from "../../types/idea.types.ts";
import {
  IDEA_COMPLETED_STATUSES,
  IDEA_PRIORITIES,
  IDEA_STATUSES,
} from "../../types/idea.types.ts";
import { getIdeaService } from "../../singletons/services.ts";
import { createSearchPredicate } from "../../utils/string.ts";
import {
  IDEA_FORM_FIELDS,
  IDEA_PRIORITY_OPTIONS,
  IDEA_STATUS_OPTIONS,
  IDEA_TABLE_COLUMNS,
  ideaToRow,
} from "./constants.tsx";
import { IdeaCard } from "../../views/components/idea-card.tsx";
import { parseFormBody } from "../../utils/form-parser.ts";

export const ideaConfig: DomainConfig<Idea, CreateIdea, UpdateIdea> = {
  name: "ideas",
  singular: "Idea",
  path: "/ideas",
  ssePrefix: "idea",
  styles: ["/css/views/ideas.css"],
  scripts: ["/js/idea-graph.js"],
  emptyMessage: "No ideas yet. Create one to get started.",
  defaultView: "table",

  stateKeys: [
    "view",
    "status",
    "category",
    "priority",
    "q",
    "sort",
    "order",
    "hideCompleted",
  ],
  columns: IDEA_TABLE_COLUMNS,
  formFields: IDEA_FORM_FIELDS,

  filters: [
    {
      name: "status",
      label: "All statuses",
      options: IDEA_STATUS_OPTIONS,
    },
    {
      name: "category",
      label: "All categories",
      options: [],
    },
    {
      name: "priority",
      label: "All priorities",
      options: IDEA_PRIORITY_OPTIONS,
    },
  ],

  hideCompleted: {
    field: "status",
    value: [...IDEA_COMPLETED_STATUSES],
  },

  toRow: ideaToRow,

  Card: ({ item, q }) => <IdeaCard item={item} q={q} />,

  parseCreate: (body) => parseFormBody(IDEA_FORM_FIELDS, body) as CreateIdea,

  parseUpdate: (body) =>
    parseFormBody(IDEA_FORM_FIELDS, body, {
      clearEmpty: true,
    }) as Partial<UpdateIdea>,

  getService: () => getIdeaService(),
  projectField: "project",

  extractFilterOptions: async () => {
    const ideas = await getIdeaService().list();
    const categories = [
      ...new Set(
        ideas.map((i) => i.category).filter(Boolean) as string[],
      ),
    ].sort();

    return {
      category: categories,
    };
  },

  searchPredicate: createSearchPredicate<Idea>([
    { type: "string", get: (i) => i.title },
    { type: "string", get: (i) => i.description },
    { type: "string", get: (i) => i.category },
    { type: "string", get: (i) => i.resources },
  ]),

  extraViewModes: [{ key: "graph", label: "Graph" }],

  customViewRenderer: async (_view, _state, items) => {
    const graphData = items.map((i) => ({
      id: i.id,
      title: i.title,
      status: i.status,
      links: i.links ?? [],
    }));
    return (
      <div class="idea-graph">
        <div class="idea-graph__toolbar">
          <button
            type="button"
            class="btn btn--sm idea-graph__reset"
            data-idea-graph-reset
          >
            Reset view
          </button>
          <span class="idea-graph__zoom-label" data-idea-graph-zoom>100%</span>
          <input
            type="range"
            class="idea-graph__zoom-slider"
            data-idea-graph-slider
            min="0.1"
            max="2"
            step="0.05"
            value="1"
          />
        </div>
        <canvas
          id="idea-graph-canvas"
          class="idea-graph__canvas"
          data-ideas={JSON.stringify(graphData)}
        />
      </div>
    );
  },
};
