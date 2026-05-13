// MCP tools for contact operations — thin wrappers over ContactService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getContactService } from "../../singletons/services.ts";
import {
  ContactSchema,
  CreateContactSchema,
  ListContactOptionsSchema,
  UpdateContactSchema,
} from "../../types/contact.types.ts";
import { err, ok } from "../utils.ts";

export function registerContactTools(server: McpServer): void {
  const service = getContactService();

  server.registerTool(
    "list_contacts",
    {
      description:
        "List contacts. Optionally filter by q (matches name/email/role/company/notes), type (lead/customer/partner/vendor/other), or company.",
      inputSchema: ListContactOptionsSchema.shape,
    },
    async ({ q, type, company }) => {
      const contacts = await service.list({ q, type, company });
      return ok(contacts);
    },
  );

  server.registerTool(
    "get_contact",
    {
      description: "Get a single contact by its ID.",
      inputSchema: { id: ContactSchema.shape.id.describe("Contact ID") },
    },
    async ({ id }) => {
      const contact = await service.getById(id);
      if (!contact) return err(`Contact '${id}' not found`);
      return ok(contact);
    },
  );

  server.registerTool(
    "create_contact",
    {
      description:
        "Create a new CRM contact. Provide name (required), and optionally email, phone, role, company, type, notes, tags.",
      inputSchema: CreateContactSchema.shape,
    },
    async (data) => {
      const contact = await service.create(data);
      return ok({ id: contact.id });
    },
  );

  server.registerTool(
    "update_contact",
    {
      description: "Update an existing contact's fields.",
      inputSchema: {
        id: ContactSchema.shape.id.describe("Contact ID"),
        ...UpdateContactSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const contact = await service.update(id, fields);
      if (!contact) return err(`Contact '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_contact",
    {
      description: "Delete a contact by its ID.",
      inputSchema: { id: ContactSchema.shape.id.describe("Contact ID") },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Contact '${id}' not found`);
      return ok({ success: true });
    },
  );
}
