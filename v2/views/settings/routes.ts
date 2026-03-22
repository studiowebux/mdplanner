// Settings view routes — SSR page + form handlers for each tab.

import { Hono } from "hono";
import { SettingsView } from "../settings.tsx";
import { getProjectService } from "../../singletons/services.ts";
import { SidebarContent } from "../../components/shell/sidebar.tsx";
import { hxTrigger } from "../../utils/hx-trigger.ts";
import { viewProps } from "../../middleware/view-props.ts";
import {
  getSectionOrder,
  setSectionOrder,
  WEEKDAYS,
} from "../../constants/mod.ts";
import type { AppVariables } from "../../types/app.ts";
import type { ProjectLink } from "../../domains/project/types.ts";

export const settingsViewRouter = new Hono<{ Variables: AppVariables }>();

settingsViewRouter.get("/", async (c) => {
  const config = await getProjectService().getConfig();
  return c.html(
    SettingsView({
      ...viewProps(c, "/settings"),
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
  // Return updated sidebar via OOB swap so nav reflects the change without full reload.
  const sidebarHtml = SidebarContent({
    activePath: "/settings",
    enabledFeatures: features,
    pinnedKeys: c.get("pinnedKeys"),
    navCategories: c.get("navCategories"),
  }) as unknown as string;
  const oob =
    `<div id="sidebar-content" hx-swap-oob="innerHTML">${sidebarHtml}</div>`;
  return new Response(oob, {
    status: 200,
    headers: {
      "Content-Type": "text/html",
      "HX-Trigger": hxTrigger("success", "Features saved"),
    },
  });
});

// -- Project tab: name, description, locale, currency, port, github --
settingsViewRouter.post("/project", async (c) => {
  const body = await c.req.parseBody();
  const portRaw = body.port ? Number(body.port) : undefined;
  await getProjectService().updateConfig({
    name: String(body.name ?? ""),
    description: body.description ? String(body.description) : undefined,
    locale: body.locale ? String(body.locale).trim() : undefined,
    currency: body.currency ? String(body.currency).trim() : undefined,
    port: portRaw && !isNaN(portRaw) ? portRaw : undefined,
    githubToken: body.githubToken ? String(body.githubToken) : undefined,
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
  const allDays = Array.isArray(rawDays)
    ? rawDays.map(String)
    : rawDays
    ? [String(rawDays)]
    : [];
  const validDays = new Set<string>(WEEKDAYS);
  const workingDays = allDays.filter(
    (d): d is typeof WEEKDAYS[number] => validDays.has(d),
  );
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
  for (let i = 0;; i++) {
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

// -- Sections tab: ordered section names --
settingsViewRouter.post("/sections", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const raw = body.sections;
  const sections = (Array.isArray(raw) ? raw : raw ? [raw] : [])
    .map((s) => String(s).trim())
    .filter(Boolean);
  await getProjectService().updateSectionOrder(sections);
  setSectionOrder(sections);
  return new Response(null, {
    status: 204,
    headers: { "HX-Trigger": hxTrigger("success", "Sections saved") },
  });
});

// -- Navigation tab: nav categories --
settingsViewRouter.post("/nav-categories", async (c) => {
  const body = await c.req.parseBody({ all: true });
  // Preserve all category names (including empty ones) from hidden inputs
  const rawCats = body.categories;
  const allCats = (Array.isArray(rawCats) ? rawCats : rawCats ? [rawCats] : [])
    .map((c) => String(c).trim())
    .filter(Boolean);
  const navCategories: Record<string, string[]> = {};
  for (const cat of allCats) navCategories[cat] = [];
  // Assign features to categories from nav_<featureKey> selects
  for (const [key, rawValue] of Object.entries(body)) {
    if (!key.startsWith("nav_")) continue;
    const featureKey = key.slice(4);
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    const category = String(value ?? "").trim();
    if (!category) continue;
    if (!navCategories[category]) navCategories[category] = [];
    navCategories[category].push(featureKey);
  }
  await getProjectService().updateNavCategories(navCategories);
  return new Response(null, {
    status: 200,
    headers: {
      "HX-Trigger": hxTrigger("success", "Navigation saved"),
      "HX-Refresh": "true",
    },
  });
});
