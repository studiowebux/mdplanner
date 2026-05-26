import { z } from "@hono/zod-openapi";
import { ArchiveFieldsSchema, AuditFieldsSchema } from "./shared.types.ts";

export const VACATION_TYPES = [
  "vacation",
  "sick",
  "personal",
  "other",
] as const;

export const VACATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;

export type VacationType = typeof VACATION_TYPES[number];
export type VacationStatus = typeof VACATION_STATUSES[number];

export const VacationRequestSchema = z.object({
  id: z.string().openapi({
    description: "Vacation request ID",
    example: "vacation_abc123",
  }),
  personId: z.string().openapi({
    description: "Person ID (FK to People domain)",
    example: "person_1234_abc",
  }),
  startDate: z.string().openapi({
    description: "Start date (YYYY-MM-DD)",
    example: "2026-07-01",
  }),
  endDate: z.string().openapi({
    description: "End date (YYYY-MM-DD)",
    example: "2026-07-05",
  }),
  type: z.enum(VACATION_TYPES).openapi({
    description: "Request type",
    example: "vacation",
  }),
  status: z.enum(VACATION_STATUSES).openapi({
    description: "Approval status",
    example: "pending",
  }),
  notes: z.string().nullable().optional().openapi({
    description: "Optional notes (markdown)",
  }),
}).merge(AuditFieldsSchema).merge(ArchiveFieldsSchema).openapi(
  "VacationRequest",
);

export type VacationRequest = z.infer<typeof VacationRequestSchema>;

export const CreateVacationRequestSchema = VacationRequestSchema.pick({
  personId: true,
  startDate: true,
  endDate: true,
  type: true,
  status: true,
  notes: true,
}).partial({ notes: true, status: true }).openapi("CreateVacationRequest");

export type CreateVacationRequest = z.infer<typeof CreateVacationRequestSchema>;

export const UpdateVacationRequestSchema = CreateVacationRequestSchema.partial()
  .openapi("UpdateVacationRequest");

export type UpdateVacationRequest = z.infer<typeof UpdateVacationRequestSchema>;

export const ListVacationOptionsSchema = z.object({
  status: z.enum(VACATION_STATUSES).optional().openapi({
    param: { name: "status", in: "query" },
    description: "Filter by status",
  }),
  type: z.enum(VACATION_TYPES).optional().openapi({
    param: { name: "type", in: "query" },
    description: "Filter by type",
  }),
  personId: z.string().optional().openapi({
    param: { name: "personId", in: "query" },
    description: "Filter by person ID",
  }),
  q: z.string().optional().openapi({
    param: { name: "q", in: "query" },
    description: "Search query",
  }),
});

export type ListVacationOptions = z.infer<typeof ListVacationOptionsSchema>;
