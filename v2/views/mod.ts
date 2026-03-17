// SSR view router — mounts all view routers. Add new domains here.
// Each domain owns its routes file under views/<domain>/routes.ts.

import { Hono } from "hono";
import { homeViewRouter } from "./home/routes.ts";
import { milestonesFactoryRouter } from "./milestones/factory-routes.ts";
import {
  autocompleteRouter,
  registerAutocompleteSource,
} from "./autocomplete/routes.ts";
import { getPortfolioService } from "../singletons/services.ts";
import type { AppVariables } from "../types/app.ts";

// Register autocomplete sources — add new ones here as domains grow.
registerAutocompleteSource("portfolio", {
  list: () => getPortfolioService().list(),
  search: (q) => getPortfolioService().search(q),
  displayKey: "name",
  valueKey: "name",
});

export const views = new Hono<{ Variables: AppVariables }>();

views.route("/", homeViewRouter);
views.route("/milestones", milestonesFactoryRouter);
views.route("/autocomplete", autocompleteRouter);
