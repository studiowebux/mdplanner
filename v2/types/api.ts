// Shared API schemas — imported by all route files.

import { z } from "@hono/zod-openapi";

export const ErrorSchema = z
  .object({ error: z.string(), message: z.string() })
  .openapi("Error");
