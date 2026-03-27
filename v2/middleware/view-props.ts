// Extract shared view props from Hono context — avoids repeating
// c.get("enabledFeatures"), c.get("pinnedKeys"), etc. in every route.

import type { AppContext, ViewProps } from "../types/app.ts";

export function viewProps(c: AppContext, activePath?: string): ViewProps {
  return {
    nonce: c.get("nonce"),
    activePath,
    enabledFeatures: c.get("enabledFeatures"),
    pinnedKeys: c.get("pinnedKeys"),
    navCategories: c.get("navCategories"),
  };
}
