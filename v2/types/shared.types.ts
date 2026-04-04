/**
 * Shared Zod schemas reused across domain type files.
 * Import from here — never duplicate these field definitions.
 */

import { z } from "@hono/zod-openapi";

// ---------------------------------------------------------------------------
// Audit fields — present on every persisted domain entity
// ---------------------------------------------------------------------------

export const AuditFieldsSchema = z.object({
  createdAt: z.string().openapi({ description: "ISO creation timestamp" }),
  updatedAt: z.string().openapi({
    description: "ISO last-updated timestamp",
  }),
  createdBy: z.string().nullable().optional().openapi({
    description: "Person ID of the creator",
  }),
  updatedBy: z.string().nullable().optional().openapi({
    description: "Person ID of the last updater",
  }),
});

export type AuditFields = z.infer<typeof AuditFieldsSchema>;
