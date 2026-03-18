import { z } from "@hono/zod-openapi";
import { WEEKDAYS } from "../constants/mod.ts";

// ---------------------------------------------------------------------------
// Agent model — AI agent configuration
// ---------------------------------------------------------------------------

export const AgentModelSchema = z.object({
  name: z.string().min(1).openapi({
    description: "Model name",
    example: "claude-sonnet-4-5-20250514",
  }),
  provider: z.string().min(1).openapi({
    description: "Model provider",
    example: "anthropic",
  }),
  endpoint: z.string().optional().openapi({
    description: "Custom endpoint URL",
  }),
}).openapi("AgentModel");

export type AgentModel = z.infer<typeof AgentModelSchema>;

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const AGENT_TYPES = ["human", "ai", "hybrid"] as const;
export const AGENT_STATUSES = ["idle", "working", "offline"] as const;

export type AgentType = (typeof AGENT_TYPES)[number];
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const AGENT_TYPE_OPTIONS = AGENT_TYPES.map((t) => ({
  value: t,
  label: t.charAt(0).toUpperCase() + t.slice(1),
}));

// ---------------------------------------------------------------------------
// Person — base entity as stored on disk
// ---------------------------------------------------------------------------

export const PersonSchema = z.object({
  id: z.string().openapi({
    description: "Unique person identifier",
    example: "person_1771824811363_phhxpx",
  }),
  name: z.string().openapi({
    description: "Full name",
    example: "Jane Smith",
  }),
  title: z.string().optional().openapi({
    description: "Job title",
    example: "Senior Engineer",
  }),
  role: z.string().optional().openapi({
    description: "Role within team",
    example: "developer",
  }),
  departments: z.array(z.string()).optional().openapi({
    description: "Department names",
    example: ["Engineering", "Platform"],
  }),
  reportsTo: z.string().optional().openapi({
    description: "Person ID of direct manager",
  }),
  email: z.string().optional().openapi({
    description: "Email address",
    example: "jane@example.com",
  }),
  phone: z.string().optional().openapi({
    description: "Phone number",
  }),
  startDate: z.string().optional().openapi({
    description: "Start date (YYYY-MM-DD)",
    example: "2025-01-15",
  }),
  hoursPerDay: z.number().optional().openapi({
    description: "Working hours per day",
    example: 8,
  }),
  workingDays: z.array(z.enum(WEEKDAYS)).optional().openapi({
    description: "Working day names",
    example: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  }),
  notes: z.string().optional().openapi({
    description: "Markdown notes (from file body after H1 heading)",
  }),
  agentType: z.enum(AGENT_TYPES).optional().openapi({
    description: "Agent classification",
    example: "human",
  }),
  skills: z.array(z.string()).optional().openapi({
    description: "Capabilities",
    example: ["typescript", "go", "code-review"],
  }),
  models: z.array(AgentModelSchema).optional().openapi({
    description: "AI models the agent can use",
  }),
  systemPrompt: z.string().optional().openapi({
    description: "Default system prompt for AI agents",
  }),
  status: z.enum(AGENT_STATUSES).optional().openapi({
    description: "Agent availability status",
    example: "idle",
  }),
  lastSeen: z.string().optional().openapi({
    description: "ISO timestamp of last agent interaction",
  }),
  currentTaskId: z.string().optional().openapi({
    description: "Task ID the agent is actively working on",
  }),
}).openapi("Person");

export type Person = z.infer<typeof PersonSchema>;

// ---------------------------------------------------------------------------
// Person with children — for org tree
// ---------------------------------------------------------------------------

export const PersonWithChildrenSchema: z.ZodType<PersonWithChildren> = z.lazy(
  () =>
    PersonSchema.extend({
      children: z.array(PersonWithChildrenSchema).optional().openapi({
        description: "Direct reports",
      }),
    }).openapi("PersonWithChildren"),
);

export type PersonWithChildren = Person & {
  children?: PersonWithChildren[];
};

// ---------------------------------------------------------------------------
// Create — omit system-managed fields, require name
// ---------------------------------------------------------------------------

/** Fields the caller cannot set — managed by the system. */
const SYSTEM_FIELDS = {
  id: true,
  status: true,
  lastSeen: true,
  currentTaskId: true,
} as const;

export const CreatePersonSchema = PersonSchema
  .omit(SYSTEM_FIELDS)
  .required({ name: true })
  .openapi("CreatePerson");

export type CreatePerson = z.infer<typeof CreatePersonSchema>;

// ---------------------------------------------------------------------------
// Update — all fields optional + nullable (null clears a field)
// ---------------------------------------------------------------------------

export const UpdatePersonSchema = PersonSchema
  .omit({ id: true })
  .partial()
  .openapi("UpdatePerson");

export type UpdatePerson = z.infer<typeof UpdatePersonSchema>;

// ---------------------------------------------------------------------------
// People summary
// ---------------------------------------------------------------------------

export const PeopleSummarySchema = z.object({
  totalPeople: z.number().openapi({ description: "Total person count" }),
  totalDepartments: z.number().openapi({
    description: "Unique department count",
  }),
  departments: z.array(z.string()).openapi({
    description: "List of all unique departments",
  }),
}).openapi("PeopleSummary");

export type PeopleSummary = z.infer<typeof PeopleSummarySchema>;
