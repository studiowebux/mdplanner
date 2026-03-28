// Sidebar routes — pin/unpin toggle returns updated sidebar inner content.

import { Hono } from "hono";
import { SidebarContent } from "../../components/shell/sidebar.tsx";
import { readUiState, writeUiState } from "../../utils/ui-state.ts";
import type { AppVariables } from "../../types/app.ts";

type SidebarUiState = { pinned: string[] };

export const sidebarRouter = new Hono<{ Variables: AppVariables }>();

// POST /sidebar/pin — toggle a key in the pinned list, return updated content.
sidebarRouter.post("/pin", async (c) => {
  const key = c.req.query("key") ?? "";
  if (!key) return c.text("Missing key", 400);

  const state = readUiState<SidebarUiState>(c, "sidebar");
  const pinned = Array.isArray(state.pinned) ? [...state.pinned] : [];
  const idx = pinned.indexOf(key);
  if (idx >= 0) {
    pinned.splice(idx, 1);
  } else {
    pinned.push(key);
  }
  writeUiState(c, "sidebar", { ...state, pinned });

  const activePath = c.req.header("HX-Current-URL")
    ? new URL(c.req.header("HX-Current-URL")!).pathname
    : undefined;

  return c.html(
    (SidebarContent({
      activePath,
      enabledFeatures: c.get("enabledFeatures"),
      pinnedKeys: pinned,
      navCategories: c.get("navCategories"),
    }))!,
  );
});
