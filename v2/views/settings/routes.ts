// Settings view routes — SSR page + form handlers for each tab.

import { Hono } from "hono";
import { SettingsView } from "../settings.tsx";
import { getProjectService } from "../../singletons/services.ts";
import { hxTrigger } from "../../utils/hx-trigger.ts";
import type { AppVariables } from "../../types/app.ts";
import type { ProjectLink } from "../../domains/project/types.ts";

export const settingsViewRouter = new Hono<{ Variables: AppVariables }>();

settingsViewRouter.get("/", async (c) => {
  const config = await getProjectService().getConfig();
  return c.html(
    SettingsView({
      nonce: c.get("nonce"),
      enabledFeatures: c.get("enabledFeatures"),
      config,
    }) as unknown as string,
  );
});

// -- Views tab: features checkboxes --
settingsViewRouter.post("/features", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const raw = body.features;
  const features = Array.isArray(raw)
    ? raw.map(String)
    : raw
      ? [String(raw)]
      : [];
  await getProjectService().setFeatures(features);
  return new Response(null, {
    status: 204,
    headers: {
      "HX-Trigger": hxTrigger("success", "Features saved"),
      "HX-Refresh": "true",
    },
  });
});

// -- Project tab: name + description --
settingsViewRouter.post("/project", async (c) => {
  const body = await c.req.parseBody();
  await getProjectService().updateProject({
    name: String(body.name ?? ""),
    description: body.description ? String(body.description) : undefined,
  });
  return new Response(null, {
    status: 204,
    headers: { "HX-Trigger": hxTrigger("success", "Project saved") },
  });
});

// -- Schedule tab: startDate, workingDaysPerWeek, workingDays --
settingsViewRouter.post("/schedule", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const rawDays = body.workingDays;
  const workingDays = Array.isArray(rawDays)
    ? rawDays.map(String)
    : rawDays
      ? [String(rawDays)]
      : [];
  const perWeek = body.workingDaysPerWeek
    ? Number(body.workingDaysPerWeek)
    : undefined;
  await getProjectService().updateSchedule({
    startDate: body.startDate ? String(body.startDate) : undefined,
    workingDaysPerWeek: perWeek && !isNaN(perWeek) ? perWeek : undefined,
    workingDays,
  });
  return new Response(null, {
    status: 204,
    headers: { "HX-Trigger": hxTrigger("success", "Schedule saved") },
  });
});

// -- Tags tab: repeated name="tags" inputs --
settingsViewRouter.post("/tags", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const raw = body.tags;
  const tags = (Array.isArray(raw) ? raw : raw ? [raw] : [])
    .map((t) => String(t).trim())
    .filter(Boolean);
  await getProjectService().updateTags(tags);
  return new Response(null, {
    status: 204,
    headers: { "HX-Trigger": hxTrigger("success", "Tags saved") },
  });
});

// -- Links tab: dynamic title/url pairs --
settingsViewRouter.post("/links", async (c) => {
  const body = await c.req.parseBody();
  const links: ProjectLink[] = [];
  for (let i = 0; ; i++) {
    const title = body[`link_title_${i}`];
    const url = body[`link_url_${i}`];
    if (title === undefined && url === undefined) break;
    const t = String(title ?? "").trim();
    const u = String(url ?? "").trim();
    if (t && u) links.push({ title: t, url: u });
  }
  await getProjectService().updateLinks(links);
  return new Response(null, {
    status: 204,
    headers: { "HX-Trigger": hxTrigger("success", "Links saved") },
  });
});
