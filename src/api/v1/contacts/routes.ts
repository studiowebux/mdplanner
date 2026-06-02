// Contact CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getContactService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  ContactSchema,
  CreateContactSchema,
  ListContactOptionsSchema,
  UpdateContactSchema,
} from "../../../types/contact.types.ts";
import {
  IdParam,
  jsonContent,
  notFound,
  notFoundContent,
} from "../../../types/api.ts";

export const contactsRouter = new OpenAPIHono();

// GET /
const listContactsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Contacts"],
  summary: "List all contacts",
  operationId: "listContacts",
  request: { query: ListContactOptionsSchema },
  responses: {
    200: jsonContent(z.array(ContactSchema), "List of contacts"),
  },
});

contactsRouter.openapi(listContactsRoute, async (c) => {
  try {
    const { q, type, company } = c.req.valid("query");
    const contacts = await getContactService().list({ q, type, company });
    return c.json(contacts, 200);
  } catch (err) {
    throw err;
  }
});

// GET /{id}
const getContactRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Contacts"],
  summary: "Get contact by ID",
  operationId: "getContact",
  request: { params: IdParam },
  responses: {
    200: jsonContent(ContactSchema, "Contact"),
    404: notFoundContent,
  },
});

contactsRouter.openapi(getContactRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const contact = await getContactService().getById(id);
    if (!contact) return c.json(notFound("Contact", id), 404);
    return c.json(contact, 200);
  } catch (err) {
    throw err;
  }
});

// POST /
const createContactRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Contacts"],
  summary: "Create a contact",
  operationId: "createContact",
  request: {
    body: {
      content: { "application/json": { schema: CreateContactSchema } },
      required: true,
    },
  },
  responses: {
    201: jsonContent(ContactSchema, "Created contact"),
  },
});

contactsRouter.openapi(createContactRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const contact = await getContactService().create(data);
    publish("contact.created");
    return c.json(contact, 201);
  } catch (err) {
    throw err;
  }
});

// PUT /{id}
const updateContactRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Contacts"],
  summary: "Update a contact",
  operationId: "updateContact",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateContactSchema } },
      required: true,
    },
  },
  responses: {
    200: jsonContent(ContactSchema, "Updated contact"),
    404: notFoundContent,
  },
});

contactsRouter.openapi(updateContactRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const contact = await getContactService().update(id, data);
    if (!contact) return c.json(notFound("Contact", id), 404);
    publish("contact.updated");
    return c.json(contact, 200);
  } catch (err) {
    throw err;
  }
});

// DELETE /{id}
const deleteContactRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Contacts"],
  summary: "Delete a contact",
  operationId: "deleteContact",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: notFoundContent,
  },
});

contactsRouter.openapi(deleteContactRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const ok = await getContactService().delete(id);
    if (!ok) return c.json(notFound("Contact", id), 404);
    publish("contact.deleted");
    return new Response(null, { status: 204 });
  } catch (err) {
    throw err;
  }
});
