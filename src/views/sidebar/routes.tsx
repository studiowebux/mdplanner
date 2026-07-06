// Sidebar routes — pin/unpin toggle returns updated sidebar inner content.

import { Hono } from "hono";
import { SidebarContent } from "../../components/shell/sidebar.tsx";
import { getPeopleService } from "../../singletons/services.ts";
import type { AppVariables } from "../../types/app.ts";

export const sidebarRouter = new Hono<{ Variables: AppVariables }>();

// POST /sidebar/pin — toggle a key in the pinned list, return updated content.
sidebarRouter.post("/pin", async (c) => {
  const key = c.req.query("key") ?? "";
  if (!key) return c.text("Missing key", 400);

  // pinnedNav (PersonPreferences) is the single source of truth for pins;
  // contextMiddleware reads it into pinnedKeys for rendering.
  const current = c.var.activePerson?.preferences?.pinnedNav;
  const pinned = Array.isArray(current) ? [...current] : [];
  const idx = pinned.indexOf(key);
  if (idx >= 0) {
    pinned.splice(idx, 1);
  } else {
    pinned.push(key);
  }

  const personId = c.var.activePerson?.id;
  if (personId) {
    await getPeopleService().updatePreferences(personId, { pinnedNav: pinned });
  }

  const activePath = c.req.header("HX-Current-URL")
    ? new URL(c.req.header("HX-Current-URL")!).pathname
    : undefined;

  return c.html(
    <SidebarContent
      activePath={activePath}
      enabledFeatures={c.get("enabledFeatures")}
      pinnedKeys={pinned}
      navCategories={c.get("navCategories")}
    />,
  );
});
