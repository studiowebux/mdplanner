// Settings API routes — reads/writes project.md configuration.

import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getProjectService } from "../../../singletons/services.ts";
import {
  FeaturesListSchema,
  ProjectConfigSchema,
  UpdateProjectConfigSchema,
} from "../../../domains/project/types.ts";

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
