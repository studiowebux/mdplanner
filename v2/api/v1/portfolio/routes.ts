import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getPortfolioService } from "../../../singletons/services.ts";
import { PortfolioItemSchema } from "../../../types/portfolio.types.ts";
import { ErrorSchema } from "../../../types/api.ts";

export const portfolioRouter = new OpenAPIHono();

// GET / — list all or search with ?q=
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Portfolio"],
  summary: "List portfolio items, optionally filtered by ?q= search",
  operationId: "listPortfolio",
  request: {
    query: z.object({
      q: z.string().optional().openapi({ description: "Search query" }),
      status: z.string().optional().openapi({
        description: "Filter by status",
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(PortfolioItemSchema) } },
      description: "List of portfolio items",
    },
  },
});

portfolioRouter.openapi(listRoute, async (c) => {
  const { q, status } = c.req.valid("query");
  const svc = getPortfolioService();
  let items = q ? await svc.search(q) : await svc.list();
  if (status) items = items.filter((i) => i.status === status);
  return c.json(items, 200);
});

// GET /:id
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Portfolio"],
  summary: "Get portfolio item by ID",
  operationId: "getPortfolioItem",
  request: {
    params: z.object({
      id: z.string().openapi({ param: { name: "id", in: "path" } }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: PortfolioItemSchema } },
      description: "Portfolio item",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

portfolioRouter.openapi(getRoute, async (c) => {
  const { id } = c.req.valid("param");
  const item = await getPortfolioService().getById(id);
  if (!item) {
    return c.json(
      {
        error: "PORTFOLIO_ITEM_NOT_FOUND",
        message: `Portfolio item ${id} not found`,
      },
      404,
    );
  }
  return c.json(item, 200);
});
