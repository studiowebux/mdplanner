// SSR view router — mounts all view routers. Add new domains here.
// Each domain owns its routes file under views/<domain>/routes.ts.

import { Hono } from "hono";
import { homeViewRouter } from "./home/routes.ts";
import { milestonesViewRouter } from "./milestones/routes.ts";
import type { AppVariables } from "../types/app.ts";

export const views = new Hono<{ Variables: AppVariables }>();

views.route("/", homeViewRouter);
views.route("/milestones", milestonesViewRouter);
