// Settings view routes — SSR page + form handlers for each tab.

import { Hono } from "hono";
import { renderToString } from "hono/jsx/dom/server";
import { SettingsView } from "../settings.tsx";
import {
  getCacheSync,
  getPeopleService,
  getProjectService,
  getSearchEngine,
} from "../../singletons/services.ts";
import { getIntegrityService } from "../../services/integrity.service.ts";
import { getCookie, setCookie, setSignedCookie } from "hono/cookie";
import { writeGlobalFilters } from "../../utils/ui-state.ts";
import { IDENTITY_COOKIE } from "../../middleware/identity.ts";
import { getCookieSecret } from "../../utils/secrets.ts";
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
  const actor = c.get("actor");
  const preferences = actor?.id
    ? (await getPeopleService().getById(actor.id))?.preferences
    : undefined;
  return c.html(
    <SettingsView
      {...viewProps(c, "/settings")}
      config={config}
      preferences={preferences}
    />,
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
  const sidebarHtml = renderToString(
    <SidebarContent
      activePath="/settings"
      enabledFeatures={features}
      pinnedKeys={c.get("pinnedKeys")}
      navCategories={c.get("navCategories")}
    />,
  );
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
  const staleDaysRaw = body.staleDays ? Number(body.staleDays) : undefined;
  const hideCompletedAfterDaysRaw = body.hideCompletedAfterDays !== undefined &&
      body.hideCompletedAfterDays !== ""
    ? Number(body.hideCompletedAfterDays)
    : undefined;
  await getProjectService().updateConfig({
    name: String(body.name ?? ""),
    description: body.description ? String(body.description) : undefined,
    locale: body.locale ? String(body.locale).trim() : undefined,
    currency: body.currency ? String(body.currency).trim() : undefined,
    port: portRaw && !isNaN(portRaw) ? portRaw : undefined,
    staleDays: staleDaysRaw && !isNaN(staleDaysRaw) ? staleDaysRaw : undefined,
    hideCompletedAfterDays: hideCompletedAfterDaysRaw !== undefined &&
        !isNaN(hideCompletedAfterDaysRaw)
      ? hideCompletedAfterDaysRaw
      : undefined,
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

// -- Milestones tab: status values --
settingsViewRouter.post("/milestone-statuses", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const raw = body.milestoneStatuses;
  const statuses = (Array.isArray(raw) ? raw : raw ? [raw] : [])
    .map((s) => String(s).trim())
    .filter(Boolean);
  await getProjectService().updateMilestoneStatuses(statuses);
  return new Response(null, {
    status: 204,
    headers: { "HX-Trigger": hxTrigger("success", "Milestone statuses saved") },
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

// -- Billing tab: company, address, logo, default footer --
settingsViewRouter.post("/billing", async (c) => {
  const body = await c.req.parseBody();
  await getProjectService().updateConfig({
    billingCompany: body.billingCompany ? String(body.billingCompany) : "",
    billingAddress: body.billingAddress ? String(body.billingAddress) : "",
    billingLogoUrl: body.billingLogoUrl ? String(body.billingLogoUrl) : "",
    billingDefaultFooter: body.billingDefaultFooter
      ? String(body.billingDefaultFooter)
      : "",
  });
  return new Response(null, {
    status: 204,
    headers: { "HX-Trigger": hxTrigger("success", "Billing settings saved") },
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

// -- Global filters — JSON POST, writes globalProjects + globalAssignees into ui_state cookie --
settingsViewRouter.post("/global-filters", async (c) => {
  const body = await c.req.json<{
    globalProjects?: string[];
    globalAssignees?: string[];
  }>();
  writeGlobalFilters(c, body.globalProjects ?? [], body.globalAssignees ?? []);
  return c.body(null, 204);
});

// -- Identity switch — plain form POST, sets mdp_identity cookie, redirects back --
settingsViewRouter.post("/identity", async (c) => {
  const body = await c.req.parseBody();
  const personId = String(body.personId ?? "").trim();

  const secret = getCookieSecret();
  const isHttps = c.req.url.startsWith("https://");
  const cookieOpts = {
    path: "/",
    maxAge: 31536000,
    sameSite: "Strict" as const,
    secure: isHttps,
    httpOnly: true,
  };

  let name = "";
  let id = "";
  let preferences = {};
  if (personId) {
    const person = await getPeopleService().getById(personId);
    if (person) {
      name = person.name;
      id = person.id;
      preferences = person.preferences ?? {};
    }
  }

  const value = JSON.stringify({ name, id });
  if (secret) {
    await setSignedCookie(c, IDENTITY_COOKIE, value, secret, cookieOpts);
  } else {
    setCookie(c, IDENTITY_COOKIE, value, cookieOpts);
  }

  // Send preferences in HX-Trigger so the client caches them in sessionStorage
  // before the page refresh — zero extra network round-trip.
  c.header(
    "HX-Trigger",
    JSON.stringify({ preferencesLoaded: preferences }),
  );
  c.header("HX-Refresh", "true");
  return c.body(null, 204);
});

// -- Preferences: view defaults per domain --
settingsViewRouter.post("/preferences/view-prefs", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const actor = c.get("actor");
  if (!actor?.id) return c.body(null, 204);
  if (body._reset) {
    await getPeopleService().updatePreferences(actor.id, { viewPrefs: {} });
  } else {
    const viewPrefs: Record<string, string> = {};
    for (const [k, v] of Object.entries(body)) {
      if (k !== "_reset" && typeof v === "string" && v) viewPrefs[k] = v;
    }
    await getPeopleService().updatePreferences(actor.id, { viewPrefs });
  }
  c.header("HX-Trigger", hxTrigger("success", "View defaults saved"));
  return c.body(null, 204);
});

// -- Preferences: pinned nav domains --
settingsViewRouter.post("/preferences/pinned-nav", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const actor = c.get("actor");
  if (!actor?.id) return c.body(null, 204);
  let pinned: string[] = [];
  if (!body._reset) {
    const raw = body.pinned;
    pinned = Array.isArray(raw) ? raw.map(String) : raw ? [String(raw)] : [];
    if (pinned.length > 8) pinned = pinned.slice(0, 8);
  }
  await getPeopleService().updatePreferences(actor.id, { pinnedNav: pinned });
  c.header("HX-Trigger", hxTrigger("success", "Pinned nav saved"));
  return c.body(null, 204);
});

// -- Preferences: filter defaults (domain.key=value per line) --
settingsViewRouter.post("/preferences/filter-defaults", async (c) => {
  const body = await c.req.parseBody();
  const actor = c.get("actor");
  if (!actor?.id) return c.body(null, 204);
  const filterDefaults: Record<string, Record<string, string>> = {};
  if (!body._reset) {
    const text = String(body.filterText ?? "");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 1) continue;
      const dotKey = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      const dotIdx = dotKey.indexOf(".");
      if (dotIdx < 1 || !val) continue;
      const domain = dotKey.slice(0, dotIdx);
      const key = dotKey.slice(dotIdx + 1);
      if (!filterDefaults[domain]) filterDefaults[domain] = {};
      filterDefaults[domain][key] = val;
    }
  }
  await getPeopleService().updatePreferences(actor.id, { filterDefaults });
  c.header("HX-Trigger", hxTrigger("success", "Filter defaults saved"));
  return c.body(null, 204);
});

// -- Data integrity scan --
settingsViewRouter.get("/integrity/scan", async (c) => {
  const result = await getIntegrityService().scan();
  const { checks, summary, durationMs } = result;

  if (checks.length === 0) {
    return c.html(
      `<p class="settings-integrity__clean">No issues found. All references are valid. (${durationMs}ms)</p>`,
    );
  }

  const rows = checks
    .map(
      (r) =>
        `<tr class="settings-integrity__row settings-integrity__row--${r.severity}">` +
        `<td class="settings-integrity__cell">${r.severity}</td>` +
        `<td class="settings-integrity__cell">${r.entityType}</td>` +
        `<td class="settings-integrity__cell settings-integrity__cell--id">${r.entityId}</td>` +
        `<td class="settings-integrity__cell">${r.field}</td>` +
        `<td class="settings-integrity__cell">${r.issue}</td>` +
        `</tr>`,
    )
    .join("");

  return c.html(
    `<p class="settings-integrity__summary">${summary.errors} error${
      summary.errors !== 1 ? "s" : ""
    }, ` +
      `${summary.warnings} warning${
        summary.warnings !== 1 ? "s" : ""
      } — ${durationMs}ms</p>` +
      `<table class="settings-integrity__table">` +
      `<thead><tr>` +
      `<th class="settings-integrity__cell">Severity</th>` +
      `<th class="settings-integrity__cell">Type</th>` +
      `<th class="settings-integrity__cell">ID</th>` +
      `<th class="settings-integrity__cell">Field</th>` +
      `<th class="settings-integrity__cell">Issue</th>` +
      `</tr></thead>` +
      `<tbody>${rows}</tbody>` +
      `</table>`,
  );
});
