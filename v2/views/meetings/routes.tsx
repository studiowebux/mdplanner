// Meeting view routes — wrapper router registers /new override before factory.

import { Hono } from "hono";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { createDomainForm } from "../../factories/domain-view.tsx";
import { meetingConfig } from "../../domains/meeting/config.tsx";
import { MEETING_FORM_FIELDS } from "../../domains/meeting/constants.tsx";
import { getMeetingService } from "../../singletons/services.ts";
import { generateId } from "../../utils/id.ts";
import { MeetingDetailView } from "../meeting-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import type { AppVariables } from "../../types/app.ts";

const MeetingForm = createDomainForm({
  domain: "meetings",
  singular: "Meeting",
  fields: MEETING_FORM_FIELDS,
});

// Factory router (handles list, CRUD forms, card view, etc.)
const domainRouter = createDomainRoutes(meetingConfig);

// Custom detail route added to the domain router
domainRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await getMeetingService().getById(id);
  if (!item) return c.notFound();

  return c.html(
    <MeetingDetailView
      {...viewProps(c, "/meetings")}
      item={item}
    />,
  );
});

// Wrapper router — /new override must be registered before factory /new.
export const meetingsRouter = new Hono<{ Variables: AppVariables }>();

// Custom /new — prefills carry-over actions when ?related=<id> is present.
meetingsRouter.get("/new", async (c) => {
  const relatedId = c.req.query("related");
  let prefillValues: Record<string, string> | undefined;

  if (relatedId) {
    const related = await getMeetingService().getById(relatedId);
    if (related) {
      const openActions = await getMeetingService().getOpenActions(
        related.date,
      );
      if (openActions.length > 0) {
        prefillValues = {
          actions: JSON.stringify(
            openActions.map((e) => ({
              id: generateId("action"),
              description: e.action.description,
              owner: e.action.owner ?? "",
              due: e.action.due ?? "",
              status: "open",
            })),
          ),
        };
      }
    }
  }

  return c.html(MeetingForm({ prefillValues }) as unknown as string);
});

// Mount all factory routes (including factory's /new, edit, delete, list, etc.)
meetingsRouter.route("/", domainRouter);
