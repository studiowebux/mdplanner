import { Hono } from "hono";
import { HomeView } from "../home.tsx";
import type { AppVariables } from "../../types/app.ts";

export const homeViewRouter = new Hono<{ Variables: AppVariables }>();

homeViewRouter.get("/", (c) => {
  return c.html(
    HomeView({
      nonce: c.get("nonce"),
      enabledFeatures: c.get("enabledFeatures"),
    }) as unknown as string,
  );
});
