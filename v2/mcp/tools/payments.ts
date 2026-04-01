// MCP tools for payment operations — thin wrappers over PaymentService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getPaymentService } from "../../singletons/services.ts";
import {
  CreatePaymentSchema,
  ListPaymentOptionsSchema,
  PaymentSchema,
  UpdatePaymentSchema,
} from "../../types/payment.types.ts";
import { err, ok } from "../utils.ts";

export function registerPaymentTools(server: McpServer): void {
  const service = getPaymentService();

  server.registerTool(
    "list_payments",
    {
      description:
        "List all payments. Optionally filter by invoiceId, method, or search query.",
      inputSchema: ListPaymentOptionsSchema.shape,
    },
    async ({ invoiceId, method, q }) => {
      const payments = await service.list({ invoiceId, method, q });
      return ok(payments);
    },
  );

  server.registerTool(
    "get_payment",
    {
      description: "Get a single payment by its ID.",
      inputSchema: { id: PaymentSchema.shape.id.describe("Payment ID") },
    },
    async ({ id }) => {
      const payment = await service.getById(id);
      if (!payment) return err(`Payment '${id}' not found`);
      return ok(payment);
    },
  );

  server.registerTool(
    "create_payment",
    {
      description:
        "Create a payment. Automatically updates the linked invoice's paidAmount and status.",
      inputSchema: CreatePaymentSchema.shape,
    },
    async (data) => {
      const payment = await service.create(data);
      return ok({ id: payment.id });
    },
  );

  server.registerTool(
    "update_payment",
    {
      description: "Update an existing payment's fields.",
      inputSchema: {
        id: PaymentSchema.shape.id.describe("Payment ID"),
        ...UpdatePaymentSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const payment = await service.update(id, fields);
      if (!payment) return err(`Payment '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_payment",
    {
      description:
        "Delete a payment. Automatically updates the linked invoice's paidAmount and status.",
      inputSchema: { id: PaymentSchema.shape.id.describe("Payment ID") },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Payment '${id}' not found`);
      return ok({ success: true });
    },
  );
}
