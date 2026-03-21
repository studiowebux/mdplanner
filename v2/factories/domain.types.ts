// Domain factory types — shared config shape for all CRUD domains.

import type { FC } from "hono/jsx";
import type { FieldDef } from "../components/ui/form-builder.tsx";
import type { ColumnDef } from "../components/ui/data-table.tsx";
import type { ViewMode, ViewProps } from "../types/app.ts";

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
  filters?: FilterDef[];
  // Optional: field + value for the "hide completed" toggle.
  // Omit entirely if the domain has no completion concept.
  hideCompleted?: { field: string; value: string };

  // Row mapper — converts domain item to flat Record for DataTable.
  toRow: (item: T) => Record<string, unknown>;

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

  // Optional: custom text search predicate (defaults to searching all string fields).
  searchPredicate?: (item: T, q: string) => boolean;

  // Optional: resolve form values for display (e.g., ID → name for autocomplete fields).
  resolveFormValues?: (
    values: Record<string, string>,
  ) => Promise<Record<string, string>>;

  /** Hide the default Grid/Table view toggle buttons. Use when all views are custom. */
  hideDefaultViews?: boolean;

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

  // Optional: detail page renderer (if the domain has a detail view).
  DetailView?: FC<ViewProps & { item: T }>;
};
