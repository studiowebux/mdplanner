// Domain route factory — generates a full Hono router (list, view fragment,
// form CRUD, delete) from a DomainConfig. No domain-specific logic.

import { Hono } from "hono";
import { publish } from "../singletons/event-bus.ts";
import { getPeopleService } from "../singletons/services.ts";
import {
  mergeParams,
  readGlobalAssignees,
  readGlobalProjects,
} from "../utils/ui-state.ts";
import { hxTrigger } from "../utils/hx-trigger.ts";
import { toHtml } from "../utils/html.ts";
import { viewProps } from "../middleware/view-props.ts";
import type { AppContext, AppVariables, ViewMode } from "../types/app.ts";
import {
  type DomainConfig,
  type DomainFilterState,
  type DynamicFilterOptions,
  effectiveDateRangeFilter,
  type Entity,
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
  const DomainForm = createDomainForm<T>({
    domain: cfg.name,
    singular: cfg.singular,
    fields: cfg.formFields,
    inlineEditFields: cfg.inlineEditFields,
    formValueOverrides: cfg.formValueOverrides,
  });

  // Injected state keys — added here so every domain gets them without editing
  // 40+ domain configs' stateKeys arrays:
  //  - date range from/to keys: the universal date range filter.
  //  - archived: "Show archived" toggle (only when supportsArchive !== false).
  const dateRange = effectiveDateRangeFilter(cfg);
  const archiveEnabled = cfg.supportsArchive !== false;
  const stateKeys = [
    ...cfg.stateKeys,
    ...(cfg.stateKeys.includes(dateRange.fromKey) ? [] : [dateRange.fromKey]),
    ...(cfg.stateKeys.includes(dateRange.toKey) ? [] : [dateRange.toKey]),
    ...(archiveEnabled && !cfg.stateKeys.includes("archived")
      ? ["archived"]
      : []),
  ];

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function buildCanonicalUrl(state: DomainFilterState): string {
    const params = new URLSearchParams();
    for (const key of stateKeys) {
      if (key === "view") {
        if (state.view && state.view !== (cfg.defaultView || "grid")) {
          params.set("view", state.view);
        }
      } else if (key === "hideCompleted") {
        if (state.hideCompleted) params.set("hideCompleted", "true");
      } else if (key === "archived") {
        if (state.archived === "true") params.set("archived", "true");
      } else if (key === "showHidden") {
        if (state.showHidden === "true" || state.showHidden === true) {
          params.set("showHidden", "true");
        }
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
        // Computed filters defer to the domain's customFilter — the dropdown
        // value is still read into state, but applyFilters does not match it
        // against an entity field.
        if (f.computed) continue;
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

    // Date range filter. Compare only the YYYY-MM-DD portion so a full ISO
    // timestamp field (e.g. createdAt) bounds inclusively against a date input.
    {
      const { field, fromKey, toKey } = dateRange;
      const from = state[fromKey] as string | undefined;
      const to = state[toKey] as string | undefined;
      const dateOf = (item: T) =>
        String((item as Record<string, unknown>)[field] ?? "").slice(0, 10);
      if (from) result = result.filter((item) => dateOf(item) >= from);
      if (to) result = result.filter((item) => dateOf(item) <= to);
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
  // List source resolver — archived view substitutes service.listArchived().
  // Used by all three list endpoints (/, /view, /more) so the source switch
  // happens in one place. `cfg.listForRequest` still wins when set — domains
  // with per-request item sources own their own archive behaviour.
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Middleware — UI state from cookie + query params
  // ---------------------------------------------------------------------------

  router.use("*", async (c, next) => {
    const isHtmx = c.req.header("HX-Request") === "true";
    const activePerson = c.get("activePerson" as never) as {
      id?: string;
      preferences?: {
        viewPrefs?: Record<string, string>;
        filterDefaults?: Record<string, Record<string, string>>;
        uiState?: Record<string, Record<string, string>>;
      };
    } | undefined;
    const actorId = activePerson?.id;
    const personPrefs = activePerson?.preferences;
    // Last-used filter state lives in the user's account (preferences.uiState),
    // not a browser cookie. Anonymous requests (no actor) do not persist.
    const saved: Record<string, unknown> = personPrefs?.uiState?.[cfg.name] ??
      {};

    const params: Record<string, string | undefined> = {};
    for (const key of stateKeys) {
      params[key] = c.req.query(key);
    }
    // Boolean toolbar toggles (hideCompleted / archived / showHidden) submit
    // via htmx form-include. An unchecked checkbox is OMITTED from the form
    // per the HTML spec, so mergeParams would otherwise fall back to the
    // saved account value and the toggle would stay stuck "on". Force the
    // absent key to "false" for htmx requests so the uncheck round-trips.
    // Only inject the key when the domain actually renders that toggle.
    if (isHtmx) {
      if (cfg.hideCompleted && params.hideCompleted === undefined) {
        params.hideCompleted = "false";
      }
      if (archiveEnabled && params.archived === undefined) {
        params.archived = "false";
      }
      if (cfg.showHiddenToggle && params.showHidden === undefined) {
        params.showHidden = "false";
      }
    }
    const merged = mergeParams(params, saved);

    // Configured defaults (Settings) as a fallback when nothing is saved.
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

    // Persist last-used filter state to the account — only when there is an
    // actor and the state actually changed, so the person file isn't rewritten
    // on every request.
    if (actorId) {
      const serialized = serializeFilterState(state);
      if (!sameStringMap(serialized, saved)) {
        await getPeopleService().updatePreferences(actorId, {
          uiState: { [cfg.name]: serialized },
        });
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Views
  // ---------------------------------------------------------------------------

  const extraKeys = new Set((cfg.extraViewModes ?? []).map((m) => m.key));

  // Full page
  router.get("/", async (c) => {
    const state = c.get("filterState" as never) as DomainFilterState;
    const all = await loadItems(c, state);
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
    const topSlotContent = cfg.topSlot ? await cfg.topSlot(c) : undefined;
    return c.html(
      toHtml(
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
          topSlotContent,
        }),
      ),
    );
  });

  // View fragment
  router.get("/view", async (c) => {
    const state = c.get("filterState" as never) as DomainFilterState;
    const all = await loadItems(c, state);
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
      toHtml(DomainViewContainer({
        items,
        totalCount: all.length,
        filteredCount: filtered.length,
        hasMore,
        nextOffset,
        state,
        fragment: true,
        customContent,
      })),
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
      const all = cfg.listForRequest
        ? await cfg.listForRequest(c)
        : await cfg.getService().list();
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
        toHtml(MoreFragment({
          items: slice,
          state,
          hasMore,
          nextOffset,
          view,
        })),
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
      toHtml(DomainForm({ dynamicOptions, prefillValues })),
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
    const arrayDisplayValues = await cfg.resolveArrayDisplayValues?.(item);
    const dynamicOptions = await cfg.extractFormOptions?.();
    return c.html(
      toHtml(DomainForm({
        item,
        displayValues,
        arrayDisplayValues,
        dynamicOptions,
      })),
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

  // Delete (soft-delete by default — see DomainConfig.supportsArchive).
  // Base/Cached repo route `delete` through `archive` when the repo opts in;
  // emit `.updated` so a detail page open on the archived item re-renders
  // with the archived banner, plus `.deleted` for list-view listeners.
  router.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const actor = c.get("actor");
    const by = actor && actor.source !== "anonymous" ? actor.name : undefined;
    const ok = archiveEnabled
      ? await (cfg.getService().archive
        ? cfg.getService().archive!(id, by)
        : cfg.getService().delete(id))
      : await cfg.getService().delete(id);
    if (!ok) {
      return new Response(null, {
        status: 404,
        headers: {
          "HX-Trigger": hxTrigger("error", `${cfg.singular} not found`),
        },
      });
    }
    publish(`${cfg.ssePrefix}.deleted`);
    if (archiveEnabled) publish(`${cfg.ssePrefix}.updated`);
    return new Response(null, {
      status: 204,
      headers: {
        "HX-Trigger": hxTrigger(
          "success",
          archiveEnabled
            ? `${cfg.singular} archived`
            : `${cfg.singular} deleted`,
        ),
      },
    });
  });

  // Restore + Destroy (only when archive is enabled).
  if (archiveEnabled) {
    // Restore: clear the archived flag. Emits `.restored` (archived-view
    // listeners can drop the row) + `.updated` (detail-page re-render).
    router.post("/:id/restore", async (c) => {
      const id = c.req.param("id");
      const ok = await cfg.getService().restore?.(id);
      if (!ok) {
        return new Response(null, {
          status: 404,
          headers: {
            "HX-Trigger": hxTrigger("error", `${cfg.singular} not found`),
          },
        });
      }
      publish(`${cfg.ssePrefix}.restored`);
      publish(`${cfg.ssePrefix}.updated`);
      return new Response(null, {
        status: 204,
        headers: {
          "HX-Trigger": hxTrigger("success", `${cfg.singular} restored`),
        },
      });
    });

    // Permanently delete: file removed from disk (no recovery).
    router.post("/:id/destroy", async (c) => {
      const id = c.req.param("id");
      const ok = await cfg.getService().hardDelete?.(id);
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
          "HX-Trigger": hxTrigger(
            "success",
            `${cfg.singular} permanently deleted`,
          ),
        },
      });
    });
  }

  // Detail view (if provided)
  if (cfg.DetailView) {
    router.get("/:id", async (c) => {
      const id = c.req.param("id");
      const item = await cfg.getService().getById(id);
      if (!item) return c.notFound();
      return c.html(
        toHtml(cfg.DetailView!({
          ...viewProps(c, cfg.path),
          item,
        })),
      );
    });
  }

  return router;
}
