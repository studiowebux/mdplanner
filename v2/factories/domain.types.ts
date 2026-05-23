// Domain factory types — shared config shape for all CRUD domains.

import type { FC } from "hono/jsx";
import type { FieldDef } from "../components/ui/form-builder.tsx";
import type { ColumnDef } from "../components/ui/data-table.tsx";
import type { AppContext, ViewMode, ViewProps } from "../types/app.ts";

/** Base constraint for all domain entity types. */
export type Entity = Record<string, unknown>;

// Minimal service contract every domain must satisfy.
export interface DomainService<T extends Entity, C, U> {
  list(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(data: C): Promise<T>;
  update(id: string, data: U): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

// Dynamic filter option values — plain strings or value/label pairs.
export type FilterOptionEntry = string | { value: string; label: string };
export type DynamicFilterOptions = Record<string, FilterOptionEntry[]>;

// Filter field shown in the toolbar (select dropdown).
export type FilterDef = {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  /** Item field to filter on. Defaults to `name` if omitted. Supports array fields. */
  field?: string;
  /**
   * When true, the factory renders the dropdown and reads the value into
   * filterState, but skips entity-field matching in applyFilters. The domain's
   * `customFilter` is responsible for narrowing items. Use for derived/computed
   * filters (period status, array-of-object lookups) that cannot be expressed
   * as a simple `item[field] === value` comparison.
   */
  computed?: boolean;
};

// Domain filter state — generic across all domains.
export type DomainFilterState = {
  view: ViewMode;
  q?: string;
  hideCompleted?: boolean;
  sort?: string;
  order?: "asc" | "desc";
  [key: string]: string | boolean | undefined;
};

// Card component contract — receives one item + optional search query.
export type CardComponent<T extends Entity> = FC<{ item: T; q?: string }>;

// How to extract a form body into create/update data.
export type FormParser<C> = (body: Record<string, string | File>) => C;

// Full domain config — everything the factory needs.
export type DomainConfig<T extends Entity, C, U> = {
  // Identity
  name: string;
  singular: string;
  /** Page heading override. Defaults to `singular + "s"`. */
  plural?: string;
  path: string;
  ssePrefix: string;

  // Presentation
  styles: string[];
  scripts?: string[];
  emptyMessage: string;
  /** Default view mode. Defaults to "grid" if omitted. */
  defaultView?: string;

  // Data shape
  stateKeys: readonly string[];
  columns: ColumnDef[];
  formFields: FieldDef[];
  /**
   * Field names edited in-place on the detail page (contenteditable, via
   * "Edit Mode") rather than the sidenav. Excluded from the edit form;
   * still rendered in the create form.
   */
  inlineEditFields?: string[];
  filters?: FilterDef[];
  // Optional: field + value for the "hide completed" toggle.
  // Omit entirely if the domain has no completion concept.
  hideCompleted?: { field: string; value: string | string[] };

  // Row mapper — converts domain item to flat Record for DataTable.
  toRow: (item: T) => Record<string, unknown>;

  /**
   * Optional batch row mapper. When set, the factory uses it INSTEAD of the
   * per-item `toRow` map inside the table view (and the /more pagination
   * fragment). Use this when a row needs cross-item state — e.g. a running
   * balance, per-row rank, or position in a sorted list.
   *
   * Receives the visible items (already filtered + sorted + paged) and the
   * current filter state. Must include `_q: state.q` on each row if the row
   * uses the search-highlight column renderers.
   *
   * NOTE on pagination: with `pageSize` set, the input is a page slice — any
   * cumulative computed here is page-local. Domains that need cross-page
   * cumulative must either disable pagination or compute the cumulative
   * upstream (e.g. in `listForRequest`).
   */
  mapRows?: (
    items: T[],
    state: DomainFilterState,
  ) => Array<Record<string, unknown>>;

  // Card component for grid view. Optional if grid view is not used.
  Card?: CardComponent<T>;

  // Form body parsing.
  parseCreate: FormParser<C>;
  parseUpdate: FormParser<Partial<U>>;

  // Service accessor.
  getService: () => DomainService<T, C, U>;

  // Optional: extract unique values for a filter field from all items.
  // Each key maps to either plain strings (value === label) or value/label pairs.
  extractFilterOptions?: (
    items: T[],
  ) => DynamicFilterOptions | Promise<DynamicFilterOptions>;

  // Optional: provide dynamic select options for form fields (e.g. config-driven status values).
  // Keys are field names; values are { value, label } pairs that override the static FieldDef options.
  extractFormOptions?: () => Promise<
    Record<string, { value: string; label: string }[]>
  >;

  // Optional: custom text search predicate (defaults to searching all string fields).
  searchPredicate?: (item: T, q: string) => boolean;

  // Optional: resolve form values for display (e.g., ID → name for autocomplete fields).
  resolveFormValues?: (
    values: Record<string, string>,
  ) => Promise<Record<string, string>>;

  /**
   * Override edit-form values after the factory's default item-to-string
   * mapping. Use when a public entity shape (e.g. `string[]`) needs reshaping
   * into the wire shape a form field expects (e.g. `array-table` JSON).
   * Applied AFTER the default auto-fill and BEFORE the additive
   * `resolveFormValues` merge — so keys returned here take precedence over
   * both. Edit mode only (not used when prefilling a create form).
   */
  formValueOverrides?: (item: T) => Record<string, string>;

  /** Hide the default Grid/Table view toggle buttons. Use when all views are custom. */
  hideDefaultViews?: boolean;

  /**
   * Hide only the Grid view toggle button (and coerce a stale `view=grid` in
   * URL/cookie to the Table render). Use for domains whose data is inherently
   * tabular (e.g. finance entries) and would never benefit from a card grid.
   * Independent of `hideDefaultViews`, which hides both built-in buttons.
   */
  hideGridView?: boolean;

  /** Optional async slot rendered between the toolbar and the view container.
   *  Receives the request context so the slot can scope to the current user. */
  topSlot?: (c: AppContext) => Promise<ReturnType<FC>>;

  /** Per-request item source for the list page. When set, the factory uses it
   *  instead of `getService().list()` for the full page, /view, and /more
   *  routes — letting a domain scope or transform items per request (e.g.
   *  per-user habit completions). The result is still passed through
   *  applyFilters + applyGlobalFilters. */
  listForRequest?: (c: AppContext) => Promise<T[]>;

  /** Enable server-side pagination. Only the first N items are rendered initially;
   *  scrolling past the sentinel loads the next page via /more?offset=N. */
  pageSize?: number;

  /** When set, renders a per-page <select> in the toolbar with these options.
   *  The user-selected value is stored in the `limit` state key and overrides pageSize. */
  pageSizeOptions?: number[];

  // Optional: extra view modes beyond grid/table (e.g. "org" for org chart).
  // Rendered as additional toggle buttons. The factory calls customViewRenderer
  // when the view mode matches an extra key.
  extraViewModes?: { key: string; label: string }[];

  // Optional: render custom view content for extra view modes.
  // Called by the factory when state.view matches an extraViewModes key.
  // Receives the view key, filter state, and filtered items.
  customViewRenderer?: (
    view: string,
    state: DomainFilterState,
    items: T[],
    nonce?: string,
  ) => Promise<ReturnType<FC> | undefined>;

  // Optional: field name on T that holds the project name string (e.g. "project").
  projectField?: keyof T & string;

  // Optional: field name on T that holds the assignee/owner string (e.g. "assignee", "owner").
  assigneeField?: keyof T & string;

  // Set to true when assigneeField stores a person ID instead of a person name.
  // applyGlobalFilters will resolve IDs to names via PeopleService before comparing.
  assigneeIsId?: boolean;

  // Optional: detail page renderer (if the domain has a detail view).
  DetailView?: FC<ViewProps & { item: T }>;

  // Optional: extra buttons rendered in the toolbar right area (before view toggles).
  toolbarActions?: FC;

  // Optional: date range filter override. The factory renders a date range
  // filter on EVERY domain by default (see DEFAULT_DATE_RANGE_FILTER); set this
  // only to filter on a different entity field or use different query keys.
  // field: entity property holding an ISO date or timestamp string.
  // fromKey/toKey: query param + stateKey names (default: "date_from" / "date_to").
  // The factory injects fromKey/toKey into stateKeys automatically.
  dateRangeFilter?: {
    field: string;
    fromKey?: string;
    toKey?: string;
    fromLabel?: string;
    toLabel?: string;
  };

  // Optional: async post-filter applied after global filters. Receives filtered
  // items and the request context. Use for config-driven filters (e.g. hideCompletedAfterDays).
  customFilter?: (items: T[], c: AppContext) => Promise<T[]>;

  // When true, renders a "Show hidden" checkbox in the toolbar (name="showHidden").
  // Pair with customFilter to let users temporarily reveal hidden items.
  showHiddenToggle?: boolean;
};

// Default date range filter applied to every factory-driven domain. Filters on
// the `createdAt` audit field present on every persisted entity. Domains may
// override via DomainConfig.dateRangeFilter (e.g. meeting filters on `date`).
export const DEFAULT_DATE_RANGE_FILTER = {
  field: "createdAt",
  fromKey: "date_from",
  toKey: "date_to",
  fromLabel: "Created after",
  toLabel: "Created before",
} as const;

// Fully-resolved date range filter — the per-domain override or the default,
// with fromKey/toKey/labels filled in. Used by the route + view factories.
export type ResolvedDateRangeFilter = {
  field: string;
  fromKey: string;
  toKey: string;
  fromLabel: string;
  toLabel: string;
};

/** Resolve the effective date range filter for a domain: override or default. */
export function effectiveDateRangeFilter<T extends Entity>(
  cfg: DomainConfig<T, unknown, unknown>,
): ResolvedDateRangeFilter {
  const d = cfg.dateRangeFilter;
  if (!d) return { ...DEFAULT_DATE_RANGE_FILTER };
  return {
    field: d.field,
    fromKey: d.fromKey ?? "date_from",
    toKey: d.toKey ?? "date_to",
    fromLabel: d.fromLabel ?? "From",
    toLabel: d.toLabel ?? "To",
  };
}
