// Strategic Levels view routes — factory list + custom detail + inline level editing.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { strategicLevelsConfig } from "../../domains/strategic-levels/config.tsx";
import { getStrategicLevelsService } from "../../singletons/services.ts";
import { publish } from "../../singletons/event-bus.ts";
import { StrategicLevelsDetailView } from "../strategic-levels-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import type { StrategicLevelType } from "../../types/strategic-levels.types.ts";
import { LEVEL_ORDER } from "../../types/strategic-levels.types.ts";
import { generateId } from "../../utils/id.ts";

const VALID_LEVEL_TYPES = new Set<string>(LEVEL_ORDER);

export const strategicLevelsRouter = createDomainRoutes(strategicLevelsConfig);

async function renderDetail(c: AppContext, id: string) {
  const item = await getStrategicLevelsService().getById(id);
  if (!item) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <StrategicLevelsDetailView
      {...viewProps(c, "/strategic-levels")}
      item={item}
      editing={editing}
    />,
  );
}

strategicLevelsRouter.get("/:id", async (c) => {
  return renderDetail(c, c.req.param("id"));
});

// Inline add: POST /strategic-levels/:id/levels/:levelType
strategicLevelsRouter.post("/:id/levels/:levelType", async (c) => {
  const id = c.req.param("id");
  const levelType = c.req.param("levelType");
  if (!VALID_LEVEL_TYPES.has(levelType)) return c.notFound();

  const body = await c.req.parseBody();
  const title = String(body.title ?? "").trim();
  if (!title) return renderDetail(c, id);

  const builder = await getStrategicLevelsService().getById(id);
  if (!builder) return c.notFound();
  if (builder.archived === true) {
    return c.json({ error: "Builder is archived" }, 422);
  }

  const description = String(body.description ?? "").trim() || undefined;
  const maxOrder = builder.levels
    .filter((l) => l.level === levelType)
    .reduce((m, l) => Math.max(m, l.order), -1);

  const updated = [
    ...builder.levels,
    {
      id: generateId("level"),
      level: levelType as StrategicLevelType,
      title,
      description,
      order: maxOrder + 1,
    },
  ];
  await getStrategicLevelsService().update(id, { levels: updated });
  publish("strategic-levels.updated");
  c.header(
    "HX-Trigger",
    JSON.stringify({ showToast: { type: "success", message: "Item added" } }),
  );
  return renderDetail(c, id);
});

// Inline edit: PUT /strategic-levels/:id/levels/:levelId
strategicLevelsRouter.put("/:id/levels/:levelId", async (c) => {
  const id = c.req.param("id");
  const levelId = c.req.param("levelId");

  const body = await c.req.parseBody();
  const title = String(body.title ?? "").trim();

  const builder = await getStrategicLevelsService().getById(id);
  if (!builder) return c.notFound();
  if (builder.archived === true) {
    return c.json({ error: "Builder is archived" }, 422);
  }

  const levels = builder.levels.map((l) => {
    if (l.id !== levelId) return l;
    return { ...l, title: title || l.title };
  });
  await getStrategicLevelsService().update(id, { levels });
  publish("strategic-levels.updated");
  c.header(
    "HX-Trigger",
    JSON.stringify({ showToast: { type: "success", message: "Item updated" } }),
  );
  return renderDetail(c, id);
});

// Inline delete: DELETE /strategic-levels/:id/levels/:levelId
strategicLevelsRouter.delete("/:id/levels/:levelId", async (c) => {
  const id = c.req.param("id");
  const levelId = c.req.param("levelId");

  const builder = await getStrategicLevelsService().getById(id);
  if (!builder) return c.notFound();
  if (builder.archived === true) {
    return c.json({ error: "Builder is archived" }, 422);
  }

  const levels = builder.levels.filter((l) => l.id !== levelId);
  await getStrategicLevelsService().update(id, { levels });
  publish("strategic-levels.updated");
  c.header(
    "HX-Trigger",
    JSON.stringify({
      showToast: { type: "success", message: "Item removed" },
    }),
  );
  return renderDetail(c, id);
});
