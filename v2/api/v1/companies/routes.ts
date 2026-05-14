// Company CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getCompanyService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CompanySchema,
  CreateCompanySchema,
  ListCompanyOptionsSchema,
  UpdateCompanySchema,
} from "../../../types/company.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const companiesRouter = new OpenAPIHono();

// GET /
const listCompaniesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Companies"],
  summary: "List all companies",
  operationId: "listCompanies",
  request: { query: ListCompanyOptionsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(CompanySchema) } },
      description: "List of companies",
    },
  },
});

companiesRouter.openapi(listCompaniesRoute, async (c) => {
  try {
    const { q, type, industry } = c.req.valid("query");
    const companies = await getCompanyService().list({ q, type, industry });
    return c.json(companies, 200);
  } catch (err) {
    throw err;
  }
});

// GET /{id}
const getCompanyRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Companies"],
  summary: "Get company by ID",
  operationId: "getCompany",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: CompanySchema } },
      description: "Company",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

companiesRouter.openapi(getCompanyRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const company = await getCompanyService().getById(id);
    if (!company) return c.json(notFound("Company", id), 404);
    return c.json(company, 200);
  } catch (err) {
    throw err;
  }
});

// POST /
const createCompanyRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Companies"],
  summary: "Create a company",
  operationId: "createCompany",
  request: {
    body: {
      content: { "application/json": { schema: CreateCompanySchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: CompanySchema } },
      description: "Created company",
    },
  },
});

companiesRouter.openapi(createCompanyRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const company = await getCompanyService().create(data);
    publish("company.created");
    return c.json(company, 201);
  } catch (err) {
    throw err;
  }
});

// PUT /{id}
const updateCompanyRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Companies"],
  summary: "Update a company",
  operationId: "updateCompany",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateCompanySchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: CompanySchema } },
      description: "Updated company",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

companiesRouter.openapi(updateCompanyRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const company = await getCompanyService().update(id, data);
    if (!company) return c.json(notFound("Company", id), 404);
    publish("company.updated");
    return c.json(company, 200);
  } catch (err) {
    throw err;
  }
});

// DELETE /{id}
const deleteCompanyRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Companies"],
  summary: "Delete a company",
  operationId: "deleteCompany",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

companiesRouter.openapi(deleteCompanyRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const ok = await getCompanyService().delete(id);
    if (!ok) return c.json(notFound("Company", id), 404);
    publish("company.deleted");
    return new Response(null, { status: 204 });
  } catch (err) {
    throw err;
  }
});
