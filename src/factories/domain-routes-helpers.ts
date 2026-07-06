// Domain route filter/state helpers — the pure (non-routing) logic behind the
// domain route factory: URL canonicalization, filter-state (de)serialization,
// in-memory filtering/sorting, global-filter application, and list-source
// resolution. Built once per domain via createFilterHelpers and consumed by the
// collection/entity route modules. No Hono routing here.

import { getPeopleService } from "../singletons/services.ts";
import { readGlobalAssignees, readGlobalProjects } from "../utils/ui-state.ts";
import type { AppContext, ViewMode } from "../types/app.ts";
import {
  type DomainConfig,
  type DomainFilterState,
  type DynamicFilterOptions,
  effectiveDateRangeFilter,
  type Entity,
} from "./domain.types.ts";

/** The bound filter/state helpers for one domain (see createFilterHelpers). */
export interface FilterHelpers<T extends Entity> {
  buildCanonicalUrl(state: DomainFilterState): string;
  buildState(merged: Record<string, string>): DomainFilterState;
  serializeFilterState(state: DomainFilterState): Record<string, string>;
  sameStringMap(a: Record<string, string>, b: Record<string, unknown>): boolean;
  applyFilters(
    items: T[],
    state: DomainFilterState,
    dynamicOpts?: DynamicFilterOptions,
  ): T[];
  applyGlobalFilters(items: T[], c: AppContext): Promise<T[]>;
  loadItems(c: AppContext, state: DomainFilterState): Promise<T[]>;
}

/**
 * Build the filter/state helpers for a domain. Each closes over the domain
 * config plus the route factory's computed `stateKeys`, date-range descriptor,
 * and archive flag, so callers invoke them with request data only.
 */
