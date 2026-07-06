// Shared Hono context variable types — imported by bin.ts and all routers.

import type { Context } from "hono";
import type { Actor } from "./actor.ts";
import type { Person } from "./person.types.ts";

export type AppVariables = {
  nonce: string;
  enabledFeatures: string[];
  pinnedKeys: string[];
  navCategories?: Record<string, string[]>;
  actor: Actor;
  activePerson?: Person;
};

// Base props for all SSR views — every view receives nonce + activePath + sidebar state.
export type ViewProps = {
  nonce?: string;
  activePath?: string;
  enabledFeatures?: string[];
  pinnedKeys?: string[];
  navCategories?: Record<string, string[]>;
  actor?: Actor;
  activePerson?: Person;
  globalProjects?: string[];
  globalAssignees?: string[];
};

/** Typed Hono context with AppVariables. Use in route handlers. */
export type AppContext = Context<{ Variables: AppVariables }>;

// View mode for domain list pages — grid (card), table, or canvas (free-form).
export type ViewMode = "grid" | "table" | "canvas";

/** Maps person name → person ID for linking people in views. */
export type PersonByName = Record<string, string>;
