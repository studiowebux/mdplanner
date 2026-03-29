import { z } from "@hono/zod-openapi";
import { WEEKDAYS } from "../constants/mod.ts";
import type { ViewMode } from "./app.ts";

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
  endpoint: z.string().nullable().optional().openapi({
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
  title: z.string().nullable().optional().openapi({
    description: "Job title",
    example: "Senior Engineer",
  }),
  role: z.string().nullable().optional().openapi({
    description: "Role within team",
    example: "developer",
  }),
  departments: z.array(z.string()).nullable().optional().openapi({
    description: "Department names",
    example: ["Engineering", "Platform"],
  }),
  reportsTo: z.string().nullable().optional().openapi({
    description: "Person ID of direct manager",
  }),
  email: z.string().nullable().optional().openapi({
    description: "Email address",
    example: "jane@example.com",
  }),
  phone: z.string().nullable().optional().openapi({
    description: "Phone number",
  }),
  startDate: z.string().nullable().optional().openapi({
    description: "Start date (YYYY-MM-DD)",
    example: "2025-01-15",
  }),
  hoursPerDay: z.number().nullable().optional().openapi({
    description: "Working hours per day",
    example: 8,
  }),
  workingDays: z.array(z.enum(WEEKDAYS)).nullable().optional().openapi({
    description: "Working day names",
    example: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  }),
  notes: z.string().nullable().optional().openapi({
    description: "Markdown notes (from file body after H1 heading)",
  }),
  agentType: z.enum(AGENT_TYPES).nullable().optional().openapi({
    description: "Agent classification",
    example: "human",
  }),
  skills: z.array(z.string()).nullable().optional().openapi({
    description: "Capabilities",
    example: ["typescript", "go", "code-review"],
  }),
  models: z.array(AgentModelSchema).nullable().optional().openapi({
    description: "AI models the agent can use",
  }),
  systemPrompt: z.string().nullable().optional().openapi({
    description: "Default system prompt for AI agents",
  }),
  status: z.enum(AGENT_STATUSES).nullable().optional().openapi({
    description: "Agent availability status",
    example: "idle",
  }),
  lastSeen: z.string().nullable().optional().openapi({
    description: "ISO timestamp of last agent interaction",
  }),
  currentTaskId: z.string().nullable().optional().openapi({
    description: "Task ID the agent is actively working on",
  }),
  createdAt: z.string().nullable().optional().openapi({
    description: "ISO creation timestamp",
  }),
  updatedAt: z.string().nullable().optional().openapi({
    description: "ISO last-updated timestamp",
  }),
  createdBy: z.string().nullable().optional().openapi({
    description: "Person ID of the creator",
  }),
  updatedBy: z.string().nullable().optional().openapi({
    description: "Person ID of the last updater",
  }),
}).openapi("Person");

export type Person = z.infer<typeof PersonSchema>;

// ---------------------------------------------------------------------------
// Person with children — for org tree
// ---------------------------------------------------------------------------

export const PersonWithChildrenSchema = PersonSchema.extend({
  children: z.array(
    PersonSchema.extend({
      children: z.array(
        PersonSchema.extend({
          children: z.array(PersonSchema).optional().openapi({
            description: "Direct reports (level 3)",
          }),
        }).openapi("PersonTreeLevel3"),
      ).optional().openapi({ description: "Direct reports (level 2)" }),
    }).openapi("PersonTreeLevel2"),
  ).optional().openapi({ description: "Direct reports" }),
}).openapi("PersonWithChildren");

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

// ---------------------------------------------------------------------------
// List options — query filter for list_people
// ---------------------------------------------------------------------------

export const ListPeopleOptionsSchema = z.object({
  department: z.string().optional().openapi({
    description: "Filter by department",
  }),
}).openapi("ListPeopleOptions");

export type ListPeopleOptions = z.infer<typeof ListPeopleOptionsSchema>;

// ---------------------------------------------------------------------------
// Heartbeat input — agent liveness signal
// ---------------------------------------------------------------------------

export const HeartbeatInputSchema = z.object({
  id: PersonSchema.shape.id.describe("Person ID of the agent"),
  status: PersonSchema.shape.status.describe(
    "Agent status (default: keeps current value)",
  ),
  currentTaskId: PersonSchema.shape.currentTaskId.describe(
    "Task ID the agent is currently working on (empty string to clear)",
  ),
}).openapi("HeartbeatInput");

// ---------------------------------------------------------------------------
// List by skill — filter people who have a specific skill
// ---------------------------------------------------------------------------

export const ListPeopleBySkillSchema = z.object({
  skill: z.string().openapi({
    description: "Skill to filter by (case-insensitive match)",
    example: "typescript",
  }),
}).openapi("ListPeopleBySkill");

// ---------------------------------------------------------------------------
// Availability filter
// ---------------------------------------------------------------------------

export const GetPeopleAvailabilitySchema = z.object({
  excludeOffline: z.boolean().optional().openapi({
    description: "Exclude offline agents (default: true)",
  }),
}).openapi("GetPeopleAvailability");

// ---------------------------------------------------------------------------
// Find person for task — skills-based matching
// ---------------------------------------------------------------------------

export const FindPersonForSkillsSchema = z.object({
  skills: z.array(z.string()).openapi({
    description: "Required skills to match against people",
    example: ["typescript", "testing"],
  }),
}).openapi("FindPersonForSkills");

export const PersonSkillMatchSchema = z.object({
  person: PersonSchema,
  matchedSkills: z.array(z.string()).openapi({
    description: "Skills that matched",
  }),
  score: z.number().openapi({
    description: "Number of matched skills",
  }),
}).openapi("PersonSkillMatch");

export type PersonSkillMatch = z.infer<typeof PersonSkillMatchSchema>;

// ---------------------------------------------------------------------------
// Workload — capacity and current assignment info
// ---------------------------------------------------------------------------

export const PersonWorkloadSchema = z.object({
  id: PersonSchema.shape.id,
  name: PersonSchema.shape.name,
  status: PersonSchema.shape.status,
  currentTaskId: PersonSchema.shape.currentTaskId,
  hoursPerDay: PersonSchema.shape.hoursPerDay,
  workingDays: PersonSchema.shape.workingDays,
  agentType: PersonSchema.shape.agentType,
}).openapi("PersonWorkload");

export type PersonWorkload = z.infer<typeof PersonWorkloadSchema>;

// ---------------------------------------------------------------------------
// People-specific view mode — extends base ViewMode with org chart
// ---------------------------------------------------------------------------

export type PeopleViewMode = ViewMode | "org";
