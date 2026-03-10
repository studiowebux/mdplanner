/**
 * CRM routes (companies, contacts, deals, interactions).
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";
import { eventBus } from "../../../lib/event-bus.ts";

export const crmRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });

// ================== COMPANIES ==================

const listCompaniesRoute = createRoute({
  method: "get",
  path: "/companies",
  tags: ["Companies"],
  summary: "List all companies",
  operationId: "listCompanies",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of companies",
    },
  },
});

const getCompanyRoute = createRoute({
  method: "get",
  path: "/companies/{id}",
  tags: ["Companies"],
  summary: "Get single company",
  operationId: "getCompany",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Company details",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createCompanyRoute = createRoute({
  method: "post",
  path: "/companies",
  tags: ["Companies"],
  summary: "Create company",
  operationId: "createCompany",
  request: {
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: z.any() } },
      description: "Company created",
    },
  },
});

const updateCompanyRoute = createRoute({
  method: "put",
  path: "/companies/{id}",
  tags: ["Companies"],
  summary: "Update company",
  operationId: "updateCompany",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Updated company",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteCompanyRoute = createRoute({
  method: "delete",
  path: "/companies/{id}",
  tags: ["Companies"],
  summary: "Delete company",
  operationId: "deleteCompany",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Company deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const getCompanyContactsRoute = createRoute({
  method: "get",
  path: "/companies/{id}/contacts",
  tags: ["Companies"],
  summary: "Get contacts for a company",
  operationId: "getCompanyContacts",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "Company contacts",
    },
  },
});

const getCompanyDealsRoute = createRoute({
  method: "get",
  path: "/companies/{id}/deals",
  tags: ["Companies"],
  summary: "Get deals for a company",
  operationId: "getCompanyDeals",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "Company deals",
    },
  },
});

const getCompanyInteractionsRoute = createRoute({
  method: "get",
  path: "/companies/{id}/interactions",
  tags: ["Companies"],
  summary: "Get interactions for a company",
  operationId: "getCompanyInteractions",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "Company interactions",
    },
  },
});

// ================== CONTACTS ==================

const listContactsRoute = createRoute({
  method: "get",
  path: "/contacts",
  tags: ["Contacts"],
  summary: "List all contacts",
  operationId: "listContacts",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of contacts",
    },
  },
});

const getContactRoute = createRoute({
  method: "get",
  path: "/contacts/{id}",
  tags: ["Contacts"],
  summary: "Get single contact",
  operationId: "getContact",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Contact details",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createContactRoute = createRoute({
  method: "post",
  path: "/contacts",
  tags: ["Contacts"],
  summary: "Create contact",
  operationId: "createContact",
  request: {
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: z.any() } },
      description: "Contact created",
    },
  },
});

const updateContactRoute = createRoute({
  method: "put",
  path: "/contacts/{id}",
  tags: ["Contacts"],
  summary: "Update contact",
  operationId: "updateContact",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Updated contact",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteContactRoute = createRoute({
  method: "delete",
  path: "/contacts/{id}",
  tags: ["Contacts"],
  summary: "Delete contact",
  operationId: "deleteContact",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Contact deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// ================== DEALS ==================

const listDealsRoute = createRoute({
  method: "get",
  path: "/deals",
  tags: ["Deals"],
  summary: "List all deals",
  operationId: "listDeals",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of deals",
    },
  },
});

const getDealRoute = createRoute({
  method: "get",
  path: "/deals/{id}",
  tags: ["Deals"],
  summary: "Get single deal",
  operationId: "getDeal",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Deal details",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createDealRoute = createRoute({
  method: "post",
  path: "/deals",
  tags: ["Deals"],
  summary: "Create deal",
  operationId: "createDeal",
  request: {
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: z.any() } },
      description: "Deal created",
    },
  },
});

const updateDealRoute = createRoute({
  method: "put",
  path: "/deals/{id}",
  tags: ["Deals"],
  summary: "Update deal",
  operationId: "updateDeal",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Updated deal",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteDealRoute = createRoute({
  method: "delete",
  path: "/deals/{id}",
  tags: ["Deals"],
  summary: "Delete deal",
  operationId: "deleteDeal",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Deal deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const updateDealStageRoute = createRoute({
  method: "post",
  path: "/deals/{id}/stage",
  tags: ["Deals"],
  summary: "Update deal stage",
  operationId: "updateDealStage",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": {
          schema: z.object({ stage: z.string() }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Deal stage updated",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid stage",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const getDealInteractionsRoute = createRoute({
  method: "get",
  path: "/deals/{id}/interactions",
  tags: ["Deals"],
  summary: "Get interactions for a deal",
  operationId: "getDealInteractions",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "Deal interactions",
    },
  },
});

// ================== INTERACTIONS ==================

const listInteractionsRoute = createRoute({
  method: "get",
  path: "/interactions",
  tags: ["Interactions"],
  summary: "List all interactions",
  operationId: "listInteractions",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of interactions",
    },
  },
});

const getInteractionRoute = createRoute({
  method: "get",
  path: "/interactions/{id}",
  tags: ["Interactions"],
  summary: "Get single interaction",
  operationId: "getInteraction",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Interaction details",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createInteractionRoute = createRoute({
  method: "post",
  path: "/interactions",
  tags: ["Interactions"],
  summary: "Create interaction",
  operationId: "createInteraction",
  request: {
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: z.any() } },
      description: "Interaction created",
    },
  },
});

const updateInteractionRoute = createRoute({
  method: "put",
  path: "/interactions/{id}",
  tags: ["Interactions"],
  summary: "Update interaction",
  operationId: "updateInteraction",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Updated interaction",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteInteractionRoute = createRoute({
  method: "delete",
  path: "/interactions/{id}",
  tags: ["Interactions"],
  summary: "Delete interaction",
  operationId: "deleteInteraction",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Interaction deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// ================== SUMMARY ==================

const getCrmSummaryRoute = createRoute({
  method: "get",
  path: "/crm/summary",
  tags: ["CRM"],
  summary: "Get CRM summary dashboard data",
  operationId: "getCrmSummary",
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "CRM summary",
    },
  },
});

// ================== HANDLERS ==================

crmRouter.openapi(listCompaniesRoute, async (c) => {
  const parser = getParser(c);
  const companies = await parser.readCompanies();
  return c.json(companies, 200);
});

crmRouter.openapi(getCompanyRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const companies = await parser.readCompanies();
  const company = companies.find((comp) => comp.id === id);
  if (!company) return c.json({ error: "Not found" }, 404);
  return c.json(company, 200);
});

crmRouter.openapi(createCompanyRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const companies = await parser.readCompanies();
  const id = crypto.randomUUID().substring(0, 8);
  const newCompany = {
    id,
    name: body.name,
    industry: body.industry,
    website: body.website,
    phone: body.phone,
    address: body.address,
    notes: body.notes,
    created: new Date().toISOString().split("T")[0],
  };
  companies.push(newCompany);
  await parser.saveCompanies(companies);
  await cacheWriteThrough(c, "companies");
  eventBus.emit({ entity: "crm", action: "created", id });
  return c.json(newCompany, 201);
});

crmRouter.openapi(updateCompanyRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const companies = await parser.readCompanies();
  const index = companies.findIndex((comp) => comp.id === id);
  if (index === -1) return c.json({ error: "Not found" }, 404);
  companies[index] = { ...companies[index], ...body };
  await parser.saveCompanies(companies);
  await cacheWriteThrough(c, "companies");
  eventBus.emit({ entity: "crm", action: "updated", id });
  return c.json(companies[index], 200);
});

crmRouter.openapi(deleteCompanyRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const companies = await parser.readCompanies();
  const filtered = companies.filter((comp) => comp.id !== id);
  if (filtered.length === companies.length) {
    return c.json({ error: "Not found" }, 404);
  }
  await parser.saveCompanies(filtered);
  cachePurge(c, "companies", id);
  eventBus.emit({ entity: "crm", action: "deleted", id });
  return c.json({ success: true }, 200);
});

crmRouter.openapi(getCompanyContactsRoute, async (c) => {
  const parser = getParser(c);
  const { id: companyId } = c.req.valid("param");
  const contacts = await parser.readContacts();
  const companyContacts = contacts.filter((contact) =>
    contact.companyId === companyId
  );
  return c.json(companyContacts, 200);
});

crmRouter.openapi(getCompanyDealsRoute, async (c) => {
  const parser = getParser(c);
  const { id: companyId } = c.req.valid("param");
  const deals = await parser.readDeals();
  const companyDeals = deals.filter((deal) => deal.companyId === companyId);
  return c.json(companyDeals, 200);
});

crmRouter.openapi(getCompanyInteractionsRoute, async (c) => {
  const parser = getParser(c);
  const { id: companyId } = c.req.valid("param");
  const interactions = await parser.readInteractions();
  const companyInteractions = interactions.filter((i) =>
    i.companyId === companyId
  );
  return c.json(companyInteractions, 200);
});

crmRouter.openapi(listContactsRoute, async (c) => {
  const parser = getParser(c);
  const contacts = await parser.readContacts();
  return c.json(contacts, 200);
});

crmRouter.openapi(getContactRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const contacts = await parser.readContacts();
  const contact = contacts.find((cont) => cont.id === id);
  if (!contact) return c.json({ error: "Not found" }, 404);
  return c.json(contact, 200);
});

crmRouter.openapi(createContactRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const contacts = await parser.readContacts();
  const id = crypto.randomUUID().substring(0, 8);
  const newContact = {
    id,
    companyId: body.companyId,
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    phone: body.phone,
    title: body.title,
    isPrimary: body.isPrimary || false,
    notes: body.notes,
    created: new Date().toISOString().split("T")[0],
  };
  contacts.push(newContact);
  await parser.saveContacts(contacts);
  await cacheWriteThrough(c, "contacts");
  eventBus.emit({ entity: "crm", action: "created", id });
  return c.json(newContact, 201);
});

crmRouter.openapi(updateContactRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const contacts = await parser.readContacts();
  const index = contacts.findIndex((cont) => cont.id === id);
  if (index === -1) return c.json({ error: "Not found" }, 404);
  contacts[index] = { ...contacts[index], ...body };
  await parser.saveContacts(contacts);
  await cacheWriteThrough(c, "contacts");
  eventBus.emit({ entity: "crm", action: "updated", id });
  return c.json(contacts[index], 200);
});

crmRouter.openapi(deleteContactRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const contacts = await parser.readContacts();
  const filtered = contacts.filter((cont) => cont.id !== id);
  if (filtered.length === contacts.length) {
    return c.json({ error: "Not found" }, 404);
  }
  await parser.saveContacts(filtered);
  cachePurge(c, "contacts", id);
  eventBus.emit({ entity: "crm", action: "deleted", id });
  return c.json({ success: true }, 200);
});

crmRouter.openapi(listDealsRoute, async (c) => {
  const parser = getParser(c);
  const deals = await parser.readDeals();
  return c.json(deals, 200);
});

crmRouter.openapi(getDealRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const deals = await parser.readDeals();
  const deal = deals.find((d) => d.id === id);
  if (!deal) return c.json({ error: "Not found" }, 404);
  return c.json(deal, 200);
});

crmRouter.openapi(createDealRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const deals = await parser.readDeals();
  const id = crypto.randomUUID().substring(0, 8);
  const newDeal = {
    id,
    companyId: body.companyId,
    contactId: body.contactId,
    title: body.title,
    value: body.value || 0,
    stage: body.stage || "lead",
    probability: body.probability || 0,
    expectedCloseDate: body.expectedCloseDate,
    notes: body.notes,
    created: new Date().toISOString().split("T")[0],
  };
  deals.push(newDeal);
  await parser.saveDeals(deals);
  await cacheWriteThrough(c, "deals");
  eventBus.emit({ entity: "crm", action: "created", id });
  return c.json(newDeal, 201);
});

crmRouter.openapi(updateDealRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const deals = await parser.readDeals();
  const index = deals.findIndex((d) => d.id === id);
  if (index === -1) return c.json({ error: "Not found" }, 404);
  deals[index] = { ...deals[index], ...body };
  await parser.saveDeals(deals);
  await cacheWriteThrough(c, "deals");
  eventBus.emit({ entity: "crm", action: "updated", id });
  return c.json(deals[index], 200);
});

crmRouter.openapi(deleteDealRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const deals = await parser.readDeals();
  const filtered = deals.filter((d) => d.id !== id);
  if (filtered.length === deals.length) {
    return c.json({ error: "Not found" }, 404);
  }
  await parser.saveDeals(filtered);
  cachePurge(c, "deals", id);
  eventBus.emit({ entity: "crm", action: "deleted", id });
  return c.json({ success: true }, 200);
});

crmRouter.openapi(updateDealStageRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const deals = await parser.readDeals();
  const index = deals.findIndex((d) => d.id === id);
  if (index === -1) return c.json({ error: "Not found" }, 404);
  const validStages = [
    "lead",
    "qualified",
    "proposal",
    "negotiation",
    "won",
    "lost",
  ];
  if (!validStages.includes(body.stage)) {
    return c.json({ error: "Invalid stage" }, 400);
  }
  deals[index].stage = body.stage as typeof deals[number]["stage"];
  if (body.stage === "won" || body.stage === "lost") {
    deals[index].closedAt = new Date().toISOString().split("T")[0];
  } else {
    deals[index].closedAt = undefined;
  }
  await parser.saveDeals(deals);
  await cacheWriteThrough(c, "deals");
  eventBus.emit({ entity: "crm", action: "updated", id });
  return c.json(deals[index], 200);
});

crmRouter.openapi(getDealInteractionsRoute, async (c) => {
  const parser = getParser(c);
  const { id: dealId } = c.req.valid("param");
  const interactions = await parser.readInteractions();
  const dealInteractions = interactions.filter((i) => i.dealId === dealId);
  return c.json(dealInteractions, 200);
});

crmRouter.openapi(listInteractionsRoute, async (c) => {
  const parser = getParser(c);
  const interactions = await parser.readInteractions();
  return c.json(interactions, 200);
});

crmRouter.openapi(getInteractionRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const interactions = await parser.readInteractions();
  const interaction = interactions.find((i) => i.id === id);
  if (!interaction) return c.json({ error: "Not found" }, 404);
  return c.json(interaction, 200);
});

crmRouter.openapi(createInteractionRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const interactions = await parser.readInteractions();
  const id = crypto.randomUUID().substring(0, 8);
  const newInteraction = {
    id,
    companyId: body.companyId,
    contactId: body.contactId,
    dealId: body.dealId,
    type: body.type || "note",
    summary: body.summary,
    date: body.date || new Date().toISOString().split("T")[0],
    duration: body.duration,
    nextFollowUp: body.nextFollowUp,
    notes: body.notes,
  };
  interactions.push(newInteraction);
  await parser.saveInteractions(interactions);
  await cacheWriteThrough(c, "interactions");
  eventBus.emit({ entity: "crm", action: "created", id });
  return c.json(newInteraction, 201);
});

crmRouter.openapi(updateInteractionRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const interactions = await parser.readInteractions();
  const index = interactions.findIndex((i) => i.id === id);
  if (index === -1) return c.json({ error: "Not found" }, 404);
  interactions[index] = { ...interactions[index], ...body };
  await parser.saveInteractions(interactions);
  await cacheWriteThrough(c, "interactions");
  eventBus.emit({ entity: "crm", action: "updated", id });
  return c.json(interactions[index], 200);
});

crmRouter.openapi(deleteInteractionRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const interactions = await parser.readInteractions();
  const filtered = interactions.filter((i) => i.id !== id);
  if (filtered.length === interactions.length) {
    return c.json({ error: "Not found" }, 404);
  }
  await parser.saveInteractions(filtered);
  cachePurge(c, "interactions", id);
  eventBus.emit({ entity: "crm", action: "deleted", id });
  return c.json({ success: true }, 200);
});

crmRouter.openapi(getCrmSummaryRoute, async (c) => {
  const parser = getParser(c);
  const summary = await parser.getCRMSummary();
  return c.json(summary, 200);
});
