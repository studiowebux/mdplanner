// Settings API routes — reads/writes project.md configuration and UI state cookies.

import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getCookie, setCookie, setSignedCookie } from "hono/cookie";
import { parseJson } from "../../../database/sqlite/mod.ts";
import { getProjectService } from "../../../singletons/services.ts";
import { getCookieSecret } from "../../../utils/secrets.ts";
import { IDENTITY_COOKIE } from "../../../middleware/identity.ts";
import { hxTrigger } from "../../../utils/hx-trigger.ts";
import {
  FeaturesListSchema,
  ProjectConfigSchema,
  UpdateProjectConfigSchema,
} from "../../../types/project.types.ts";
import {
  SetGlobalFiltersSchema,
  SetIdentitySchema,
} from "../../../types/settings.types.ts";

export const settingsRouter = new OpenAPIHono();

// GET /
const getSettingsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Settings"],
  summary: "Get project configuration",
  description:
    "Returns the full project configuration from project.md frontmatter.",
  operationId: "getSettings",
  responses: {
    200: {
      content: { "application/json": { schema: ProjectConfigSchema } },
      description: "Project configuration",
    },
  },
});

settingsRouter.openapi(getSettingsRoute, async (c) => {
  const config = await getProjectService().getConfig();
  return c.json(config, 200);
});

// PUT /
const updateSettingsRoute = createRoute({
  method: "put",
  path: "/",
  tags: ["Settings"],
  summary: "Update project configuration",
  description: "Partial update — only provided fields are changed. " +
    "Omitted fields remain unchanged.",
  operationId: "updateSettings",
  request: {
    body: {
      content: { "application/json": { schema: UpdateProjectConfigSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: ProjectConfigSchema } },
      description: "Updated project configuration",
    },
  },
});

settingsRouter.openapi(updateSettingsRoute, async (c) => {
  const data = c.req.valid("json");
  const config = await getProjectService().updateConfig(data);
  return c.json(config, 200);
});

// GET /features
const getFeaturesRoute = createRoute({
  method: "get",
  path: "/features",
  tags: ["Settings"],
  summary: "Get enabled features list",
  description: "Returns the array of enabled feature keys from project.md. " +
    "These keys control which domain views appear in the sidebar.",
  operationId: "getFeatures",
  responses: {
    200: {
      content: { "application/json": { schema: FeaturesListSchema } },
      description: "Enabled feature keys",
    },
  },
});

settingsRouter.openapi(getFeaturesRoute, async (c) => {
  const features = await getProjectService().getEnabledFeatures();
  return c.json(features, 200);
});

// PUT /features
const updateFeaturesRoute = createRoute({
  method: "put",
  path: "/features",
  tags: ["Settings"],
  summary: "Replace enabled features list",
  description: "Replaces the entire features array in project.md. " +
    "Send the full list of feature keys to enable.",
  operationId: "updateFeatures",
  request: {
    body: {
      content: { "application/json": { schema: FeaturesListSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: FeaturesListSchema } },
      description: "Updated features list",
    },
  },
});

settingsRouter.openapi(updateFeaturesRoute, async (c) => {
  const features = c.req.valid("json");
  await getProjectService().setFeatures(features);
  return c.json(features, 200);
});

// POST /identity — write mdp_identity cookie (browser identity selector)
const setIdentityRoute = createRoute({
  method: "post",
  path: "/identity",
  tags: ["Settings"],
  summary: "Set browser identity",
  description:
    "Writes the mdp_identity cookie used by the topbar identity selector. " +
    "Trust-based — no authentication. Empty name clears identity (anonymous). " +
    "Cookie is HMAC-signed when MDPLANNER_SECRET_KEY is set.",
  operationId: "setIdentity",
  request: {
    body: {
      content: { "application/json": { schema: SetIdentitySchema } },
      required: true,
    },
  },
  responses: {
    204: { description: "Identity cookie written" },
  },
});

settingsRouter.openapi(setIdentityRoute, async (c) => {
  const { name, id } = c.req.valid("json");
  const value = JSON.stringify({ name: name.trim(), id });
  const secret = getCookieSecret();
  const opts = {
    path: "/",
    maxAge: 31536000,
    sameSite: "Strict" as const,
    secure: true,
    httpOnly: true,
  };

  if (secret) {
    await setSignedCookie(c, IDENTITY_COOKIE, value, secret, opts);
  } else {
    setCookie(c, IDENTITY_COOKIE, value, opts);
  }

  const label = name.trim() ? `Identity: ${name.trim()}` : "Identity cleared";
  c.header("HX-Trigger", hxTrigger("success", label));
  return c.body(null, 204);
});

// POST /global-filters — write globalProjects + globalAssignees into ui_state cookie
const setGlobalFiltersRoute = createRoute({
  method: "post",
  path: "/global-filters",
  tags: ["Settings"],
  summary: "Set global filters",
  description:
    "Writes globalProjects and globalAssignees into the ui_state cookie under " +
    "the _global key. Empty arrays clear the respective filter. " +
    "All other ui_state keys are preserved.",
  operationId: "setGlobalFilters",
  request: {
    body: {
      content: { "application/json": { schema: SetGlobalFiltersSchema } },
      required: true,
    },
  },
  responses: {
    204: { description: "Global filters written" },
  },
});

settingsRouter.openapi(setGlobalFiltersRoute, (c) => {
  const { globalProjects, globalAssignees } = c.req.valid("json");

  // Read existing ui_state, merge _global key, write back — preserves all other domain state.
  const UI_STATE_COOKIE = "ui_state";
  const raw = getCookie(c, UI_STATE_COOKIE);
  const all = parseJson<Record<string, Record<string, unknown>>>(raw) ?? {};
  const current = (all["_global"] ?? {}) as {
    globalProjects?: string[];
    globalAssignees?: string[];
  };
  all["_global"] = {
    ...current,
    globalProjects: globalProjects ?? current.globalProjects ?? [],
    globalAssignees: globalAssignees ?? current.globalAssignees ?? [],
  };
  setCookie(c, UI_STATE_COOKIE, JSON.stringify(all), {
    path: "/",
    maxAge: 31536000,
    sameSite: "Lax",
  });

  return c.body(null, 204);
});
