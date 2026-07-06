// MCP tools for payment operations — thin wrappers over PaymentService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "@hono/zod-openapi";
import { defineMcpModule } from "../module.ts";
import { getPaymentService } from "../../singletons/services.ts";
import {
  CreatePaymentSchema,
  ListPaymentOptionsSchema,
  PaymentSchema,
  UpdatePaymentSchema,
} from "../../types/payment.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerPaymentTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getPaymentService(),
    notFoundLabel: "Payment",
    idParam: PaymentSchema.shape.id.describe("Payment ID"),
    nameParam: z.string().describe("Payment reference"),
    listSchema: ListPaymentOptionsSchema,
    createSchema: CreatePaymentSchema,
    updateSchema: UpdatePaymentSchema,
    mutationReturn: "id-success",
    tools: {
      list: {
        name: "list_payments",
        description:
          "List all payments. Optionally filter by invoiceId, method, or search query.",
      },
      get: {
        name: "get_payment",
        description: "Get a single payment by its ID.",
      },
      getByName: {
        name: "get_payment_by_name",
        description:
          "Get a payment by its reference (case-insensitive). Prefer this over list_payments when the reference is known.",
      },
      create: {
        name: "create_payment",
        description:
          "Create a payment. Automatically updates the linked invoice's paidAmount and status.",
      },
      update: {
        name: "update_payment",
        description: "Update an existing payment's fields.",
      },
      delete: {
        name: "delete_payment",
        description:
          "Delete a payment. Automatically updates the linked invoice's paidAmount and status.",
      },
    },
  });
}

export const paymentModule = defineMcpModule({
  feature: "payment",
  register: registerPaymentTools,
});
