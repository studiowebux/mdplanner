// Deal CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getDealService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateDealSchema,
  DEAL_STAGES,
  DealSchema,
  ListDealOptionsSchema,
  UpdateDealSchema,
} from "../../../types/deal.types.ts";
import {
  IdParam,
  jsonContent,
  notFound,
  notFoundContent,
} from "../../../types/api.ts";

export const dealsRouter = new OpenAPIHono();

// GET /
dealsRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Deals"],
    summary: "List all deals",
    operationId: "listDeals",
    request: { query: ListDealOptionsSchema },
    responses: {
      200: jsonContent(z.array(DealSchema), "List of deals"),
    },
  }),
  async (c) => {
    const { q, stage, assignee, company } = c.req.valid("query");
    const deals = await getDealService().list({ q, stage, assignee, company });
    return c.json(deals, 200);
  },
);

// GET /{id}
dealsRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    tags: ["Deals"],
    summary: "Get deal by ID",
    operationId: "getDeal",
    request: { params: IdParam },
    responses: {
      200: jsonContent(DealSchema, "Deal"),
      404: notFoundContent,
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const deal = await getDealService().getById(id);
    if (!deal) return c.json(notFound("Deal", id), 404);
    return c.json(deal, 200);
  },
);

// POST /
dealsRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    tags: ["Deals"],
    summary: "Create a deal",
    operationId: "createDeal",
    request: {
      body: {
        content: { "application/json": { schema: CreateDealSchema } },
        required: true,
      },
    },
    responses: {
      201: jsonContent(DealSchema, "Created deal"),
    },
  }),
  async (c) => {
    const data = c.req.valid("json");
    const deal = await getDealService().create(data);
    publish("deal.created");
    return c.json(deal, 201);
  },
);

// PUT /{id}
dealsRouter.openapi(
  createRoute({
    method: "put",
    path: "/{id}",
    tags: ["Deals"],
    summary: "Update a deal",
    operationId: "updateDeal",
    request: {
      params: IdParam,
      body: {
        content: { "application/json": { schema: UpdateDealSchema } },
        required: true,
      },
    },
    responses: {
      200: jsonContent(DealSchema, "Updated deal"),
      404: notFoundContent,
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const deal = await getDealService().update(id, data);
    if (!deal) return c.json(notFound("Deal", id), 404);
    publish("deal.updated");
    return c.json(deal, 200);
  },
);

// PATCH /{id}/stage
dealsRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}/stage",
    tags: ["Deals"],
    summary: "Move deal to a different stage",
    operationId: "moveDealStage",
    request: {
      params: IdParam,
      body: {
        content: {
          "application/json": {
            schema: z.object({ stage: z.enum(DEAL_STAGES) }),
          },
        },
        required: true,
      },
    },
    responses: {
      200: jsonContent(DealSchema, "Updated deal"),
      404: notFoundContent,
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { stage } = c.req.valid("json");
    const deal = await getDealService().update(id, { stage });
    if (!deal) return c.json(notFound("Deal", id), 404);
    publish("deal.updated");
    return c.json(deal, 200);
  },
);

// DELETE /{id}
dealsRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}",
    tags: ["Deals"],
    summary: "Delete a deal",
    operationId: "deleteDeal",
    request: { params: IdParam },
    responses: {
      204: { description: "Deleted" },
      404: notFoundContent,
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const ok = await getDealService().delete(id);
    if (!ok) return c.json(notFound("Deal", id), 404);
    publish("deal.deleted");
    return new Response(null, { status: 204 });
  },
);
