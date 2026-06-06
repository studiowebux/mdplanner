// Domain route factory — generates a full Hono router (list, view fragment,
// form CRUD, delete, archive, detail) from a DomainConfig. No domain-specific
// logic. The route handlers live in the collection/entity modules and the pure
// filter/state logic in domain-routes-helpers.ts; this file computes the shared
// state keys and wires the three registration steps together.

import { Hono } from "hono";
import type { AppVariables } from "../types/app.ts";
import {
  type DomainConfig,
  effectiveDateRangeFilter,
  type Entity,
} from "./domain.types.ts";
import { createFilterHelpers } from "./domain-routes-helpers.ts";
import {
  registerCollectionRoutes,
  registerStateMiddleware,
} from "./domain-routes-collection.ts";
import { registerEntityRoutes } from "./domain-routes-entity.ts";

export function createDomainRoutes<T extends Entity, C, U>(
  cfg: DomainConfig<T, C, U>,
) {
  const router = new Hono<{ Variables: AppVariables }>();

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
  const extraKeys = new Set((cfg.extraViewModes ?? []).map((m) => m.key));
  const helpers = createFilterHelpers(
    cfg,
    stateKeys,
    dateRange,
    archiveEnabled,
  );

  // Middleware first so its `*` matcher wraps every route registered after it.
  registerStateMiddleware(router, cfg, { stateKeys, archiveEnabled, helpers });
  registerCollectionRoutes(router, cfg, { extraKeys, helpers });
  registerEntityRoutes(router, cfg, { archiveEnabled });

  return router;
}
