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
import { parseFormBody } from "../../utils/form-parser.ts";
import { SETTINGS_FORM_FIELDS } from "./tabs/shortcuts-tab.tsx";

export const settingsViewRouter = new Hono<{ Variables: AppVariables }>();

/** Parse a form field to a valid number, returning undefined for missing/empty/NaN. */
function parseOptNum(
  raw: string | File | undefined,
): number | undefined {
  if (!raw || typeof raw !== "string") return undefined;
  const n = Number(raw);
  return isNaN(n) ? undefined : n;
}

/**
 * Resolve a masked secret field submitted by the project form.
 * - typed value      → replace with it
 * - blank + clear="1" → "" (explicit wipe; repo truthy-guard drops the key)
 * - blank, no clear  → undefined (leave unchanged — never echoed, never wiped)
 */
function resolveSecretField(
  value: string | File | undefined,
  clearFlag: string | File | undefined,
): string | undefined {
  const v = typeof value === "string" ? value.trim() : "";
  if (v) return v;
  if (String(clearFlag ?? "") === "1") return "";
  return undefined;
}

settingsViewRouter.get("/", async (c) => {
  const config = await getProjectService().getPublicConfig();
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
  await getProjectService().updateConfig({
    name: String(body.name ?? ""),
    // Clearable free-text fields: a present-but-empty input means "clear", not
    // "leave unchanged". Inputs are pre-filled, so an untouched save resends the
    // current value; `undefined` (field absent) still skips. updateConfig
    // applies "" because it only skips on `undefined`.
    description: body.description !== undefined
      ? String(body.description)
      : undefined,
    locale: body.locale !== undefined ? String(body.locale).trim() : undefined,
    currency: body.currency !== undefined
      ? String(body.currency).trim()
      : undefined,
    port: parseOptNum(body.port),
    staleDays: parseOptNum(body.staleDays),
    hideCompletedAfterDays: parseOptNum(body.hideCompletedAfterDays),
    tasksPerSection: parseOptNum(body.tasksPerSection),
    // Secrets are no longer pre-filled in the form, so a blank field means
    // "leave unchanged" (NOT "clear"). Wiping requires the explicit Clear
    // button, which sets the hidden <field>Clear flag to "1" → send "" so the
    // repo truthy-guard drops the key. A typed value always replaces.
    githubToken: resolveSecretField(body.githubToken, body.githubTokenClear),
    cloudflareToken: resolveSecretField(
      body.cloudflareToken,
      body.cloudflareTokenClear,
    ),
    giteaToken: resolveSecretField(body.giteaToken, body.giteaTokenClear),
    giteaBaseUrl: body.giteaBaseUrl !== undefined
      ? String(body.giteaBaseUrl).trim()
      : undefined,
    woodpeckerToken: resolveSecretField(
      body.woodpeckerToken,
      body.woodpeckerTokenClear,
    ),
    woodpeckerBaseUrl: body.woodpeckerBaseUrl !== undefined
      ? String(body.woodpeckerBaseUrl).trim()
      : undefined,
    cerveauDir: body.cerveauDir !== undefined
      ? String(body.cerveauDir).trim()
      : undefined,
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
    billingEmail: body.billingEmail ? String(body.billingEmail) : "",
    billingPhone: body.billingPhone ? String(body.billingPhone) : "",
    billingLogoUrl: body.billingLogoUrl ? String(body.billingLogoUrl) : "",
    billingDefaultFooter: body.billingDefaultFooter
      ? String(body.billingDefaultFooter)
      : "",
    billingTaxNumber: body.billingTaxNumber
      ? String(body.billingTaxNumber)
      : "",
    billingBusinessNumber: body.billingBusinessNumber
      ? String(body.billingBusinessNumber)
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
    `<thead><tr><th scope="col" class="settings-cache__cell">Entity</th>` +
    `<th scope="col" class="settings-cache__cell">Rows</th></tr></thead>` +
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

// -- Global filters — htmx form POST, writes globalProjects + globalAssignees into PersonPreferences UI state --
settingsViewRouter.post("/global-filters", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const toNames = (raw: typeof body[string]): string[] =>
    Array.isArray(raw)
      ? raw.map(String)
      : raw !== undefined
      ? [String(raw)]
      : [];
  await writeGlobalFilters(
    c,
    toNames(body["globalProjects"]),
    toNames(body["globalAssignees"]),
  );
  // Notify domain-view listeners (hx-trigger "global-filter:changed from:body").
  c.header("HX-Trigger", "global-filter:changed");
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

  // Plain form POST (identity selector page, no htmx) → 302 to root, the
  // identity-guard now lets the cookie-bearing follow-up through.
  if (c.req.header("HX-Request") !== "true") {
    return c.redirect("/", 303);
  }

  // htmx (topbar person switcher) → 204 + HX-Refresh; preferences ride along
  // in HX-Trigger so the client caches them before the reload.
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

// -- Preferences: filter defaults (array-table of domain/filterKey/value rows) --
settingsViewRouter.post("/preferences/filter-defaults", async (c) => {
  const body = await c.req.parseBody();
  const actor = c.get("actor");
  if (!actor?.id) return c.body(null, 204);
  const filterDefaults: Record<string, Record<string, string>> = {};
  if (!body._reset) {
    const parsed = parseFormBody(
      SETTINGS_FORM_FIELDS,
      body as Record<string, string | File>,
    );
    const entries = (parsed.entries as Record<string, unknown>[]) ?? [];
    for (const entry of entries) {
      const domain = String(entry.domain ?? "").trim();
      const key = String(entry.filterKey ?? "").trim();
      const val = String(entry.value ?? "").trim();
      if (!domain || !key || !val) continue;
      if (!filterDefaults[domain]) filterDefaults[domain] = {};
      filterDefaults[domain][key] = val;
    }
  }
  await getPeopleService().updatePreferences(actor.id, { filterDefaults });
  c.header("HX-Trigger", hxTrigger("success", "Filter defaults saved"));
  return c.body(null, 204);
});

// -- Data integrity scan --
// Renders per-domain collapsibles (green when clean, red/yellow when issues
// exist). A global "all clean" banner is shown only when every domain passes.
settingsViewRouter.get("/integrity/scan", async (c) => {
  const { domains, summary, durationMs } = await getIntegrityService().scan();

  const cleanAll = summary.errors === 0 && summary.warnings === 0;
  const overall = cleanAll
    ? `<p class="settings-integrity__clean">All clean — ${summary.checked} record${
      summary.checked !== 1 ? "s" : ""
    } across ${domains.length} domain${
      domains.length !== 1 ? "s" : ""
    }. (${durationMs}ms)</p>`
    : `<p class="settings-integrity__summary">${summary.errors} error${
      summary.errors !== 1 ? "s" : ""
    }, ${summary.warnings} warning${
      summary.warnings !== 1 ? "s" : ""
    } across ${domains.length} domain${
      domains.length !== 1 ? "s" : ""
    } — ${summary.checked} record${
      summary.checked !== 1 ? "s" : ""
    } scanned in ${durationMs}ms</p>`;

  const items = domains.map((d) => {
    const errs = d.checks.filter((x) => x.severity === "error").length;
    const warns = d.checks.filter((x) => x.severity === "warning").length;
    const clean = d.checks.length === 0;
    const state = clean ? "clean" : errs > 0 ? "errors" : "warnings";
    const summaryText = clean
      ? `${d.label} — clean (${d.checked} checked)`
      : `${d.label} — ${errs} error${errs !== 1 ? "s" : ""}, ${warns} warning${
        warns !== 1 ? "s" : ""
      } (${d.checked} checked)`;

    if (clean) {
      return `<details class="settings-integrity__domain settings-integrity__domain--${state}"><summary class="settings-integrity__domain-summary">${summaryText}</summary></details>`;
    }

    const rows = d.checks
      .map(
        (r) =>
          `<tr class="settings-integrity__row settings-integrity__row--${r.severity}">` +
          `<td class="settings-integrity__cell">${r.severity}</td>` +
          `<td class="settings-integrity__cell settings-integrity__cell--id">${r.entityId}</td>` +
          `<td class="settings-integrity__cell">${r.field}</td>` +
          `<td class="settings-integrity__cell">${r.issue}</td>` +
          `</tr>`,
      )
      .join("");

    return `<details class="settings-integrity__domain settings-integrity__domain--${state}" open><summary class="settings-integrity__domain-summary">${summaryText}</summary><table class="settings-integrity__table"><thead><tr><th scope="col" class="settings-integrity__cell">Severity</th><th scope="col" class="settings-integrity__cell">ID</th><th scope="col" class="settings-integrity__cell">Field</th><th scope="col" class="settings-integrity__cell">Issue</th></tr></thead><tbody>${rows}</tbody></table></details>`;
  }).join("");

  return c.html(`${overall}${items}`);
});
