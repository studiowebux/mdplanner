// Domain route factory — generates a full Hono router (list, view fragment,
// form CRUD, delete) from a DomainConfig. No domain-specific logic.

import { Hono } from "hono";
import { publish } from "../singletons/event-bus.ts";
import { mergeParams, readUiState, writeUiState } from "../utils/ui-state.ts";
import { hxTrigger } from "../utils/hx-trigger.ts";
import { viewProps } from "../middleware/view-props.ts";
import type { AppVariables, ViewMode } from "../types/app.ts";
import type {
  DomainConfig,
  DomainFilterState,
  Entity,
} from "./domain.types.ts";
import { createDomainPage } from "./domain-view.tsx";
import { createDomainForm } from "./domain-view.tsx";

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

  function applyFilters(items: T[], state: DomainFilterState): T[] {
    let result = items;

    // Hide completed
    if (state.hideCompleted && cfg.hideCompleted) {
      const { field, value } = cfg.hideCompleted;
      result = result.filter((item) =>
        String(item[field as keyof T] ?? "") !== value
      );
    }

    // Dynamic filters (status, project, etc.)
    if (cfg.filters) {
      for (const f of cfg.filters) {
        const val = state[f.name];
        if (val && typeof val === "string") {
          const field = f.field ?? f.name;
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
      result = [...result].sort((a, b) =>
        String((a as Record<string, unknown>)[key] ?? "")
          .localeCompare(String((b as Record<string, unknown>)[key] ?? "")) *
        dir
      );
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
    const state = buildState(mergeParams(params, saved));
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
    const filtered = applyFilters(all, state);
    const customContent = extraKeys.has(state.view) && cfg.customViewRenderer
      ? await cfg.customViewRenderer(
        state.view,
        state,
        filtered,
        c.get("nonce"),
      )
      : undefined;
    return c.html(
      DomainPage({
        ...viewProps(c, cfg.path),
        items: filtered,
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
    const filtered = applyFilters(all, state);
    const customContent = extraKeys.has(state.view) && cfg.customViewRenderer
      ? await cfg.customViewRenderer(
        state.view,
        state,
        filtered,
        c.get("nonce"),
      )
      : undefined;
    return c.html(
      DomainViewContainer({
        items: filtered,
        state,
        fragment: true,
        customContent,
      }) as unknown as string,
    );
  });

  // ---------------------------------------------------------------------------
  // Form routes
  // ---------------------------------------------------------------------------

  // Empty create form
  router.get("/new", (c) => {
    return c.html(DomainForm({}) as unknown as string);
  });

  // Create submission
  router.post("/new", async (c) => {
    const body = await c.req.parseBody();
    try {
      const data = cfg.parseCreate(body as Record<string, string | File>);
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
    return c.html(
      DomainForm({ item, displayValues }) as unknown as string,
    );
  });

  // Update submission
  router.post("/:id/edit", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.parseBody();
    try {
      const data = cfg.parseUpdate(body as Record<string, string | File>);
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
