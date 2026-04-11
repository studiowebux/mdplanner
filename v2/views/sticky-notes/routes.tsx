// Sticky Note view routes — factory-generated list/create/edit.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { stickyNoteConfig } from "../../domains/sticky-note/config.tsx";

export const stickyNotesRouter = createDomainRoutes(stickyNoteConfig);
