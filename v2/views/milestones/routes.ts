import { Hono } from "hono";
import { getMilestoneService } from "../../singletons/services.ts";
import { MilestonesView } from "../milestones.tsx";
import { MilestoneCard } from "../components/milestone-card.tsx";
import type { AppVariables } from "../../types/app.ts";

export const milestonesViewRouter = new Hono<{ Variables: AppVariables }>();

milestonesViewRouter.get("/", async (c) => {
  const milestones = await getMilestoneService().list();
  return c.html(
    MilestonesView({ milestones, nonce: c.get("nonce"), activePath: "/milestones" }) as unknown as string,
  );
});

// Card fragment — fetched by the SSE client to swap individual cards in place.
milestonesViewRouter.get("/:id/card", async (c) => {
  const id = c.req.param("id");
  const m = await getMilestoneService().getById(id);
  if (!m) return c.notFound();
  return c.html(
    MilestoneCard({ milestone: m }) as unknown as string,
  );
});
