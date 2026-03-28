// Settings view routes — SSR page + form handlers for each tab.

import { Hono } from "hono";
import { SettingsView } from "../settings.tsx";
import {
  getCacheSync,
  getProjectService,
  getSearchEngine,
} from "../../singletons/services.ts";
import { getLocale } from "../../utils/format.ts";
import { SidebarContent } from "../../components/shell/sidebar.tsx";
import { hxTrigger } from "../../utils/hx-trigger.ts";
import { viewProps } from "../../middleware/view-props.ts";
import {
  getSectionOrder,
  setSectionOrder,
  WEEKDAYS,
} from "../../constants/mod.ts";
import type { AppVariables } from "../../types/app.ts";
import type { ProjectLink } from "../../types/project.types.ts";

export const settingsViewRouter = new Hono<{ Variables: AppVariables }>();

settingsViewRouter.get("/", async (c) => {
  const config = await getProjectService().getConfig();
  return c.html(
    (SettingsView({
      ...viewProps(c, "/settings"),
      config,
    }))!,
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
  const sidebarHtml = (SidebarContent({
    activePath: "/settings",
    enabledFeatures: features,
    pinnedKeys: c.get("pinnedKeys"),
    navCategories: c.get("navCategories"),
  }))!;
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

// -- Goals tab: KPI metric keys --
settingsViewRouter.post("/kpi-metrics", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const raw = body.kpiMetrics;
  const metrics = (Array.isArray(raw) ? raw : raw ? [raw] : [])
    .map((m) => String(m).trim())
    .filter(Boolean);
  await getProjectService().updateKpiMetrics(metrics);
  return new Response(null, {
    status: 204,
    headers: { "HX-Trigger": hxTrigger("success", "KPI metrics saved") },
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

// -- Cache stats fragment (htmx partial) --
settingsViewRouter.get("/cache/stats", (c) => {
  const engine = getSearchEngine();
  const sync = getCacheSync();
  if (!engine || !sync) {
    return c.html(
      `<p class="settings-cache__empty">Cache is disabled.</p>`,
    );
  }
  const stats = engine.getStats();
  const lastSync = sync.getLastSyncTime();
  const rows = Object.entries(stats)
    .filter(([k]) => k !== "total")
    .map(([name, count]) =>
      `<tr><td class="settings-cache__cell">${name}</td>` +
      `<td class="settings-cache__cell">${count}</td></tr>`
    )
    .join("");
  const html = `<table class="settings-cache__table">` +
    `<thead><tr><th class="settings-cache__cell">Entity</th>` +
    `<th class="settings-cache__cell">Rows</th></tr></thead>` +
    `<tbody>${rows}</tbody>` +
    `<tfoot><tr><td class="settings-cache__cell"><strong>Total</strong></td>` +
    `<td class="settings-cache__cell"><strong>${
      stats.total ?? 0
    }</strong></td></tr></tfoot>` +
    `</table>` +
    `<p class="settings-cache__meta">Last sync: ${
      lastSync
        ? lastSync.toLocaleString(getLocale(), {
          dateStyle: "medium",
          timeStyle: "short",
        })
        : "never"
    }</p>`;
  return c.html(html);
});

// -- Cache rebuild action --
settingsViewRouter.post("/cache/rebuild", async (c) => {
  const sync = getCacheSync();
  if (!sync) {
    return new Response(null, {
      status: 422,
      headers: { "HX-Trigger": hxTrigger("error", "Cache is disabled") },
    });
  }
  try {
    const result = await sync.rebuild();
    return new Response(null, {
      status: 204,
      headers: {
        "HX-Trigger": hxTrigger(
          "success",
          `Cache rebuilt: ${result.items} items in ${result.duration}ms`,
        ),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Rebuild failed";
    return new Response(null, {
      status: 500,
      headers: { "HX-Trigger": hxTrigger("error", msg) },
    });
  }
});

// -- FTS rebuild action --
settingsViewRouter.post("/cache/rebuild-fts", (c) => {
  const sync = getCacheSync();
  if (!sync) {
    return new Response(null, {
      status: 422,
      headers: { "HX-Trigger": hxTrigger("error", "Cache is disabled") },
    });
  }
  try {
    const start = performance.now();
    sync.rebuildFts();
    const ms = Math.round(performance.now() - start);
    return new Response(null, {
      status: 204,
      headers: {
        "HX-Trigger": hxTrigger("success", `FTS index rebuilt in ${ms}ms`),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "FTS rebuild failed";
    return new Response(null, {
      status: 500,
      headers: { "HX-Trigger": hxTrigger("error", msg) },
    });
  }
});
