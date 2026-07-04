// MCP tools for company operations — registered via the shared CRUD factory.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineMcpModule } from "../module.ts";
import { getCompanyService } from "../../singletons/services.ts";
import {
  CompanySchema,
  CreateCompanySchema,
  ListCompanyOptionsSchema,
  UpdateCompanySchema,
} from "../../types/company.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerCompanyTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getCompanyService(),
    notFoundLabel: "Company",
    idParam: CompanySchema.shape.id.describe("Company ID"),
    nameParam: CompanySchema.shape.name.describe("Company name to search for"),
    listSchema: ListCompanyOptionsSchema,
    createSchema: CreateCompanySchema,
    updateSchema: UpdateCompanySchema,
    mutationReturn: "id-success",
    slimFields: ["name", "type", "industry"],
    tools: {
      list: {
        name: "list_companies",
        description:
          "List companies. Optionally filter by q (matches name/industry/website/address/notes), type (prospect/customer/partner/vendor/other), or industry. Pass slim: true to browse with a compact projection.",
      },
      get: {
        name: "get_company",
        description: "Get a single company by its ID.",
      },
      getByName: {
        name: "get_company_by_name",
        description:
          "Find a company by its name (case-insensitive substring match). Returns the first match.",
      },
      create: {
        name: "create_company",
        description:
          "Create a new CRM company. Provide name (required), and optionally website, industry, size, type, phone, email, address, notes, tags.",
      },
      update: {
        name: "update_company",
        description: "Update an existing company's fields.",
      },
      delete: {
        name: "delete_company",
        description: "Delete a company by its ID.",
      },
    },
  });
}

export const companyModule = defineMcpModule({
  feature: "company",
  register: registerCompanyTools,
});
