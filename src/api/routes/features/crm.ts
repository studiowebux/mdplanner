/**
 * CRM routes (companies, contacts, deals, interactions).
 */

import { Hono } from "hono";
import { AppVariables, getParser, jsonResponse, errorResponse } from "../context.ts";

export const crmRouter = new Hono<{ Variables: AppVariables }>();

// ================== COMPANIES ==================

// GET /companies
crmRouter.get("/companies", async (c) => {
  const parser = getParser(c);
  const companies = await parser.readCompanies();
  return jsonResponse(companies);
});

// GET /companies/:id
crmRouter.get("/companies/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const companies = await parser.readCompanies();
  const company = companies.find(comp => comp.id === id);
  if (!company) return errorResponse("Not found", 404);
  return jsonResponse(company);
});

// POST /companies
crmRouter.post("/companies", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
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
  return jsonResponse(newCompany, 201);
});

// PUT /companies/:id
crmRouter.put("/companies/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const companies = await parser.readCompanies();
  const index = companies.findIndex(comp => comp.id === id);
  if (index === -1) return errorResponse("Not found", 404);
  companies[index] = { ...companies[index], ...body };
  await parser.saveCompanies(companies);
  return jsonResponse(companies[index]);
});

// DELETE /companies/:id
crmRouter.delete("/companies/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const companies = await parser.readCompanies();
  const filtered = companies.filter(comp => comp.id !== id);
  if (filtered.length === companies.length) return errorResponse("Not found", 404);
  await parser.saveCompanies(filtered);
  return jsonResponse({ success: true });
});

// GET /companies/:id/contacts - get contacts for a company
crmRouter.get("/companies/:id/contacts", async (c) => {
  const parser = getParser(c);
  const companyId = c.req.param("id");
  const contacts = await parser.readContacts();
  const companyContacts = contacts.filter(contact => contact.companyId === companyId);
  return jsonResponse(companyContacts);
});

// GET /companies/:id/deals - get deals for a company
crmRouter.get("/companies/:id/deals", async (c) => {
  const parser = getParser(c);
  const companyId = c.req.param("id");
  const deals = await parser.readDeals();
  const companyDeals = deals.filter(deal => deal.companyId === companyId);
  return jsonResponse(companyDeals);
});

// GET /companies/:id/interactions - get interactions for a company
crmRouter.get("/companies/:id/interactions", async (c) => {
  const parser = getParser(c);
  const companyId = c.req.param("id");
  const interactions = await parser.readInteractions();
  const companyInteractions = interactions.filter(i => i.companyId === companyId);
  return jsonResponse(companyInteractions);
});

// ================== CONTACTS ==================

// GET /contacts
crmRouter.get("/contacts", async (c) => {
  const parser = getParser(c);
  const contacts = await parser.readContacts();
  return jsonResponse(contacts);
});

// GET /contacts/:id
crmRouter.get("/contacts/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const contacts = await parser.readContacts();
  const contact = contacts.find(cont => cont.id === id);
  if (!contact) return errorResponse("Not found", 404);
  return jsonResponse(contact);
});

// POST /contacts
crmRouter.post("/contacts", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
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
  return jsonResponse(newContact, 201);
});

// PUT /contacts/:id
crmRouter.put("/contacts/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const contacts = await parser.readContacts();
  const index = contacts.findIndex(cont => cont.id === id);
  if (index === -1) return errorResponse("Not found", 404);
  contacts[index] = { ...contacts[index], ...body };
  await parser.saveContacts(contacts);
  return jsonResponse(contacts[index]);
});

// DELETE /contacts/:id
crmRouter.delete("/contacts/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const contacts = await parser.readContacts();
  const filtered = contacts.filter(cont => cont.id !== id);
  if (filtered.length === contacts.length) return errorResponse("Not found", 404);
  await parser.saveContacts(filtered);
  return jsonResponse({ success: true });
});

