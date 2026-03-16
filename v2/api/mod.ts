import { Hono } from "hono";
import { milestonesRouter } from "./v1/milestones/routes.ts";

const v1 = new Hono();
v1.route("/milestones", milestonesRouter);

const api = new Hono();
api.route("/v1", v1);

export { api };
