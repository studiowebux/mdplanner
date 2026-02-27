/**
 * MCP tools for CRM operations (companies, contacts, deals).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerCrmTools(server: McpServer, pm: ProjectManager): void {
  const parser = pm.getActiveParser();

  // --- Companies ---

  server.registerTool(
    "list_companies",
    { description: "List all CRM companies.", inputSchema: {} },
    async () => ok(await parser.readCompanies()),
  );

  server.registerTool(
    "get_company",
    {
      description: "Get a single company by its ID.",
      inputSchema: { id: z.string().describe("Company ID") },
    },
    async ({ id }) => {
      const items = await parser.readCompanies();
      const item = items.find((i) => i.id === id);
      if (!item) return err(`Company '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_company",
    {
      description: "Create a new company in the CRM.",
      inputSchema: {
        name: z.string().describe("Company name"),
        industry: z.string().optional(),
        website: z.string().optional(),
        phone: z.string().optional(),
        notes: z.string().optional(),
      },
    },
    async ({ name, industry, website, phone, notes }) => {
      const item = await parser.addCompany({
        name,
        ...(industry && { industry }),
        ...(website && { website }),
        ...(phone && { phone }),
        ...(notes && { notes }),
      });
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_company",
    {
      description: "Update a company's fields.",
      inputSchema: {
        id: z.string().describe("Company ID"),
        name: z.string().optional(),
        industry: z.string().optional(),
        website: z.string().optional(),
        phone: z.string().optional(),
        notes: z.string().optional(),
      },
    },
    async ({ id, name, industry, website, phone, notes }) => {
      const success = await parser.updateCompany(id, {
        ...(name !== undefined && { name }),
        ...(industry !== undefined && { industry }),
        ...(website !== undefined && { website }),
        ...(phone !== undefined && { phone }),
        ...(notes !== undefined && { notes }),
      });
      if (!success) return err(`Company '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_company",
    {
      description: "Delete a company by its ID.",
      inputSchema: { id: z.string().describe("Company ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteCompany(id);
      if (!success) return err(`Company '${id}' not found`);
      return ok({ success: true });
    },
  );

  // --- Contacts ---

  server.registerTool(
    "list_contacts",
    {
      description: "List all CRM contacts.",
      inputSchema: {
        company_id: z.string().optional().describe("Filter by company ID"),
      },
    },
    async ({ company_id }) => {
      const items = company_id
        ? await parser.getContactsByCompany(company_id)
        : await parser.readContacts();
      return ok(items);
    },
  );

  server.registerTool(
    "get_contact",
    {
      description: "Get a single contact by their ID.",
      inputSchema: { id: z.string().describe("Contact ID") },
    },
    async ({ id }) => {
      const items = await parser.readContacts();
      const item = items.find((i) => i.id === id);
      if (!item) return err(`Contact '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_contact",
    {
      description: "Add a new contact to the CRM.",
      inputSchema: {
        first_name: z.string().describe("Contact first name"),
        last_name: z.string().describe("Contact last name"),
        company_id: z.string().describe("Associated company ID"),
        email: z.string().optional(),
        phone: z.string().optional(),
        title: z.string().optional().describe("Job title"),
        is_primary: z.boolean().optional().describe(
          "Whether this is the primary contact",
        ),
        notes: z.string().optional(),
      },
    },
    async (
      {
        first_name,
        last_name,
        company_id,
        email,
        phone,
        title,
        is_primary,
        notes,
      },
    ) => {
      const item = await parser.addContact({
        firstName: first_name,
        lastName: last_name,
        companyId: company_id,
        isPrimary: is_primary ?? false,
        ...(email && { email }),
        ...(phone && { phone }),
        ...(title && { title }),
        ...(notes && { notes }),
      });
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_contact",
    {
      description: "Update a contact's fields.",
      inputSchema: {
        id: z.string().describe("Contact ID"),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        company_id: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        title: z.string().optional(),
        is_primary: z.boolean().optional(),
        notes: z.string().optional(),
      },
    },
    async (
      {
        id,
        first_name,
        last_name,
        company_id,
        email,
        phone,
        title,
        is_primary,
        notes,
      },
    ) => {
      const success = await parser.updateContact(id, {
        ...(first_name !== undefined && { firstName: first_name }),
        ...(last_name !== undefined && { lastName: last_name }),
        ...(company_id !== undefined && { companyId: company_id }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(title !== undefined && { title }),
        ...(is_primary !== undefined && { isPrimary: is_primary }),
        ...(notes !== undefined && { notes }),
      });
      if (!success) return err(`Contact '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_contact",
    {
      description: "Delete a contact by their ID.",
      inputSchema: { id: z.string().describe("Contact ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteContact(id);
      if (!success) return err(`Contact '${id}' not found`);
      return ok({ success: true });
    },
  );

  // --- Deals ---

  server.registerTool(
    "list_deals",
    {
      description: "List all CRM deals.",
      inputSchema: {
        stage: z.enum([
          "lead",
          "qualified",
          "proposal",
          "negotiation",
          "won",
          "lost",
        ]).optional().describe("Filter by stage"),
        company_id: z.string().optional().describe("Filter by company ID"),
      },
    },
    async ({ stage, company_id }) => {
      let items = company_id
        ? await parser.getDealsByCompany(company_id)
        : await parser.readDeals();
      if (stage) items = items.filter((d) => d.stage === stage);
      return ok(items);
    },
  );

  server.registerTool(
    "get_deal",
    {
      description: "Get a single deal by its ID.",
      inputSchema: { id: z.string().describe("Deal ID") },
    },
    async ({ id }) => {
      const items = await parser.readDeals();
      const item = items.find((i) => i.id === id);
      if (!item) return err(`Deal '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_deal",
    {
      description: "Create a new deal in the CRM pipeline.",
      inputSchema: {
        title: z.string().describe("Deal title"),
        company_id: z.string().describe("Associated company ID"),
        value: z.number().optional().describe("Deal value"),
        probability: z.number().optional().describe("Win probability 0-100"),
        stage: z.enum([
          "lead",
          "qualified",
          "proposal",
          "negotiation",
          "won",
          "lost",
        ]).optional(),
        expected_close_date: z.string().optional().describe(
          "Expected close date (YYYY-MM-DD)",
        ),
        notes: z.string().optional(),
      },
    },
    async (
      {
        title,
        company_id,
        value,
        probability,
        stage,
        expected_close_date,
        notes,
      },
    ) => {
      const item = await parser.addDeal({
        title,
        companyId: company_id,
        value: value ?? 0,
        probability: probability ?? 0,
        stage: stage ?? "lead",
        ...(expected_close_date && { expectedCloseDate: expected_close_date }),
        ...(notes && { notes }),
      });
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_deal",
    {
      description: "Update a deal's fields.",
      inputSchema: {
        id: z.string().describe("Deal ID"),
        title: z.string().optional(),
        company_id: z.string().optional(),
        value: z.number().optional(),
        probability: z.number().optional(),
        stage: z.enum([
          "lead",
          "qualified",
          "proposal",
          "negotiation",
          "won",
          "lost",
        ]).optional(),
        expected_close_date: z.string().optional(),
        notes: z.string().optional(),
      },
    },
    async (
      {
        id,
        title,
        company_id,
        value,
        probability,
        stage,
        expected_close_date,
        notes,
      },
    ) => {
      const result = await parser.updateDeal(id, {
        ...(title !== undefined && { title }),
        ...(company_id !== undefined && { companyId: company_id }),
        ...(value !== undefined && { value }),
        ...(probability !== undefined && { probability }),
        ...(stage !== undefined && { stage }),
        ...(expected_close_date !== undefined &&
          { expectedCloseDate: expected_close_date }),
        ...(notes !== undefined && { notes }),
      });
      if (!result) return err(`Deal '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_deal",
    {
      description: "Delete a deal by its ID.",
      inputSchema: { id: z.string().describe("Deal ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteDeal(id);
      if (!success) return err(`Deal '${id}' not found`);
      return ok({ success: true });
    },
  );
}
