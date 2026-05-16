// Brainstorm view routes — factory-generated list/create/edit + custom detail route.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { brainstormConfig } from "../../domains/brainstorm/config.tsx";
import {
  getBrainstormService,
  getBrainstormTemplateService,
} from "../../singletons/services.ts";
import { BrainstormDetailView } from "../brainstorm-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { Sidenav } from "../../components/ui/sidenav.tsx";
import { publish } from "../../singletons/event-bus.ts";
import { hxTrigger } from "../../utils/hx-trigger.ts";

export const brainstormsRouter = createDomainRoutes(brainstormConfig);

brainstormsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await getBrainstormService().getById(id);
  if (!item) return c.notFound();

  return c.html(
    <BrainstormDetailView
      {...viewProps(c, "/brainstorms")}
      item={item}
    />,
  );
});

// GET /:id/template-picker — sidenav fragment listing available templates.
brainstormsRouter.get("/:id/template-picker", async (c) => {
  const id = c.req.param("id");
  const templates = await getBrainstormTemplateService().list({});

  return c.html(
    <Sidenav
      id="brainstorms-template-picker-sidenav"
      title="Use Template"
      open
    >
      <form
        hx-post={`/brainstorms/${id}/apply-template`}
        hx-swap="none"
      >
        {templates.length === 0
          ? (
            <p class="btemplate-picker__empty">
              No templates yet. <a href="/brainstorm-templates">Create one</a>.
            </p>
          )
          : (
            <div class="btemplate-picker">
              {templates.map((t) => (
                <label key={t.id} class="btemplate-picker__item">
                  <input type="radio" name="templateId" value={t.id} required />
                  <div class="btemplate-picker__item-body">
                    <span class="btemplate-picker__item-name">{t.name}</span>
                    <span class="btemplate-picker__item-meta">
                      {t.questions.length} question
                      {t.questions.length !== 1 ? "s" : ""}
                      {t.categories && t.categories.length > 0
                        ? ` · ${t.categories.join(", ")}`
                        : ""}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          )}
        <div class="btemplate-picker__actions">
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

// POST /:id/apply-template — appends template questions to the brainstorm session.
brainstormsRouter.post("/:id/apply-template", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const templateId = String(body["templateId"] ?? "");

  if (!templateId) {
    return c.html("", 400, {
      "HX-Trigger": hxTrigger("error", "No template selected"),
    });
  }

  const brainstorm = await getBrainstormService().getById(id);
  if (!brainstorm) return c.notFound();

  const template = await getBrainstormTemplateService().getById(templateId);
  if (!template) {
    return c.html("", 404, {
      "HX-Trigger": hxTrigger("error", "Template not found"),
    });
  }

  const newQuestions = template.questions.map((q) => ({
    question: q,
    answer: null,
  }));
  await getBrainstormService().update(id, {
    questions: [...brainstorm.questions, ...newQuestions],
  });

  publish("brainstorm.updated");

  return c.html("", 200, {
    "HX-Trigger": hxTrigger("success", `Template "${template.name}" applied`),
  });
});
