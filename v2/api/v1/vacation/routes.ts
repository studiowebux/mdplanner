import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getVacationService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateVacationRequestSchema,
  ListVacationOptionsSchema,
  UpdateVacationRequestSchema,
  VacationRequestSchema,
} from "../../../types/vacation.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const vacationApiRouter = new OpenAPIHono();

vacationApiRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Vacation"],
    summary: "List vacation requests",
    operationId: "listVacationRequests",
    request: { query: ListVacationOptionsSchema },
    responses: {
      200: {
        content: {
          "application/json": { schema: z.array(VacationRequestSchema) },
        },
        description: "List of vacation requests",
      },
    },
  }),
  async (c) => {
    const { status, type, personId, q } = c.req.valid("query");
    const items = await getVacationService().list({
      status,
      type,
      personId,
      q,
    });
    return c.json(items, 200);
  },
);

vacationApiRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    tags: ["Vacation"],
    summary: "Get vacation request by ID",
    operationId: "getVacationRequest",
    request: { params: IdParam },
    responses: {
      200: {
        content: { "application/json": { schema: VacationRequestSchema } },
        description: "Vacation request",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const item = await getVacationService().getById(id);
    if (!item) return c.json(notFound("VacationRequest", id), 404);
    return c.json(item, 200);
  },
);

vacationApiRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    tags: ["Vacation"],
    summary: "Create a vacation request",
    operationId: "createVacationRequest",
    request: {
      body: {
        content: {
          "application/json": { schema: CreateVacationRequestSchema },
        },
        required: true,
      },
    },
    responses: {
      201: {
        content: { "application/json": { schema: VacationRequestSchema } },
        description: "Created vacation request",
      },
    },
  }),
  async (c) => {
    const data = c.req.valid("json");
    const item = await getVacationService().create(data);
    publish("vacation.created");
    return c.json(item, 201);
  },
);

vacationApiRouter.openapi(
  createRoute({
    method: "put",
    path: "/{id}",
    tags: ["Vacation"],
    summary: "Update a vacation request",
    operationId: "updateVacationRequest",
    request: {
      params: IdParam,
      body: {
        content: {
          "application/json": { schema: UpdateVacationRequestSchema },
        },
        required: true,
      },
    },
    responses: {
      200: {
        content: { "application/json": { schema: VacationRequestSchema } },
        description: "Updated vacation request",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const item = await getVacationService().update(id, data);
    if (!item) return c.json(notFound("VacationRequest", id), 404);
    publish("vacation.updated");
    return c.json(item, 200);
  },
);

vacationApiRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}",
    tags: ["Vacation"],
    summary: "Delete a vacation request",
    operationId: "deleteVacationRequest",
    request: { params: IdParam },
    responses: {
      204: { description: "Deleted" },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const ok = await getVacationService().delete(id);
    if (!ok) return c.json(notFound("VacationRequest", id), 404);
    publish("vacation.deleted");
    return new Response(null, { status: 204 });
  },
);
