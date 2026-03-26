// Goal view routes — factory-generated list/create/edit + detail via DetailView config.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { goalConfig } from "../../domains/goal/config.tsx";

export const goalsRouter = createDomainRoutes(goalConfig);
