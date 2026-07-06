// MCP tools for contact operations — thin wrappers over ContactService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineMcpModule } from "../module.ts";
import { getContactService } from "../../singletons/services.ts";
import {
  ContactSchema,
  CreateContactSchema,
  ListContactOptionsSchema,
  UpdateContactSchema,
} from "../../types/contact.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerContactTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getContactService(),
    notFoundLabel: "Contact",
    idParam: ContactSchema.shape.id.describe("Contact ID"),
    nameParam: ContactSchema.shape.name.describe("Contact name"),
    listSchema: ListContactOptionsSchema,
    createSchema: CreateContactSchema,
    updateSchema: UpdateContactSchema,
    mutationReturn: "id-success",
    tools: {
      list: {
        name: "list_contacts",
        description:
          "List contacts. Optionally filter by q (matches name/email/role/company/notes), type (lead/customer/partner/vendor/other), or company.",
      },
      get: {
        name: "get_contact",
        description: "Get a single contact by its ID.",
      },
      getByName: {
        name: "get_contact_by_name",
        description:
          "Find a contact by its name (case-insensitive). Returns the first match.",
      },
      create: {
        name: "create_contact",
        description:
          "Create a new CRM contact. Provide name (required), and optionally email, phone, role, company, type, notes, tags.",
      },
      update: {
        name: "update_contact",
        description: "Update an existing contact's fields.",
      },
      delete: {
        name: "delete_contact",
        description: "Delete a contact by its ID.",
      },
    },
  });
}

export const contactModule = defineMcpModule({
  feature: "contact",
  register: registerContactTools,
});
