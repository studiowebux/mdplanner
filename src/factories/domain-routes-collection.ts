// Domain collection routes — the UI-state middleware and the three list
// endpoints (full page `/`, view fragment `/view`, pagination `/more`). Split
// from the domain route factory; registered before the entity routes so the
// `*` middleware wraps every domain route (state persistence is request-wide).

import type { Hono } from "hono";
import { getPeopleService } from "../singletons/services.ts";
import { mergeParams } from "../utils/ui-state.ts";
import { toHtml } from "../utils/html.ts";
import { viewProps } from "../middleware/view-props.ts";
import type { AppVariables } from "../types/app.ts";
import {
  type DomainConfig,
  type DomainFilterState,
  type Entity,
} from "./domain.types.ts";
import { createDomainPage, createMoreFragment } from "./domain-view.tsx";
import type { FilterHelpers } from "./domain-routes-helpers.ts";

type Router = Hono<{ Variables: AppVariables }>;

/**
 * UI-state middleware: resolve filter state from query params + the user's saved
 * account preferences, expose it as `filterState`, and persist any change back
 * to the account after the request. Registered first so it wraps all routes.
 */
export function registerStateMiddleware<T extends Entity, C, U>(
  router: Router,
  cfg: DomainConfig<T, C, U>,
  opts: {
    stateKeys: string[];
    archiveEnabled: boolean;
    helpers: FilterHelpers<T>;
  },
) {
  const { stateKeys, archiveEnabled, helpers } = opts;
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

    const state = helpers.buildState(merged);
    c.set("filterState" as never, state as never);
    await next();

    // Persist last-used filter state to the account — only when there is an
    // actor and the state actually changed, so the person file isn't rewritten
    // on every request.
    if (actorId) {
      const serialized = helpers.serializeFilterState(state);
      if (!helpers.sameStringMap(serialized, saved)) {
        await getPeopleService().updatePreferences(actorId, {
          uiState: { [cfg.name]: serialized },
        });
      }
    }
  });
}

/** List endpoints: full page `/`, view fragment `/view`, pagination `/more`. */
export function registerCollectionRoutes<T extends Entity, C, U>(
  router: Router,
  cfg: DomainConfig<T, C, U>,
  opts: { extraKeys: Set<string>; helpers: FilterHelpers<T> },
) {
  const { extraKeys, helpers } = opts;
  const { DomainPage, DomainViewContainer } = createDomainPage(cfg);

  // Full page
  router.get("/", async (c) => {
    const state = c.get("filterState" as never) as DomainFilterState;
    const all = await helpers.loadItems(c, state);
    const dynamicFilterOptions = await cfg.extractFilterOptions?.(all);
    const filtered = await helpers.applyGlobalFilters(
      helpers.applyFilters(all, state, dynamicFilterOptions),
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
    const all = await helpers.loadItems(c, state);
    const dynamicFilterOptions = await cfg.extractFilterOptions?.(all);
    const filtered = await helpers.applyGlobalFilters(
      helpers.applyFilters(all, state, dynamicFilterOptions),
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
      { "HX-Replace-Url": helpers.buildCanonicalUrl(state) },
    );
  });

  // Pagination — load next page of items (table rows or grid cards)
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
      const filtered = await helpers.applyGlobalFilters(
        helpers.applyFilters(all, state, dynamicFilterOptions),
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
}
