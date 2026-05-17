// Domain route factory — generates a full Hono router (list, view fragment,
// form CRUD, delete) from a DomainConfig. No domain-specific logic.

import { Hono } from "hono";
import { publish } from "../singletons/event-bus.ts";
import { getPeopleService } from "../singletons/services.ts";
import {
  mergeParams,
  readGlobalAssignees,
  readGlobalProjects,
  readUiState,
  writeUiState,
} from "../utils/ui-state.ts";
import { hxTrigger } from "../utils/hx-trigger.ts";
import { viewProps } from "../middleware/view-props.ts";
import type { AppContext, AppVariables, ViewMode } from "../types/app.ts";
import type {
  DomainConfig,
  DomainFilterState,
  DynamicFilterOptions,
  Entity,
} from "./domain.types.ts";
import {
  createDomainForm,
  createDomainPage,
  createMoreFragment,
} from "./domain-view.tsx";

export function createDomainRoutes<T extends Entity, C, U>(
  cfg: DomainConfig<T, C, U>,
) {
  const router = new Hono<{ Variables: AppVariables }>();
  const { DomainPage, DomainViewContainer } = createDomainPage(cfg);
  const DomainForm = createDomainForm({
    domain: cfg.name,
    singular: cfg.singular,
    fields: cfg.formFields,
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function buildCanonicalUrl(state: DomainFilterState): string {
    const params = new URLSearchParams();
    for (const key of cfg.stateKeys) {
      if (key === "view") {
        if (state.view && state.view !== (cfg.defaultView || "grid")) {
          params.set("view", state.view);
        }
      } else if (key === "hideCompleted") {
        if (state.hideCompleted) params.set("hideCompleted", "true");
      } else if (key === "order") {
        if (state.order && state.order !== "asc") {
          params.set("order", state.order);
        }
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
    // Copy domain-specific filter keys (status, project, etc.)
    for (const key of cfg.stateKeys) {
      if (
        key !== "view" && key !== "q" && key !== "hideCompleted" &&
        key !== "sort" && key !== "order"
      ) {
        state[key] = merged[key] || undefined;
      }
    }
    return state;
  }

  function applyFilters(
    items: T[],
    state: DomainFilterState,
    dynamicOpts?: DynamicFilterOptions,
  ): T[] {
    let result = items;

    // Hide completed
    if (state.hideCompleted && cfg.hideCompleted) {
      const { field, value } = cfg.hideCompleted;
      const values = Array.isArray(value) ? value : [value];
      result = result.filter((item) =>
        !values.includes(String(item[field as keyof T] ?? ""))
      );
    }

    // Dynamic filters (status, project, etc.)
    if (cfg.filters) {
      for (const f of cfg.filters) {
        const val = state[f.name];
        if (val && typeof val === "string") {
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
      }
    }

    // Date range filter
    if (cfg.dateRangeFilter) {
      const { field, fromKey = "date_from", toKey = "date_to" } =
        cfg.dateRangeFilter;
      const from = state[fromKey] as string | undefined;
      const to = state[toKey] as string | undefined;
      if (from) {
        result = result.filter(
          (item) =>
            String((item as Record<string, unknown>)[field] ?? "") >= from,
        );
      }
      if (to) {
        result = result.filter(
          (item) =>
            String((item as Record<string, unknown>)[field] ?? "") <= to,
        );
      }
    }

    // Text search
    if (state.q) {
      const q = (state.q as string).toLowerCase();
      if (cfg.searchPredicate) {
        result = result.filter((item) => cfg.searchPredicate!(item, q));
      } else {
        result = result.filter((item) => {
          for (const key of Object.keys(item as Record<string, unknown>)) {
            const val = (item as Record<string, unknown>)[key];
            if (typeof val === "string" && val.toLowerCase().includes(q)) {
              return true;
            }
          }
          return false;
        });
      }
    }

    // Sort
    if (state.sort) {
      const key = state.sort as string;
      const dir = state.order === "desc" ? -1 : 1;
      result = [...result].sort((a, b) => {
        const av = (a as Record<string, unknown>)[key];
        const bv = (b as Record<string, unknown>)[key];
        if (typeof av === "number" && typeof bv === "number") {
          return (av - bv) * dir;
        }
        return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
      });
    }

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

  // ---------------------------------------------------------------------------
  // Middleware — UI state from cookie + query params
  // ---------------------------------------------------------------------------

  router.use("*", async (c, next) => {
    const isHtmx = c.req.header("HX-Request") === "true";
    const saved = readUiState<DomainFilterState>(c, cfg.name);
    const params: Record<string, string | undefined> = {};
    for (const key of cfg.stateKeys) {
      params[key] = c.req.query(key);
    }
    if (isHtmx && params.hideCompleted === undefined) {
      params.hideCompleted = "false";
    }
    const merged = mergeParams(params, saved);

    // Apply PersonPreferences as fallback for keys not set by query param or cookie.
    const personPrefs = (c.get("activePerson" as never) as {
      preferences?: {
        viewPrefs?: Record<string, string>;
        filterDefaults?: Record<string, Record<string, string>>;
      };
    } | undefined)?.preferences;
    if (personPrefs) {
      if (!merged.view && personPrefs.viewPrefs?.[cfg.name]) {
        merged.view = personPrefs.viewPrefs[cfg.name];
      }
      const domainFilterDefaults = personPrefs.filterDefaults?.[cfg.name];
      if (domainFilterDefaults) {
        for (const key of cfg.stateKeys) {
          if (key !== "view" && !merged[key] && domainFilterDefaults[key]) {
            merged[key] = domainFilterDefaults[key];
          }
        }
      }
    }

    const state = buildState(merged);
    c.set("filterState" as never, state as never);
    await next();
    writeUiState(c, cfg.name, state);
  });

  // ---------------------------------------------------------------------------
  // Views
  // ---------------------------------------------------------------------------

  const extraKeys = new Set((cfg.extraViewModes ?? []).map((m) => m.key));

  // Full page
  router.get("/", async (c) => {
    const state = c.get("filterState" as never) as DomainFilterState;
    const all = await cfg.getService().list();
    const dynamicFilterOptions = await cfg.extractFilterOptions?.(all);
    const filtered = await applyGlobalFilters(
      applyFilters(all, state, dynamicFilterOptions),
      c,
    );
    const pageSize = state.limit
      ? parseInt(String(state.limit), 10)
      : cfg.pageSize;
    const items = pageSize ? filtered.slice(0, pageSize) : filtered;
    const hasMore = !!pageSize && filtered.length > pageSize;
    const nextOffset = pageSize ?? 0;
    const customContent = extraKeys.has(state.view) && cfg.customViewRenderer
      ? await cfg.customViewRenderer(
        state.view,
        state,
        items,
        c.get("nonce"),
      )
      : undefined;
    return c.html(
      await DomainPage({
        ...viewProps(c, cfg.path),
        items,
        totalCount: all.length,
        filteredCount: filtered.length,
        hasMore,
        nextOffset,
        state,
        dynamicFilterOptions,
        customContent,
      }) as unknown as string,
    );
  });

  // View fragment
  router.get("/view", async (c) => {
    const state = c.get("filterState" as never) as DomainFilterState;
    const all = await cfg.getService().list();
    const dynamicFilterOptions = await cfg.extractFilterOptions?.(all);
    const filtered = await applyGlobalFilters(
      applyFilters(all, state, dynamicFilterOptions),
      c,
    );
    const pageSize = state.limit
      ? parseInt(String(state.limit), 10)
      : cfg.pageSize;
    const items = pageSize ? filtered.slice(0, pageSize) : filtered;
    const hasMore = !!pageSize && filtered.length > pageSize;
    const nextOffset = pageSize ?? 0;
    const customContent = extraKeys.has(state.view) && cfg.customViewRenderer
      ? await cfg.customViewRenderer(
        state.view,
        state,
        items,
        c.get("nonce"),
      )
      : undefined;
    return c.html(
      DomainViewContainer({
        items,
        totalCount: all.length,
        filteredCount: filtered.length,
        hasMore,
        nextOffset,
        state,
        fragment: true,
        customContent,
      }) as unknown as string,
      200,
      { "HX-Replace-Url": buildCanonicalUrl(state) },
    );
  });

  // ---------------------------------------------------------------------------
  // Pagination — load next page of items (table rows or grid cards)
  // ---------------------------------------------------------------------------

  if (cfg.pageSize) {
    const MoreFragment = createMoreFragment(cfg);

    router.get("/more", async (c) => {
      const offset = parseInt(c.req.query("offset") ?? "0", 10);
      const state = c.get("filterState" as never) as DomainFilterState;
      const pageSize = state.limit
        ? parseInt(String(state.limit), 10)
        : cfg.pageSize!;
      const all = await cfg.getService().list();
      const dynamicFilterOptions = await cfg.extractFilterOptions?.(all);
      const filtered = await applyGlobalFilters(
        applyFilters(all, state, dynamicFilterOptions),
        c,
      );
      const slice = filtered.slice(offset, offset + pageSize);
      const hasMore = filtered.length > offset + pageSize;
      const nextOffset = offset + pageSize;
      const view = state.view === "table" ? "table" : "grid";

      return c.html(
        MoreFragment({
          items: slice,
          state,
          hasMore,
          nextOffset,
          view,
        }) as unknown as string,
      );
    });
  }

  // ---------------------------------------------------------------------------
  // Form routes
  // ---------------------------------------------------------------------------

  // Empty create form — query params forwarded as prefillValues for hidden fields
  router.get("/new", async (c) => {
    const dynamicOptions = await cfg.extractFormOptions?.();
    const query = c.req.query();
    const prefillValues = Object.keys(query).length > 0 ? query : undefined;
    return c.html(
      DomainForm({ dynamicOptions, prefillValues }) as unknown as string,
    );
  });

  // Create submission
  router.post("/new", async (c) => {
    const body = await c.req.parseBody();
    try {
      const data = cfg.parseCreate(body as Record<string, string | File>);
      const actor = c.get("actor");
      if (actor && actor.source !== "anonymous") {
        (data as Record<string, unknown>).createdBy = actor.name;
        (data as Record<string, unknown>).updatedBy = actor.name;
      }
      await cfg.getService().create(data);
      publish(`${cfg.ssePrefix}.created`);
      return new Response(null, {
        status: 204,
        headers: {
          "HX-Trigger": hxTrigger("success", `${cfg.singular} created`),
        },
      });
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : `Failed to create ${cfg.singular.toLowerCase()}`;
      return new Response(null, {
        status: 422,
        headers: { "HX-Trigger": hxTrigger("error", message) },
      });
    }
  });

  // Populated edit form
  router.get("/:id/edit", async (c) => {
    const id = c.req.param("id");
    const item = await cfg.getService().getById(id);
    if (!item) return c.notFound();
    let displayValues: Record<string, string> | undefined;
    if (cfg.resolveFormValues) {
      const raw: Record<string, string> = {};
      for (const f of cfg.formFields) {
        raw[f.name] = String((item as Record<string, unknown>)[f.name] ?? "");
      }
      displayValues = await cfg.resolveFormValues(raw);
    }
    const dynamicOptions = await cfg.extractFormOptions?.();
    return c.html(
      DomainForm({ item, displayValues, dynamicOptions }) as unknown as string,
    );
  });

  // Update submission
  router.post("/:id/edit", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.parseBody();
    try {
      const data = cfg.parseUpdate(body as Record<string, string | File>);
      const actor = c.get("actor");
      if (actor && actor.source !== "anonymous") {
        (data as Record<string, unknown>).updatedBy = actor.name;
      }
      const updated = await cfg.getService().update(id, data as U);
      if (!updated) {
        return new Response(null, {
          status: 404,
          headers: {
            "HX-Trigger": hxTrigger("error", `${cfg.singular} not found`),
          },
        });
      }
      publish(`${cfg.ssePrefix}.updated`);
      return new Response(null, {
        status: 204,
        headers: {
          "HX-Trigger": hxTrigger("success", `${cfg.singular} updated`),
        },
      });
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : `Failed to update ${cfg.singular.toLowerCase()}`;
      return new Response(null, {
        status: 422,
        headers: { "HX-Trigger": hxTrigger("error", message) },
      });
    }
  });

  // Delete
  router.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const ok = await cfg.getService().delete(id);
    if (!ok) {
      return new Response(null, {
        status: 404,
        headers: {
          "HX-Trigger": hxTrigger("error", `${cfg.singular} not found`),
        },
      });
    }
    publish(`${cfg.ssePrefix}.deleted`);
    return new Response(null, {
      status: 204,
      headers: {
        "HX-Trigger": hxTrigger("success", `${cfg.singular} deleted`),
      },
    });
  });

  // Detail view (if provided)
  if (cfg.DetailView) {
    router.get("/:id", async (c) => {
      const id = c.req.param("id");
      const item = await cfg.getService().getById(id);
      if (!item) return c.notFound();
      return c.html(
        cfg.DetailView!({
          ...viewProps(c, cfg.path),
          item,
        }) as unknown as string,
      );
    });
  }

  return router;
}