// ================== DEALS ==================

// GET /deals
crmRouter.get("/deals", async (c) => {
  const parser = getParser(c);
  const deals = await parser.readDeals();
  return jsonResponse(deals);
});

// GET /deals/:id
crmRouter.get("/deals/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const deals = await parser.readDeals();
  const deal = deals.find(d => d.id === id);
  if (!deal) return errorResponse("Not found", 404);
  return jsonResponse(deal);
});

// POST /deals
crmRouter.post("/deals", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
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
  return jsonResponse(newDeal, 201);
});

// PUT /deals/:id
crmRouter.put("/deals/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const deals = await parser.readDeals();
  const index = deals.findIndex(d => d.id === id);
  if (index === -1) return errorResponse("Not found", 404);
  deals[index] = { ...deals[index], ...body };
  await parser.saveDeals(deals);
  return jsonResponse(deals[index]);
});

// DELETE /deals/:id
crmRouter.delete("/deals/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const deals = await parser.readDeals();
  const filtered = deals.filter(d => d.id !== id);
  if (filtered.length === deals.length) return errorResponse("Not found", 404);
  await parser.saveDeals(filtered);
  return jsonResponse({ success: true });
});

// POST /deals/:id/stage - update deal stage
crmRouter.post("/deals/:id/stage", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const deals = await parser.readDeals();
  const index = deals.findIndex(d => d.id === id);
  if (index === -1) return errorResponse("Not found", 404);

  const validStages = ["lead", "qualified", "proposal", "negotiation", "won", "lost"];
  if (!validStages.includes(body.stage)) {
    return errorResponse("Invalid stage", 400);
  }

  deals[index].stage = body.stage;

  // Set closedAt if won or lost
  if (body.stage === "won" || body.stage === "lost") {
    deals[index].closedAt = new Date().toISOString().split("T")[0];
  } else {
    deals[index].closedAt = undefined;
  }

  await parser.saveDeals(deals);
  return jsonResponse(deals[index]);
});

// GET /deals/:id/interactions - get interactions for a deal
crmRouter.get("/deals/:id/interactions", async (c) => {
  const parser = getParser(c);
  const dealId = c.req.param("id");
  const interactions = await parser.readInteractions();
  const dealInteractions = interactions.filter(i => i.dealId === dealId);
  return jsonResponse(dealInteractions);
});

// ================== INTERACTIONS ==================

// GET /interactions
crmRouter.get("/interactions", async (c) => {
  const parser = getParser(c);
  const interactions = await parser.readInteractions();
  return jsonResponse(interactions);
});

// GET /interactions/:id
crmRouter.get("/interactions/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const interactions = await parser.readInteractions();
  const interaction = interactions.find(i => i.id === id);
  if (!interaction) return errorResponse("Not found", 404);
  return jsonResponse(interaction);
});

// POST /interactions
crmRouter.post("/interactions", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
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
  return jsonResponse(newInteraction, 201);
});

// PUT /interactions/:id
crmRouter.put("/interactions/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const interactions = await parser.readInteractions();
  const index = interactions.findIndex(i => i.id === id);
  if (index === -1) return errorResponse("Not found", 404);
  interactions[index] = { ...interactions[index], ...body };
  await parser.saveInteractions(interactions);
  return jsonResponse(interactions[index]);
});

// DELETE /interactions/:id
crmRouter.delete("/interactions/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const interactions = await parser.readInteractions();
  const filtered = interactions.filter(i => i.id !== id);
  if (filtered.length === interactions.length) return errorResponse("Not found", 404);
  await parser.saveInteractions(filtered);
  return jsonResponse({ success: true });
});

// ================== SUMMARY ==================

// GET /crm/summary - get CRM summary/dashboard data
crmRouter.get("/crm/summary", async (c) => {
  const parser = getParser(c);
  const summary = await parser.getCRMSummary();
  return jsonResponse(summary);
});
