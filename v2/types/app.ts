// Shared Hono context variable types — imported by bin.ts and all routers.

import type { Context } from "hono";

export type AppVariables = {
  nonce: string;
  enabledFeatures: string[];
  pinnedKeys: string[];
  navCategories?: Record<string, string[]>;
};

// Base props for all SSR views — every view receives nonce + activePath + sidebar state.
export type ViewProps = {
  nonce?: string;
  activePath?: string;
  enabledFeatures?: string[];
  pinnedKeys?: string[];
  navCategories?: Record<string, string[]>;
};

/** Typed Hono context with AppVariables. Use in route handlers. */
// deno-lint-ignore no-explicit-any
export type AppContext = Context<{ Variables: AppVariables }, any, any>;

// View mode for domain list pages — grid (card) or table.
export type ViewMode = "grid" | "table";
