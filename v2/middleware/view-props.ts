// Extract shared view props from Hono context — avoids repeating
// c.get("enabledFeatures"), c.get("pinnedKeys"), etc. in every route.

import type { Context } from "hono";
import type { AppVariables, ViewProps } from "../types/app.ts";

// deno-lint-ignore no-explicit-any
type Ctx = Context<{ Variables: AppVariables }, any, any>;

export function viewProps(c: Ctx, activePath?: string): ViewProps {
  return {
    nonce: c.get("nonce"),
    activePath,
    enabledFeatures: c.get("enabledFeatures"),
    pinnedKeys: c.get("pinnedKeys"),
    navCategories: c.get("navCategories"),
  };
}
