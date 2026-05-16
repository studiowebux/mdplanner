// Reflection view routes — factory-generated list + custom detail.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { reflectionConfig } from "../../domains/reflection/config.tsx";
import {
  getReflectionService,
  getReflectionTemplateService,
} from "../../singletons/services.ts";
import { ReflectionDetailView } from "../reflection-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { Sidenav } from "../../components/ui/sidenav.tsx";
import { publish } from "../../singletons/event-bus.ts";
import { hxTrigger } from "../../utils/hx-trigger.ts";

export const reflectionRouter = createDomainRoutes(reflectionConfig);

reflectionRouter.get("/:id", async (c: AppContext) => {
  const id = c.req.param("id");
  const item = await getReflectionService().getById(id!);
  if (!item) return c.notFound();
  return c.html(
    <ReflectionDetailView {...viewProps(c, "/reflections")} item={item} />,
  );
});

// GET /:id/template-picker — sidenav fragment listing available reflection templates.
reflectionRouter.get("/:id/template-picker", async (c: AppContext) => {
  const id = c.req.param("id");
  const templates = await getReflectionTemplateService().list({});

  return c.html(
    <Sidenav
      id="reflections-template-picker-sidenav"
      title="Use Template"
      open
    >
      <form
        hx-post={`/reflections/${id}/apply-template`}
        hx-swap="none"
      >
        {templates.length === 0
          ? (
            <p class="rtemplate-picker__empty">
              No templates yet. <a href="/reflection-templates">Create one</a>.
            </p>
          )
          : (
            <div class="rtemplate-picker">
              {templates.map((t) => (
                <label key={t.id} class="rtemplate-picker__item">
                  <input type="radio" name="templateId" value={t.id} required />
                  <div class="rtemplate-picker__item-body">
                    <span class="rtemplate-picker__item-name">{t.name}</span>
                    <span class="rtemplate-picker__item-meta">
                      {t.prompts.length} prompt
                      {t.prompts.length !== 1 ? "s" : ""}
                      {t.period ? ` · ${t.period}` : ""}
                      {t.categories && t.categories.length > 0
                        ? ` · ${t.categories.join(", ")}`
                        : ""}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          )}
        <div class="rtemplate-picker__actions">
          <button type="submit" class="btn btn--primary btn--sm">
            Apply Template
          </button>
          <button
            type="button"
            class="btn btn--secondary btn--sm"
            data-sidenav-close
          >
            Cancel
          </button>
        </div>
      </form>
    </Sidenav>,
  );
});

// POST /:id/apply-template — prepends template prompts into the reflection content.
reflectionRouter.post("/:id/apply-template", async (c: AppContext) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const templateId = String(body["templateId"] ?? "");

  if (!templateId) {
    return c.html("", 400, {
      "HX-Trigger": hxTrigger("error", "No template selected"),
    });
  }

  const reflection = await getReflectionService().getById(id!);
  if (!reflection) return c.notFound();

  const template = await getReflectionTemplateService().getById(templateId);
  if (!template) {
    return c.html("", 404, {
      "HX-Trigger": hxTrigger("error", "Template not found"),
    });
  }

  const promptBlock = template.prompts.map((p) => `## ${p}\n\n`).join("");
  const existingContent = reflection.content ?? "";
  const newContent = existingContent
    ? `${promptBlock}\n---\n\n${existingContent}`
    : promptBlock.trimEnd();

  await getReflectionService().update(id!, {
    content: newContent,
    templateId,
  });

  publish("reflection.updated");

  return c.html("", 200, {
    "HX-Trigger": hxTrigger(
      "success",
      `Template "${template.name}" applied`,
    ),
  });
});
