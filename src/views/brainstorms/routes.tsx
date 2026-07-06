// Brainstorm view routes — factory list/create/edit + custom detail.
// Structured fields edit via the factory sidenav (GET/POST /:id/edit);
// each Q&A pair edits in-place via "Edit Mode" (?editing=true, PUT /:id/qa/:index).

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { brainstormConfig } from "../../domains/brainstorm/config.tsx";
import {
  getBrainstormService,
  getGoalService,
  getTaskService,
} from "../../singletons/services.ts";
import { BrainstormDetailView } from "../brainstorm-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const brainstormsRouter = createDomainRoutes(brainstormConfig);

/** Render the detail page; `?editing=true` enables in-place Q&A editing. */
async function renderDetail(c: AppContext, id: string) {
  const item = await getBrainstormService().getById(id);
  if (!item) return c.notFound();
  const editing = c.req.query("editing") === "true";

  const linkedTaskIds = item.linkedTasks ?? [];
  const resolvedTasks = await Promise.all(
    linkedTaskIds.map((tid) => getTaskService().getById(tid)),
  );
  const taskInfo = new Map<string, { title: string } | null>();
  linkedTaskIds.forEach((tid, i) => {
    const t = resolvedTasks[i];
    taskInfo.set(tid, t ? { title: t.title } : null);
  });

  const linkedGoalIds = item.linkedGoals ?? [];
  const resolvedGoals = await Promise.all(
    linkedGoalIds.map((gid) => getGoalService().getById(gid)),
  );
  const goalInfo = new Map<string, { title: string } | null>();
  linkedGoalIds.forEach((gid, i) => {
    const g = resolvedGoals[i];
    goalInfo.set(gid, g ? { title: g.title } : null);
  });

  return c.html(
    <BrainstormDetailView
      {...viewProps(c, "/brainstorms")}
      item={item}
      taskInfo={taskInfo}
      goalInfo={goalInfo}
      editing={editing}
    />,
  );
}

brainstormsRouter.get(
  "/:id",
  (c: AppContext) => renderDetail(c, c.req.param("id")!),
);

// In-place Q&A save (Edit Mode). Each pair's question/answer is its own inline
// editable with its own Save button, so a request carries only the dirty field;
// the other field of the pair is left untouched. Factory provides edit/delete.
brainstormsRouter.put("/:id/qa/:index", async (c: AppContext) => {
  const id = c.req.param("id")!;
  const index = Number(c.req.param("index"));
  const item = await getBrainstormService().getById(id);
  if (
    !item || !Number.isInteger(index) || index < 0 ||
    index >= item.questions.length
  ) {
    return c.notFound();
  }

  const body = await c.req.parseBody();
  const questions = item.questions.map((q) => ({ ...q }));
  const target = questions[index];
  if (typeof body.question === "string") {
    const next = body.question.trim();
    if (next) target.question = next; // question is required — keep non-empty
  }
  if (typeof body.answer === "string") {
    target.answer = body.answer.trim() || undefined;
  }

  await getBrainstormService().update(id, { questions });
  return renderDetail(c, id);
});
