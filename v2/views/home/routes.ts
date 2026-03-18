import { Hono } from "hono";
import { HomeView } from "../home.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import type { AppVariables } from "../../types/app.ts";

export const homeViewRouter = new Hono<{ Variables: AppVariables }>();

homeViewRouter.get("/", (c) => {
  return c.html(HomeView(viewProps(c)) as unknown as string);
});
