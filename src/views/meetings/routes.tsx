// Meeting view routes — wrapper router registers /new override before factory.

import { Hono } from "hono";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { createDomainForm } from "../../factories/domain-view.tsx";
import { meetingConfig } from "../../domains/meeting/config.tsx";
import { MEETING_FORM_FIELDS } from "../../domains/meeting/constants.tsx";
import { getMeetingService } from "../../singletons/services.ts";
import { resolveLinkedItems } from "../../utils/resolve-links.ts";
import { generateId } from "../../utils/id.ts";
import {
  buildActionPersonById,
  buildAttendeePersonMap,
} from "../../domains/meeting/owners.ts";
import {
  MeetingDetailView,
  renderActionsTable,
  renderRelatedSection,
} from "../meeting-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { hxTrigger } from "../../utils/hx-trigger.ts";
import { toHtml } from "../../utils/html.ts";
import type { AppContext, AppVariables } from "../../types/app.ts";

const MeetingForm = createDomainForm({
  domain: "meetings",
  singular: "Meeting",
  fields: MEETING_FORM_FIELDS,
});

// Factory router (handles list, CRUD forms, card view, etc.)
const domainRouter = createDomainRoutes(meetingConfig);

/** Render the detail page; `?editing=true` enables in-place agenda/notes editing. */
async function renderDetail(c: AppContext, id: string) {
  const item = await getMeetingService().getById(id);
  if (!item) return c.notFound();

  const relatedItems = await resolveLinkedItems(
    item.relatedMeetings,
    (rid) => getMeetingService().getById(rid),
  );
  const personById = await buildActionPersonById(item.actions);
  const attendeeById = await buildAttendeePersonMap(item.attendees ?? []);
  const editing = c.req.query("editing") === "true";

  return c.html(
    <MeetingDetailView
      {...viewProps(c, "/meetings")}
      item={item}
      relatedItems={relatedItems}
      personById={personById}
      attendeeById={attendeeById}
      editing={editing}
    />,
  );
}

// Custom detail route added to the domain router
domainRouter.get("/:id", (c) => renderDetail(c, c.req.param("id")));

// In-place agenda save (Edit Mode). Factory provides edit/delete routes.
domainRouter.put("/:id/agenda", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const agenda = String(body.agenda ?? "").trim() || undefined;
  await getMeetingService().update(id, { agenda });
  return renderDetail(c, id);
});

// In-place notes save (Edit Mode).
domainRouter.put("/:id/notes", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const notes = String(body.notes ?? "").trim() || undefined;
  await getMeetingService().update(id, { notes });
  return renderDetail(c, id);
});

// POST /:id/actions — add action item, return updated actions table fragment
domainRouter.post("/:id/actions", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const description = String(body.description ?? "").trim();
  if (!description) {
    return new Response(null, {
      status: 422,
      headers: { "HX-Trigger": hxTrigger("error", "Description is required") },
    });
  }
  const meeting = await getMeetingService().addAction(id, {
    description,
    owner: String(body.owner ?? "").trim() || undefined,
    due: String(body.due ?? "").trim() || undefined,
  });
  if (!meeting) return c.notFound();
  const personById = await buildActionPersonById(meeting.actions);
  return new Response(renderActionsTable(meeting, personById), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
});

// POST /:id/links — link two meetings, return updated related section fragment
domainRouter.post("/:id/links", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const linkedId = String(body.linkedId ?? "").trim();
  if (!linkedId) {
    return new Response(null, {
      status: 422,
      headers: { "HX-Trigger": hxTrigger("error", "No meeting selected") },
    });
  }
  const result = await getMeetingService().linkMeetings(id, linkedId);
  if (!result) return c.notFound();
  const relatedItems = await resolveLinkedItems(
    result.a.relatedMeetings,
    (rid) => getMeetingService().getById(rid),
  );
  return new Response(renderRelatedSection(result.a, relatedItems), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
});

// PUT /:id/actions/:actionId/toggle — toggle action status, return updated actions table fragment
domainRouter.put("/:id/actions/:actionId/toggle", async (c) => {
  const id = c.req.param("id");
  const actionId = c.req.param("actionId");
  const meeting = await getMeetingService().toggleAction(id, actionId);
  if (!meeting) return c.notFound();
  const personById = await buildActionPersonById(meeting.actions);
  return new Response(renderActionsTable(meeting, personById), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
});

// DELETE /:id/actions/:actionId — remove action item, return updated actions table fragment
domainRouter.delete("/:id/actions/:actionId", async (c) => {
  const id = c.req.param("id");
  const actionId = c.req.param("actionId");
  const meeting = await getMeetingService().deleteAction(id, actionId);
  if (!meeting) return c.notFound();
  const personById = await buildActionPersonById(meeting.actions);
  return new Response(renderActionsTable(meeting, personById), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
});

// DELETE /:id/links/:linkedId — unlink two meetings, return updated related section fragment
domainRouter.delete("/:id/links/:linkedId", async (c) => {
  const id = c.req.param("id");
  const linkedId = c.req.param("linkedId");
  const result = await getMeetingService().unlinkMeetings(id, linkedId);
  if (!result) return c.notFound();
  const relatedItems = await resolveLinkedItems(
    result.a.relatedMeetings,
    (rid) => getMeetingService().getById(rid),
  );
  return new Response(renderRelatedSection(result.a, relatedItems), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
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
      prefillValues = { relatedMeetings: relatedId };
      const openActions = await getMeetingService().getOpenActions(
        related.date,
      );
      if (openActions.length > 0) {
        prefillValues.actions = JSON.stringify(
          openActions.map((e) => ({
            id: generateId("action"),
            description: e.action.description,
            owner: e.action.owner ?? "",
            due: e.action.due ?? "",
            status: "open",
          })),
        );
      }
    }
  }

  return c.html(toHtml(MeetingForm({ prefillValues })));
});

// Mount all factory routes (including factory's /new, edit, delete, list, etc.)
meetingsRouter.route("/", domainRouter);
