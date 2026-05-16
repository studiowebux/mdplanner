// Shared API schemas — imported by all route files.

import { z } from "@hono/zod-openapi";

export type AppError = {
  error: string;
  message: string;
  status: number;
  requestId?: string;
  component?: string;
  [key: string]: unknown;
};

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
    status: z.number().optional().openapi({
      description: "HTTP status code mirrored in the body",
      example: 404,
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

/** Path params: /{id}/link/{targetId} */
export const IdWithTargetIdParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
  targetId: z.string().openapi({ param: { name: "targetId", in: "path" } }),
});

/** Path params: /{id}/records/{index} */
export const IdWithIndexParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
  index: z.string().openapi({ param: { name: "index", in: "path" } }),
});

/** 404 — entity not found. Usage: `c.json(notFound("TASK", id), 404)` */
export const notFound = (
  entity: string,
  id: string,
  extra?: Partial<AppError>,
): AppError => ({
  error: `${entity}_NOT_FOUND`,
  message: `${entity.charAt(0)}${
    entity.slice(1).toLowerCase()
  } ${id} not found`,
  status: 404,
  ...extra,
});

/** 400 — malformed request or missing required field. */
export const badRequest = (
  msg: string,
  extra?: Partial<AppError>,
): AppError => ({
  error: "BAD_REQUEST",
  message: msg,
  status: 400,
  ...extra,
});

/** 422 — request is well-formed but violates business rules / invalid state transition. */
export const invalidState = (
  msg: string,
  extra?: Partial<AppError>,
): AppError => ({
  error: "INVALID_STATE",
  message: msg,
  status: 422,
  ...extra,
});

/** 409 — optimistic-lock conflict or duplicate. */
export const conflict = (msg: string, extra?: Partial<AppError>): AppError => ({
  error: "CONFLICT",
  message: msg,
  status: 409,
  ...extra,
});

/** 500 — unexpected server error. */
export const serverError = (
  msg: string,
  extra?: Partial<AppError>,
): AppError => ({
  error: "SERVER_ERROR",
  message: msg,
  status: 500,
  ...extra,
});

/** 403 — authenticated but not authorized. */
export const forbidden = (
  msg: string,
  extra?: Partial<AppError>,
): AppError => ({
  error: "FORBIDDEN",
  message: msg,
  status: 403,
  ...extra,
});
