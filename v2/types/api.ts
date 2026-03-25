// Shared API schemas — imported by all route files.

import { z } from "@hono/zod-openapi";

export const ErrorSchema = z
  .object({
    error: z.string().openapi({
      description: "Error code (UPPER_SNAKE_CASE)",
      example: "MILESTONE_NOT_FOUND",
    }),
    message: z.string().openapi({
      description: "Human-readable error description",
      example: "Milestone not found",
    }),
  })
  .openapi("Error");

export const IdParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

/** Path params: /{id}/…/{updateId} */
export const IdWithUpdateIdParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
  updateId: z.string().openapi({ param: { name: "updateId", in: "path" } }),
});

/** Path params: /{id}/records/{index} */
export const IdWithIndexParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
  index: z.string().openapi({ param: { name: "index", in: "path" } }),
});

/**
 * Standard 404 error body.
 * Usage: `c.json(notFound("TASK", id), 404)`
 */
export const notFound = (entity: string, id: string) => ({
  error: `${entity}_NOT_FOUND`,
  message: `${entity.charAt(0)}${
    entity.slice(1).toLowerCase()
  } ${id} not found`,
});
