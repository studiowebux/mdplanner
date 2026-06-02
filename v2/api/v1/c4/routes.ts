// C4 Architecture API routes — CRUD + position PATCH + connection endpoints.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getC4Service } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  C4ComponentSchema,
  C4ConnectionSchema,
  CreateC4ComponentSchema,
  CreateC4ConnectionSchema,
  ListC4OptionsSchema,
  PatchC4PositionSchema,
  UpdateC4ComponentSchema,
} from "../../../types/c4.types.ts";
import {
  IdParam,
  jsonContent,
  notFound,
  notFoundContent,
} from "../../../types/api.ts";

export const c4ApiRouter = new OpenAPIHono();

const ConnIdParam = z.object({ connId: z.string() });

// GET /
c4ApiRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["C4"],
    summary: "List C4 components",
    operationId: "listC4Components",
    request: { query: ListC4OptionsSchema },
    responses: {
      200: jsonContent(z.array(C4ComponentSchema), "List of C4 components"),
    },
  }),
  async (c) => {
    const { level, parent, diagram, q } = c.req.valid("query");
    const items = await getC4Service().list({ level, parent, diagram, q });
    return c.json(items, 200);
  },
);

// GET /:id
c4ApiRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    tags: ["C4"],
    summary: "Get C4 component by ID",
    operationId: "getC4Component",
    request: { params: IdParam },
    responses: {
      200: jsonContent(C4ComponentSchema, "C4 component"),
      404: notFoundContent,
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const item = await getC4Service().getById(id);
    if (!item) return c.json(notFound("C4 component", id), 404);
    return c.json(item, 200);
  },
);

// POST /
c4ApiRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    tags: ["C4"],
    summary: "Create C4 component",
    operationId: "createC4Component",
    request: {
      body: {
        content: { "application/json": { schema: CreateC4ComponentSchema } },
        required: true,
      },
    },
    responses: {
      201: jsonContent(C4ComponentSchema, "Created C4 component"),
    },
  }),
  async (c) => {
    const data = c.req.valid("json");
    const item = await getC4Service().create(data);
    publish("c4.created");
    return c.json(item, 201);
  },
);

// PUT /:id
c4ApiRouter.openapi(
  createRoute({
    method: "put",
    path: "/{id}",
    tags: ["C4"],
    summary: "Update C4 component",
    operationId: "updateC4Component",
    request: {
      params: IdParam,
      body: {
        content: { "application/json": { schema: UpdateC4ComponentSchema } },
        required: true,
      },
    },
    responses: {
      200: jsonContent(C4ComponentSchema, "Updated C4 component"),
      404: notFoundContent,
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const item = await getC4Service().update(id, data);
    if (!item) return c.json(notFound("C4 component", id), 404);
    publish("c4.updated");
    return c.json(item, 200);
  },
);

// DELETE /:id
c4ApiRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}",
    tags: ["C4"],
    summary: "Delete C4 component",
    operationId: "deleteC4Component",
    request: { params: IdParam },
    responses: {
      204: { description: "Deleted" },
      404: notFoundContent,
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const ok = await getC4Service().delete(id);
    if (!ok) return c.json(notFound("C4 component", id), 404);
    publish("c4.deleted");
    return new Response(null, { status: 204 });
  },
);

// PATCH /:id/position
c4ApiRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}/position",
    tags: ["C4"],
    summary: "Update component canvas position",
    operationId: "patchC4Position",
    request: {
      params: IdParam,
      body: {
        content: { "application/json": { schema: PatchC4PositionSchema } },
        required: true,
      },
    },
    responses: {
      200: jsonContent(C4ComponentSchema, "Updated component"),
      404: notFoundContent,
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { x, y } = c.req.valid("json");
    const item = await getC4Service().patchPosition(id, x, y);
    if (!item) return c.json(notFound("C4 component", id), 404);
    // Position changes are canvas-local — no SSE needed (avoids resetting other nodes)
    return c.json(item, 200);
  },
);

// GET /:id/connections
c4ApiRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}/connections",
    tags: ["C4"],
    summary: "List connections for a component",
    operationId: "getC4Connections",
    request: { params: IdParam },
    responses: {
      200: jsonContent(z.array(C4ConnectionSchema), "Connections"),
      404: notFoundContent,
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const item = await getC4Service().getById(id);
    if (!item) return c.json(notFound("C4 component", id), 404);
    const conns = await getC4Service().getConnectionsFor(id);
    return c.json(conns, 200);
  },
);

// POST /connections
c4ApiRouter.openapi(
  createRoute({
    method: "post",
    path: "/connections",
    tags: ["C4"],
    summary: "Create a connection between two components",
    operationId: "createC4Connection",
    request: {
      body: {
        content: { "application/json": { schema: CreateC4ConnectionSchema } },
        required: true,
      },
    },
    responses: {
      201: jsonContent(
        z.object({
          connectionId: z.string(),
          component: C4ComponentSchema,
        }),
        "Created connection",
      ),
      404: notFoundContent,
    },
  }),
  async (c) => {
    const { sourceId, targetId, label, technology } = c.req.valid("json");
    const result = await getC4Service().addConnection(
      sourceId,
      targetId,
      label,
      technology ?? undefined,
    );
    if (!result) return c.json(notFound("C4 component", sourceId), 404);
    publish("c4.updated");
    return c.json(result, 201);
  },
);

// DELETE /connections/:connId
c4ApiRouter.openapi(
  createRoute({
    method: "delete",
    path: "/connections/{connId}",
    tags: ["C4"],
    summary: "Remove a connection by ID",
    operationId: "deleteC4Connection",
    request: { params: ConnIdParam },
    responses: {
      204: { description: "Deleted" },
      404: notFoundContent,
    },
  }),
  async (c) => {
    const { connId } = c.req.valid("param");
    const ok = await getC4Service().removeConnection(connId);
    if (!ok) return c.json(notFound("C4 connection", connId), 404);
    publish("c4.updated");
    return new Response(null, { status: 204 });
  },
);
