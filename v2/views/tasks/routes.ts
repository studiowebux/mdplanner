// Task view routes — factory-generated from taskConfig.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { taskConfig } from "../../domains/task/config.tsx";

export const tasksRouter = createDomainRoutes(taskConfig);
