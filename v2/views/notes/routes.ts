// Note routes — factory-generated list + grid views.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { noteConfig } from "../../domains/note/config.tsx";

export const notesRouter = createDomainRoutes(noteConfig);
