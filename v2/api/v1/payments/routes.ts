// Payment CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getPaymentService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreatePaymentSchema,
  ListPaymentOptionsSchema,
  PaymentSchema,
  UpdatePaymentSchema,
} from "../../../types/payment.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const paymentsRouter = new OpenAPIHono();

// GET /
const listPaymentsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Payments"],
  summary: "List all payments",
  operationId: "listPayments",
  request: { query: ListPaymentOptionsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(PaymentSchema) } },
      description: "List of payments",
    },
  },
});

paymentsRouter.openapi(listPaymentsRoute, async (c) => {
  try {
    const { invoiceId, method, q } = c.req.valid("query");
    const payments = await getPaymentService().list({
      invoiceId,
      method,
      q,
    });
    return c.json(payments, 200);
  } catch (err) {
    throw err;
  }
});

// GET /{id}
const getPaymentRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Payments"],
  summary: "Get payment by ID",
  operationId: "getPayment",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: PaymentSchema } },
      description: "Payment",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

paymentsRouter.openapi(getPaymentRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const payment = await getPaymentService().getById(id);
    if (!payment) return c.json(notFound("PAYMENT", id), 404);
    return c.json(payment, 200);
  } catch (err) {
    throw err;
  }
});

// POST /
const createPaymentRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Payments"],
  summary: "Create a payment",
  operationId: "createPayment",
  request: {
    body: {
      content: { "application/json": { schema: CreatePaymentSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: PaymentSchema } },
      description: "Created payment",
    },
  },
});

paymentsRouter.openapi(createPaymentRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const payment = await getPaymentService().create(data);
    publish("payment.created");
    publish("invoice.updated");
    return c.json(payment, 201);
  } catch (err) {
    throw err;
  }
});

// PUT /{id}
const updatePaymentRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Payments"],
  summary: "Update a payment",
  operationId: "updatePayment",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdatePaymentSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: PaymentSchema } },
      description: "Updated payment",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

paymentsRouter.openapi(updatePaymentRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const payment = await getPaymentService().update(id, data);
    if (!payment) return c.json(notFound("PAYMENT", id), 404);
    publish("payment.updated");
    publish("invoice.updated");
    return c.json(payment, 200);
  } catch (err) {
    throw err;
  }
});

// DELETE /{id}
const deletePaymentRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Payments"],
  summary: "Delete a payment",
  operationId: "deletePayment",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

paymentsRouter.openapi(deletePaymentRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const ok = await getPaymentService().delete(id);
    if (!ok) return c.json(notFound("PAYMENT", id), 404);
    publish("payment.deleted");
    publish("invoice.updated");
    return new Response(null, { status: 204 });
  } catch (err) {
    throw err;
  }
});