export function createFilterHelpers<T extends Entity, C, U>(
  cfg: DomainConfig<T, C, U>,
  stateKeys: string[],
  dateRange: ReturnType<typeof effectiveDateRangeFilter>,
  archiveEnabled: boolean,
): FilterHelpers<T> {
  type KeyEmitter = (state: DomainFilterState, p: URLSearchParams) => void;
  const KEY_EMITTERS: Record<string, KeyEmitter> = {
    view: (s, p) => {
      if (s.view && s.view !== (cfg.defaultView || "grid")) {
        p.set("view", s.view);
      }
    },
    hideCompleted: (s, p) => {
      if (s.hideCompleted) p.set("hideCompleted", "true");
    },
    archived: (s, p) => {
      if (s.archived === "true") p.set("archived", "true");
    },
    showHidden: (s, p) => {
      if (s.showHidden === "true" || s.showHidden === true) {
        p.set("showHidden", "true");
      }
    },
    order: (s, p) => {
      if (s.order && s.order !== "asc") p.set("order", s.order);
    },
  };

  function buildCanonicalUrl(state: DomainFilterState): string {
    const params = new URLSearchParams();
    for (const key of stateKeys) {
      const emitter = KEY_EMITTERS[key];
      if (emitter) {
        emitter(state, params);
      } else {
        const val = state[key];
        if (val !== undefined && val !== "") params.set(key, String(val));
      }
    }
    const qs = params.toString();
    return `${cfg.path}${qs ? `?${qs}` : ""}`;
  }

  function buildState(merged: Record<string, string>): DomainFilterState {
    const state: DomainFilterState = {
      view: (merged.view || cfg.defaultView || "grid") as ViewMode,
      q: merged.q || undefined,
      hideCompleted: merged.hideCompleted === "true",
      sort: merged.sort || undefined,
      order: (merged.order || "asc") as "asc" | "desc",
    };
    // Copy domain-specific filter keys (status, project, etc.).
    for (const key of stateKeys) {
      if (
        key !== "view" && key !== "q" && key !== "hideCompleted" &&
        key !== "sort" && key !== "order"
      ) {
        state[key] = merged[key] || undefined;
      }
    }
    return state;
  }

  // Serialize the live filter state to a string map for account storage,
  // skipping defaults (mirrors buildCanonicalUrl) so the saved blob stays lean.
  function serializeFilterState(
    state: DomainFilterState,
  ): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, val] of Object.entries(state)) {
      if (val === undefined || val === null || val === "") continue;
      if (key === "view" && val === (cfg.defaultView || "grid")) continue;
      if (key === "order" && val === "asc") continue;
      if (typeof val === "boolean") {
        if (val) out[key] = "true";
        continue;
      }
      out[key] = String(val);
    }
    return out;
  }

  function sameStringMap(
    a: Record<string, string>,
    b: Record<string, unknown>,
  ): boolean {
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    for (const k of ak) {
      if (a[k] !== String(b[k])) return false;
    }
    return true;
  }

  function filterHideCompleted(items: T[], state: DomainFilterState): T[] {
    if (!state.hideCompleted || !cfg.hideCompleted) return items;
    const { field, value, exceptField, exceptValue } = cfg.hideCompleted;
    const values = Array.isArray(value) ? value : [value];
    return items.filter((item) => {
      // Exempt matching items (e.g. the Done section) from the strip — the
      // view collapses them instead of the filter silently emptying them.
      if (
        exceptField &&
        String(item[exceptField as keyof T] ?? "") === exceptValue
      ) {
        return true;
      }
      return !values.includes(String(item[field as keyof T] ?? ""));
    });
  }

  function filterDynamic(
    items: T[],
    state: DomainFilterState,
    dynamicOpts?: DynamicFilterOptions,
  ): T[] {
    if (!cfg.filters) return items;
    let result = items;
    for (const f of cfg.filters) {
      // Computed filters defer to the domain's customFilter — the dropdown
      // value is still read into state, but applyFilters does not match it
      // against an entity field.
      if (f.computed) continue;
      const val = state[f.name];
      if (!val || typeof val !== "string") continue;
      const field = f.field ?? f.name;
      if (val === "__unassigned__") {
        // Build set of known valid values (excluding __unassigned__ itself)
        const opts = dynamicOpts?.[f.name];
        const validValues = opts
          ? new Set(
            opts
              .map((o) => typeof o === "string" ? o : o.value)
              .filter((v) => v !== "__unassigned__"),
          )
          : null;
        result = result.filter((item) => {
          const itemVal = item[field as keyof T];
          if (itemVal === undefined || itemVal === null || itemVal === "") {
            return true;
          }
          // Also match values not in the known valid set (orphaned refs)
          return validValues ? !validValues.has(String(itemVal)) : false;
        });
      } else {
        result = result.filter((item) => {
          const itemVal = item[field as keyof T];
          if (Array.isArray(itemVal)) {
            return (itemVal as string[]).some((v) => v === val);
          }
          return String(itemVal ?? "") === val;
        });
      }
    }
    return result;
  }

  function filterDateRange(items: T[], state: DomainFilterState): T[] {
    const { field, fromKey, toKey } = dateRange;
    const from = state[fromKey] as string | undefined;
    const to = state[toKey] as string | undefined;
    if (!from && !to) return items;
    // Compare only the YYYY-MM-DD portion so a full ISO timestamp field
    // (e.g. createdAt) bounds inclusively against a date input.
    const dateOf = (item: T) =>
      String((item as Record<string, unknown>)[field] ?? "").slice(0, 10);
    let result = items;
    if (from) result = result.filter((item) => dateOf(item) >= from);
    if (to) result = result.filter((item) => dateOf(item) <= to);
    return result;
  }

  function filterSearch(items: T[], state: DomainFilterState): T[] {
    if (!state.q) return items;
    const q = (state.q as string).toLowerCase();
    if (cfg.searchPredicate) {
      return items.filter((item) => cfg.searchPredicate!(item, q));
    }
    return items.filter((item) => {
      for (const key of Object.keys(item as Record<string, unknown>)) {
        const val = (item as Record<string, unknown>)[key];
        if (typeof val === "string" && val.toLowerCase().includes(q)) {
          return true;
        }
      }
      return false;
    });
  }

  function filterSort(items: T[], state: DomainFilterState): T[] {
    if (!state.sort) return items;
    const key = state.sort as string;
    const dir = state.order === "desc" ? -1 : 1;
    return [...items].sort((a, b) => {
      const av = (a as Record<string, unknown>)[key];
      const bv = (b as Record<string, unknown>)[key];
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * dir;
      }
      return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
    });
  }

  function applyFilters(
    items: T[],
    state: DomainFilterState,
    dynamicOpts?: DynamicFilterOptions,
  ): T[] {
    let result = filterHideCompleted(items, state);
    result = filterDynamic(result, state, dynamicOpts);
    result = filterDateRange(result, state);
    result = filterSearch(result, state);
    result = filterSort(result, state);
    return result;
  }

  async function applyGlobalFilters(items: T[], c: AppContext): Promise<T[]> {
    let result = items;
    const globalProjects = readGlobalProjects(c as never);
    if (globalProjects.length > 0 && cfg.projectField) {
      const field = cfg.projectField;
      result = result.filter((item) =>
        globalProjects.includes(
          String((item as Record<string, unknown>)[field] ?? ""),
        )
      );
    }
    const globalAssignees = readGlobalAssignees(c as never);
    if (globalAssignees.length > 0 && cfg.assigneeField) {
      const field = cfg.assigneeField;
      // When the domain stores person IDs (not names), resolve to names for comparison.
      const matchValues = globalAssignees;
      if (cfg.assigneeIsId) {
        const people = await getPeopleService().list();
        const idToName = new Map(people.map((p) => [p.id, p.name]));
        result = result.filter((item) => {
          const id = String((item as Record<string, unknown>)[field] ?? "");
          const name = idToName.get(id) ?? id;
          return matchValues.includes(name);
        });
      } else {
        result = result.filter((item) =>
          matchValues.includes(
            String((item as Record<string, unknown>)[field] ?? ""),
          )
        );
      }
    }
    if (cfg.customFilter) {
      result = await cfg.customFilter(result, c);
    }
    return result;
  }

  // List source resolver — archived view substitutes service.listArchived().
  // Used by all three list endpoints (/, /view, /more) so the source switch
  // happens in one place. `cfg.listForRequest` still wins when set — domains
  // with per-request item sources own their own archive behaviour.
  async function loadItems(
    c: AppContext,
    state: DomainFilterState,
  ): Promise<T[]> {
    if (cfg.listForRequest) return cfg.listForRequest(c);
    if (archiveEnabled && state.archived === "true") {
      const archived = await cfg.getService().listArchived?.();
      return archived ?? [];
    }
    return cfg.getService().list();
  }

  return {
    buildCanonicalUrl,
    buildState,
    serializeFilterState,
    sameStringMap,
    applyFilters,
    applyGlobalFilters,
    loadItems,
  };
}
