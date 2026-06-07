// Settings API routes — reads/writes project.md configuration and UI state cookies.

import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getCookie, setCookie, setSignedCookie } from "hono/cookie";
import { writeGlobalFilters } from "../../../utils/ui-state.ts";
import type { AppVariables } from "../../../types/app.ts";
import {
  getPeopleService,
  getProjectService,
} from "../../../singletons/services.ts";
import { getCookieSecret } from "../../../utils/secrets.ts";
import { IDENTITY_COOKIE } from "../../../middleware/identity.ts";
import { hxTrigger } from "../../../utils/hx-trigger.ts";
import { jsonContent, notFound } from "../../../types/api.ts";
import {
  FeaturesListSchema,
  ProjectConfigSchema,
  UpdateProjectConfigSchema,
} from "../../../types/project.types.ts";
import {
  SetGlobalFiltersSchema,
  SetIdentitySchema,
  SetPersonSchema,
} from "../../../types/settings.types.ts";

export const settingsRouter = new OpenAPIHono<{ Variables: AppVariables }>();

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
    200: jsonContent(ProjectConfigSchema, "Project configuration"),
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
    200: jsonContent(ProjectConfigSchema, "Updated project configuration"),
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
    200: jsonContent(FeaturesListSchema, "Enabled feature keys"),
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
    200: jsonContent(FeaturesListSchema, "Updated features list"),
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

// POST /global-filters — write globalProjects + globalAssignees into PersonPreferences UI state
const setGlobalFiltersRoute = createRoute({
  method: "post",
  path: "/global-filters",
  tags: ["Settings"],
  summary: "Set global filters",
  description:
    "Writes globalProjects and globalAssignees into the current user's UI " +
    "state (PersonPreferences) under the _global key. Empty arrays clear the " +
    "respective filter. All other UI-state keys are preserved.",
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

settingsRouter.openapi(setGlobalFiltersRoute, async (c) => {
  const { globalProjects, globalAssignees } = c.req.valid("json");
  await writeGlobalFilters(c, globalProjects ?? [], globalAssignees ?? []);
  return c.body(null, 204);
});

// POST /person — switch active person by ID (OpenAPI/REST clients)
const setPersonRoute = createRoute({
  method: "post",
  path: "/person",
  tags: ["Settings"],
  summary: "Switch active person by ID",
  description:
    "Looks up the person by ID, writes the mdp_identity cookie with name + id. " +
    "Returns HX-Refresh to trigger a full page reload in htmx clients. " +
    "Empty personId clears identity (anonymous).",
  operationId: "setPerson",
  request: {
    body: {
      content: { "application/json": { schema: SetPersonSchema } },
      required: true,
    },
  },
  responses: {
    204: { description: "Identity cookie written" },
    404: { description: "Person not found" },
  },
});

settingsRouter.openapi(setPersonRoute, async (c) => {
  const { personId } = c.req.valid("json");

  const secret = getCookieSecret();
  const cookieOpts = {
    path: "/",
    maxAge: 31536000,
    sameSite: "Strict" as const,
    secure: true,
    httpOnly: true,
  };

  if (!personId.trim()) {
    const value = JSON.stringify({ name: "", id: "" });
    if (secret) {
      await setSignedCookie(c, IDENTITY_COOKIE, value, secret, cookieOpts);
    } else {
      setCookie(c, IDENTITY_COOKIE, value, cookieOpts);
    }
    c.header("HX-Refresh", "true");
    return c.body(null, 204);
  }

  const person = await getPeopleService().getById(personId.trim());
  if (!person) return c.json(notFound("Person", personId.trim()), 404);

  const value = JSON.stringify({ name: person.name, id: person.id });
  if (secret) {
    await setSignedCookie(c, IDENTITY_COOKIE, value, secret, cookieOpts);
  } else {
    setCookie(c, IDENTITY_COOKIE, value, cookieOpts);
  }

  c.header("HX-Refresh", "true");
  return c.body(null, 204);
});
