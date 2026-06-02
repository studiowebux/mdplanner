// Investor API routes — OpenAPI CRUD endpoints.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getInvestorService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateInvestorSchema,
  InvestorSchema,
  ListInvestorOptionsSchema,
  UpdateInvestorSchema,
} from "../../../types/investor.types.ts";
import {
  IdParam,
  jsonContent,
  notFound,
  notFoundContent,
} from "../../../types/api.ts";

export const investorApiRouter = new OpenAPIHono();

const listInvestorsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Investor"],
  summary: "List all investors",
  operationId: "listInvestors",
  request: { query: ListInvestorOptionsSchema },
  responses: {
    200: jsonContent(z.array(InvestorSchema), "List of investors"),
  },
});

investorApiRouter.openapi(listInvestorsRoute, async (c) => {
  const { type, stage, status, tag, q } = c.req.valid("query");
  const items = await getInvestorService().list({
    type,
    stage,
    status,
    tag,
    q,
  });
  return c.json(items, 200);
});

const getInvestorRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Investor"],
  summary: "Get investor by ID",
  operationId: "getInvestor",
  request: { params: IdParam },
  responses: {
    200: jsonContent(InvestorSchema, "Investor"),
    404: notFoundContent,
  },
});

investorApiRouter.openapi(getInvestorRoute, async (c) => {
  const { id } = c.req.valid("param");
  const item = await getInvestorService().getById(id);
  if (!item) return c.json(notFound("Investor", id), 404);
  return c.json(item, 200);
});

const createInvestorRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Investor"],
  summary: "Create an investor",
  operationId: "createInvestor",
  request: {
    body: {
      content: { "application/json": { schema: CreateInvestorSchema } },
      required: true,
    },
  },
  responses: {
    201: jsonContent(InvestorSchema, "Created investor"),
  },
});

investorApiRouter.openapi(createInvestorRoute, async (c) => {
  const data = c.req.valid("json");
  const item = await getInvestorService().create(data);
  publish("investor.created");
  return c.json(item, 201);
});

const updateInvestorRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Investor"],
  summary: "Update an investor",
  operationId: "updateInvestor",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateInvestorSchema } },
      required: true,
    },
  },
  responses: {
    200: jsonContent(InvestorSchema, "Updated investor"),
    404: notFoundContent,
  },
});

investorApiRouter.openapi(updateInvestorRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const item = await getInvestorService().update(id, data);
  if (!item) return c.json(notFound("Investor", id), 404);
  publish("investor.updated");
  return c.json(item, 200);
});

const deleteInvestorRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Investor"],
  summary: "Delete an investor",
  operationId: "deleteInvestor",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: notFoundContent,
  },
});

investorApiRouter.openapi(deleteInvestorRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getInvestorService().delete(id);
  if (!ok) return c.json(notFound("Investor", id), 404);
  publish("investor.deleted");
  return new Response(null, { status: 204 });
});
