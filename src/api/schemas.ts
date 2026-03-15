/**
 * Shared Zod schemas for API request validation.
 *
 * These schemas validate incoming request bodies at the handler boundary.
 * Parsed values are passed to the parser layer — no raw JSON reaches
 * business logic.
 */

import { z } from "zod";

// -- Tasks --

export const CreateTaskSchema = z.object({
  title: z.string().min(1).default("Untitled"),
  section: z.string().optional(),
  description: z.string().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  effort: z.number().int().min(0).optional(),
  due_date: z.string().optional(),
  assignee: z.string().optional(),
  milestone: z.string().optional(),
  planned_start: z.string().optional(),
  planned_end: z.string().optional(),
  project: z.string().optional(),
  blocked_by: z.array(z.string()).optional(),
  claimed_by: z.string().optional(),
  claimed_at: z.string().optional(),
  tags: z.array(z.string()).optional(),
  parentId: z.string().optional(),
}).strict();

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  section: z.string().optional(),
  completed: z.boolean().optional(),
  description: z.string().optional(),
  expected_revision: z.number().int().optional(),
  agent_id: z.string().optional(),
  priority: z.number().int().min(1).max(5).nullable().optional(),
  effort: z.number().int().min(0).nullable().optional(),
  due_date: z.string().nullable().optional(),
  assignee: z.string().nullable().optional(),
  milestone: z.string().nullable().optional(),
  planned_start: z.string().nullable().optional(),
  planned_end: z.string().nullable().optional(),
  project: z.string().nullable().optional(),
  blocked_by: z.array(z.string()).optional(),
  claimed_by: z.string().nullable().optional(),
  claimed_at: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  githubRepo: z.string().nullable().optional(),
  githubIssue: z.number().int().nullable().optional(),
  githubPR: z.number().int().nullable().optional(),
}).strict();

export const BatchUpdateSchema = z.object({
  updates: z.array(
    UpdateTaskSchema.extend({
      id: z.string().min(1),
      comment: z.string().optional(),
      comment_author: z.string().optional(),
      comment_metadata: z.record(z.unknown()).optional(),
    }),
  ).min(1).max(50),
});

export const TaskMoveSchema = z.object({
  section: z.string().min(1),
  position: z.number().int().min(0).optional(),
}).strict();

export const TaskAttachmentsSchema = z.object({
  paths: z.array(z.string().min(1)).min(1),
}).strict();

export const TaskCommentSchema = z.object({
  body: z.string().min(1),
  author: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
}).strict();

export const TaskCommentUpdateSchema = z.object({
  body: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
}).strict();

export const TaskClaimSchema = z.object({
  assignee: z.string().min(1),
  expected_section: z.string().optional(),
  expected_revision: z.number().int().optional(),
}).strict();

export const SweepStaleClaimsSchema = z.object({
  ttl_minutes: z.number().int().min(1).default(30),
}).strict();

export const RequestApprovalSchema = z.object({
  summary: z.string().min(1),
  requested_by: z.string().optional(),
  commit_hash: z.string().optional(),
  artifact_urls: z.array(z.string()).optional(),
}).strict();

export const ApproveTaskSchema = z.object({
  decided_by: z.string().optional(),
  feedback: z.string().optional(),
}).strict();

export const RejectionTypeEnum = z.enum([
  "wrong-approach",
  "incomplete",
  "out-of-scope",
  "needs-discussion",
]);

export const RejectTaskSchema = z.object({
  decided_by: z.string().optional(),
  feedback: z.string().min(1),
  rejection_type: RejectionTypeEnum,
}).strict();

// -- Notes --

const NoteParagraphSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "code"]),
  content: z.string(),
  language: z.string().optional(),
  order: z.number(),
  globalOrder: z.number().optional(),
  metadata: z.object({
    collapsed: z.boolean().optional(),
    readonly: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

const CustomSectionSchema = z.object({
  id: z.string(),
  type: z.enum(["tabs", "timeline", "split-view"]),
  title: z.string(),
  order: z.number(),
  globalOrder: z.number().optional(),
  config: z.object({
    tabs: z.array(z.object({
      id: z.string(),
      title: z.string(),
      content: z.array(NoteParagraphSchema),
    })).optional(),
    timeline: z.array(z.object({
      id: z.string(),
      title: z.string(),
      status: z.enum(["success", "failed", "pending"]),
      date: z.string().optional(),
      content: z.array(NoteParagraphSchema),
    })).optional(),
    splitView: z.object({
      columns: z.array(z.array(NoteParagraphSchema)),
    }).optional(),
  }),
});

export const CreateNoteSchema = z.object({
  title: z.string().min(1),
  content: z.string().default(""),
  mode: z.enum(["simple", "enhanced"]).default("simple"),
  paragraphs: z.array(NoteParagraphSchema).optional(),
  customSections: z.array(CustomSectionSchema).optional(),
  project: z.string().optional(),
}).strict();

export const UpdateNoteSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  mode: z.enum(["simple", "enhanced"]).optional(),
  paragraphs: z.array(NoteParagraphSchema).optional(),
  customSections: z.array(CustomSectionSchema).optional(),
  project: z.string().optional(),
  updatedAt: z.string().optional(),
}).strict();

// -- Goals --

const GoalStatusEnum = z.enum([
  "planning",
  "on-track",
  "at-risk",
  "late",
  "success",
  "failed",
]);

const GoalTypeEnum = z.enum(["enterprise", "project"]);

export const CreateGoalSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  type: GoalTypeEnum.default("project"),
  kpi: z.string().default(""),
  kpiMetric: z.string().optional(),
  kpiTarget: z.number().optional(),
  status: GoalStatusEnum.default("planning"),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  githubRepo: z.string().optional(),
  githubMilestone: z.number().int().optional(),
  linkedPortfolioItems: z.array(z.string()).optional(),
}).strict();

export const UpdateGoalSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: GoalTypeEnum.optional(),
  kpi: z.string().optional(),
  kpiMetric: z.string().nullable().optional(),
  kpiTarget: z.number().nullable().optional(),
  status: GoalStatusEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  githubRepo: z.string().optional(),
  githubMilestone: z.number().int().optional(),
  linkedPortfolioItems: z.array(z.string()).optional(),
}).strict();

/**
 * Parse a request body with a Zod schema.
 * Returns the parsed data or a 400 error response string.
 */
export function parseBody<T>(
  schema: z.ZodType<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const issues = result.error.issues.map((i) =>
    `${i.path.join(".")}: ${i.message}`
  ).join("; ");
  return { success: false, error: issues };
}
