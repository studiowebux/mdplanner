import { Hono } from "hono";
import { milestonesRouter } from "./v1/milestones/routes.ts";
import { portfolioRouter } from "./v1/portfolio/routes.ts";

const v1 = new Hono();
v1.route("/milestones", milestonesRouter);
v1.route("/portfolio", portfolioRouter);

const api = new Hono();
api.route("/v1", v1);

export { api };
