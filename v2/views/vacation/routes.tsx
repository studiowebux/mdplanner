import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { vacationConfig } from "../../domains/vacation/config.tsx";

export const vacationRouter = createDomainRoutes(vacationConfig);
