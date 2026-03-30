// Customer CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getCustomerService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateCustomerSchema,
  CustomerSchema,
  ListCustomerOptionsSchema,
  UpdateCustomerSchema,
} from "../../../types/customer.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const customersRouter = new OpenAPIHono();

// GET /
const listCustomersRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Customers"],
  summary: "List all customers",
  operationId: "listCustomers",
  request: { query: ListCustomerOptionsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(CustomerSchema) } },
      description: "List of customers",
    },
  },
});

customersRouter.openapi(listCustomersRoute, async (c) => {
  try {
    const { q } = c.req.valid("query");
    const customers = await getCustomerService().list({ q });
    return c.json(customers, 200);
  } catch (err) {
    throw err;
  }
});

// GET /{id}
const getCustomerRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Customers"],
  summary: "Get customer by ID",
  operationId: "getCustomer",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: CustomerSchema } },
      description: "Customer",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

customersRouter.openapi(getCustomerRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const customer = await getCustomerService().getById(id);
    if (!customer) return c.json(notFound("CUSTOMER", id), 404);
    return c.json(customer, 200);
  } catch (err) {
    throw err;
  }
});

// POST /
const createCustomerRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Customers"],
  summary: "Create a customer",
  operationId: "createCustomer",
  request: {
    body: {
      content: { "application/json": { schema: CreateCustomerSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: CustomerSchema } },
      description: "Created customer",
    },
  },
});

customersRouter.openapi(createCustomerRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const customer = await getCustomerService().create(data);
    publish("customer.created");
    return c.json(customer, 201);
  } catch (err) {
    throw err;
  }
});

// PUT /{id}
const updateCustomerRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Customers"],
  summary: "Update a customer",
  operationId: "updateCustomer",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateCustomerSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: CustomerSchema } },
      description: "Updated customer",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

customersRouter.openapi(updateCustomerRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const customer = await getCustomerService().update(id, data);
    if (!customer) return c.json(notFound("CUSTOMER", id), 404);
    publish("customer.updated");
    return c.json(customer, 200);
  } catch (err) {
    throw err;
  }
});

// DELETE /{id}
const deleteCustomerRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Customers"],
  summary: "Delete a customer",
  operationId: "deleteCustomer",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

customersRouter.openapi(deleteCustomerRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const ok = await getCustomerService().delete(id);
    if (!ok) return c.json(notFound("CUSTOMER", id), 404);
    publish("customer.deleted");
    return new Response(null, { status: 204 });
  } catch (err) {
    throw err;
  }
});
