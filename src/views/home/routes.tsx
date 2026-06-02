import { Hono } from "hono";
import { HomeView } from "../home.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { getProjectService } from "../../singletons/services.ts";
import type { AppVariables } from "../../types/app.ts";

export const homeViewRouter = new Hono<{ Variables: AppVariables }>();

homeViewRouter.get("/", async (c) => {
  const config = await getProjectService().getConfig();
  return c.html(<HomeView {...viewProps(c)} config={config} />);
});
