// MCP tools for company operations — thin wrappers over CompanyService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getCompanyService } from "../../singletons/services.ts";
import {
  CompanySchema,
  CreateCompanySchema,
  ListCompanyOptionsSchema,
  UpdateCompanySchema,
} from "../../types/company.types.ts";
import { err, ok } from "../utils.ts";

export function registerCompanyTools(server: McpServer): void {
  const service = getCompanyService();

  server.registerTool(
    "list_companies",
    {
      description:
        "List companies. Optionally filter by q (matches name/industry/website/address/notes), type (prospect/customer/partner/vendor/other), or industry.",
      inputSchema: ListCompanyOptionsSchema.shape,
    },
    async ({ q, type, industry }) => {
      const companies = await service.list({ q, type, industry });
      return ok(companies);
    },
  );

  server.registerTool(
    "get_company",
    {
      description: "Get a single company by its ID.",
      inputSchema: { id: CompanySchema.shape.id.describe("Company ID") },
    },
    async ({ id }) => {
      const company = await service.getById(id);
      if (!company) return err(`Company '${id}' not found`);
      return ok(company);
    },
  );

  server.registerTool(
    "get_company_by_name",
    {
      description:
        "Find a company by its name (case-insensitive substring match). Returns the first match.",
      inputSchema: {
        name: CompanySchema.shape.name.describe("Company name to search for"),
      },
    },
    async ({ name }) => {
      const companies = await service.list({ q: name });
      const match = companies.find((c) =>
        c.name.toLowerCase().includes(name.toLowerCase())
      );
      if (!match) return err(`No company found matching '${name}'`);
      return ok(match);
    },
  );

  server.registerTool(
    "create_company",
    {
      description:
        "Create a new CRM company. Provide name (required), and optionally website, industry, size, type, phone, email, address, notes, tags.",
      inputSchema: CreateCompanySchema.shape,
    },
    async (data) => {
      const company = await service.create(data);
      return ok({ id: company.id });
    },
  );

  server.registerTool(
    "update_company",
    {
      description: "Update an existing company's fields.",
      inputSchema: {
        id: CompanySchema.shape.id.describe("Company ID"),
        ...UpdateCompanySchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const company = await service.update(id, fields);
      if (!company) return err(`Company '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_company",
    {
      description: "Delete a company by its ID.",
      inputSchema: { id: CompanySchema.shape.id.describe("Company ID") },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Company '${id}' not found`);
      return ok({ success: true });
    },
  );
}
