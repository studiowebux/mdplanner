/**
 * Onboarding Templates CRUD routes.
 */

import { Hono } from "hono";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  errorResponse,
  getParser,
  jsonResponse,
} from "../context.ts";

export const onboardingTemplatesRouter = new Hono<
  { Variables: AppVariables }
>();

// GET /onboarding-templates - list all templates sorted by name
onboardingTemplatesRouter.get("/", async (c) => {
  const parser = getParser(c);
  const templates = await parser.readOnboardingTemplates();
  return jsonResponse(templates);
});

// GET /onboarding-templates/:id - single template
onboardingTemplatesRouter.get("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const templates = await parser.readOnboardingTemplates();
  const template = templates.find((t) => t.id === id);
  if (!template) return errorResponse("Not found", 404);
  return jsonResponse(template);
});

// POST /onboarding-templates - create template
onboardingTemplatesRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const template = await parser.addOnboardingTemplate({
    name: body.name || "New Template",
    description: body.description,
    steps: body.steps ?? [],
  });
  await cacheWriteThrough(c, "onboarding_templates");
  return jsonResponse({ success: true, id: template.id }, 201);
});

// PUT /onboarding-templates/:id - update template
onboardingTemplatesRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const updated = await parser.updateOnboardingTemplate(id, {
    name: body.name,
    description: body.description,
    steps: body.steps,
  });
  if (!updated) return errorResponse("Not found", 404);
  await cacheWriteThrough(c, "onboarding_templates");
  return jsonResponse({ success: true });
});

// DELETE /onboarding-templates/:id - delete template
onboardingTemplatesRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const deleted = await parser.deleteOnboardingTemplate(id);
  if (!deleted) return errorResponse("Not found", 404);
  cachePurge(c, "onboarding_templates", id);
  return jsonResponse({ success: true });
});
