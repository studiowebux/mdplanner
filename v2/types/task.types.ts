import { z } from "@hono/zod-openapi";

// ---------------------------------------------------------------------------
// Rejection types for approval workflow
// ---------------------------------------------------------------------------

export const REJECTION_TYPES = [
  "wrong-approach",
  "incomplete",
  "out-of-scope",
  "needs-discussion",
] as const;

// ---------------------------------------------------------------------------
// Time Entry
// ---------------------------------------------------------------------------

export const TimeEntrySchema = z.object({
  id: z.string().openapi({ description: "Time entry ID" }),
  date: z.string().openapi({ description: "Date (YYYY-MM-DD)" }),
  hours: z.number().openapi({ description: "Hours worked" }),
  person: z.string().optional().openapi({ description: "Person ID" }),
  description: z.string().optional().openapi({
    description: "Work description",
  }),
}).openapi("TimeEntry");

export type TimeEntry = z.infer<typeof TimeEntrySchema>;

// ---------------------------------------------------------------------------
// Task Comment
// ---------------------------------------------------------------------------

export const TaskCommentSchema = z.object({
  id: z.string().openapi({ description: "Comment ID" }),
  author: z.string().optional().openapi({ description: "Author name" }),
  timestamp: z.string().openapi({ description: "ISO date string" }),
  body: z.string().openapi({ description: "Comment text" }),
  metadata: z.record(z.string(), z.unknown()).optional().openapi({
    description: "Structured metadata for machine-readable progress",
  }),
}).openapi("TaskComment");

export type TaskComment = z.infer<typeof TaskCommentSchema>;

// ---------------------------------------------------------------------------
// Approval
// ---------------------------------------------------------------------------

export const ApprovalVerdictSchema = z.object({
  decidedAt: z.string().openapi({ description: "ISO date of decision" }),
  decidedBy: z.string().openapi({ description: "Human person ID" }),
  decision: z.enum(["approved", "rejected"]).openapi({
    description: "Approval decision",
  }),
  feedback: z.string().optional().openapi({
    description: "Reviewer feedback",
  }),
  rejectionType: z.enum(REJECTION_TYPES).optional().openapi({
    description: "Rejection reason category",
  }),
}).openapi("ApprovalVerdict");

export type ApprovalVerdict = z.infer<typeof ApprovalVerdictSchema>;

export const ApprovalRequestSchema = z.object({
  id: z.string().openapi({ description: "Request ID" }),
  requestedAt: z.string().openapi({ description: "ISO date of request" }),
  requestedBy: z.string().openapi({ description: "Agent person ID" }),
  summary: z.string().openapi({ description: "Markdown summary of work" }),
  commitHash: z.string().optional().openapi({
    description: "Git commit hash",
  }),
  artifactUrls: z.array(z.string()).optional().openapi({
    description: "URLs to build artifacts or deployments",
  }),
  verdict: ApprovalVerdictSchema.optional().openapi({
    description: "Reviewer verdict",
  }),
}).openapi("ApprovalRequest");

export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;

// ---------------------------------------------------------------------------
// Task — flat structure, no nested config bag
// ---------------------------------------------------------------------------

export const TaskSchema: z.ZodType<Task> = z.lazy(() =>
  z.object({
    id: z.string().openapi({ description: "Task ID" }),
    title: z.string().openapi({ description: "Task title" }),
    completed: z.boolean().openapi({ description: "Whether task is done" }),
    completedAt: z.string().optional().openapi({
      description: "ISO date when completed",
    }),
    createdAt: z.string().optional().openapi({
      description: "ISO date of creation",
    }),
    updatedAt: z.string().optional().openapi({
      description: "ISO date of last update",
    }),
    revision: z.number().openapi({
      description: "Monotonic counter for optimistic locking",
    }),
    section: z.string().openapi({
      description: "Board section (Todo, In Progress, Done, etc.)",
    }),
    description: z.array(z.string()).optional().openapi({
      description: "Task description paragraphs (markdown)",
    }),
    children: z.array(TaskSchema).optional().openapi({
      description: "Subtasks",
    }),
    parentId: z.string().optional().openapi({
      description: "Parent task ID (if subtask)",
    }),
    tags: z.array(z.string()).optional().openapi({
      description: "Task labels/tags",
    }),
    due_date: z.string().optional().openapi({
      description: "Due date (YYYY-MM-DD)",
    }),
    assignee: z.string().optional().openapi({
      description: "Assigned person ID",
    }),
    priority: z.number().min(1).max(5).optional().openapi({
      description: "Priority 1 (highest) to 5 (lowest)",
    }),
    effort: z.number().optional().openapi({
      description: "Effort estimate (story points or hours)",
    }),
    blocked_by: z.array(z.string()).optional().openapi({
      description: "Task IDs this task is blocked by",
    }),
    milestone: z.string().optional().openapi({
      description: "Linked milestone name",
    }),
    planned_start: z.string().optional().openapi({
      description: "Planned start date (YYYY-MM-DD)",
    }),
    planned_end: z.string().optional().openapi({
      description: "Planned end date (YYYY-MM-DD)",
    }),
    time_entries: z.array(TimeEntrySchema).optional().openapi({
      description: "Time tracking entries",
    }),
    order: z.number().optional().openapi({
      description: "Sort order within section",
    }),
    attachments: z.array(z.string()).optional().openapi({
      description: "Attachment file paths",
    }),
    project: z.string().optional().openapi({
      description: "Project name scope",
    }),
    githubIssue: z.number().optional().openapi({
      description: "Linked GitHub issue number",
    }),
    githubRepo: z.string().optional().openapi({
      description: "GitHub repository (owner/repo)",
    }),
    githubPR: z.number().optional().openapi({
      description: "Linked GitHub PR number",
    }),
    comments: z.array(TaskCommentSchema).optional().openapi({
      description: "Task comment thread",
    }),
    claimedBy: z.string().optional().openapi({
      description: "Person ID of agent actively working on this task",
    }),
    claimedAt: z.string().optional().openapi({
      description: "ISO timestamp when claimed",
    }),
    approvalRequest: ApprovalRequestSchema.optional().openapi({
      description: "Pending approval request",
    }),
    files: z.array(z.string()).optional().openapi({
      description: "Relevant source file paths (relative to codebase root)",
    }),
  }).openapi("Task")
);

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  revision: number;
  section: string;
  description?: string[];
  children?: Task[];
  parentId?: string;
  tags?: string[];
  due_date?: string;
  assignee?: string;
  priority?: number;
  effort?: number;
  blocked_by?: string[];
  milestone?: string;
  planned_start?: string;
  planned_end?: string;
  time_entries?: TimeEntry[];
  order?: number;
  attachments?: string[];
  project?: string;
  githubIssue?: number;
  githubRepo?: string;
  githubPR?: number;
  comments?: TaskComment[];
  claimedBy?: string;
  claimedAt?: string;
  approvalRequest?: ApprovalRequest;
  files?: string[];
};

// ---------------------------------------------------------------------------
// Create — input for POST
// ---------------------------------------------------------------------------

export const CreateTaskSchema = z.object({
  title: z.string().min(1).openapi({
    description: "Task title",
    example: "Implement user authentication",
  }),
  section: z.string().default("Todo").openapi({
    description: "Board section to place the task in",
    example: "Todo",
  }),
  description: z.array(z.string()).optional().openapi({
    description: "Task description paragraphs (markdown)",
  }),
  parentId: z.string().optional().openapi({
    description: "Parent task ID (if subtask)",
  }),
  tags: z.array(z.string()).optional().openapi({
    description: "Task labels/tags",
  }),
  due_date: z.string().optional().openapi({
    description: "Due date (YYYY-MM-DD)",
  }),
  assignee: z.string().optional().openapi({
    description: "Assigned person ID",
  }),
  priority: z.number().min(1).max(5).optional().openapi({
    description: "Priority 1 (highest) to 5 (lowest)",
  }),
  effort: z.number().optional().openapi({
    description: "Effort estimate (story points or hours)",
  }),
  blocked_by: z.array(z.string()).optional().openapi({
    description: "Task IDs this task is blocked by",
  }),
  milestone: z.string().optional().openapi({
    description: "Linked milestone name",
  }),
  planned_start: z.string().optional().openapi({
    description: "Planned start date (YYYY-MM-DD)",
  }),
  planned_end: z.string().optional().openapi({
    description: "Planned end date (YYYY-MM-DD)",
  }),
  order: z.number().optional().openapi({
    description: "Sort order within section",
  }),
  project: z.string().optional().openapi({
    description: "Project name scope",
  }),
  githubIssue: z.number().optional().openapi({
    description: "Linked GitHub issue number",
  }),
  githubRepo: z.string().optional().openapi({
    description: "GitHub repository (owner/repo)",
  }),
  githubPR: z.number().optional().openapi({
    description: "Linked GitHub PR number",
  }),
  files: z.array(z.string()).optional().openapi({
    description: "Relevant source file paths (relative to codebase root)",
  }),
}).openapi("CreateTask");

export type CreateTask = z.infer<typeof CreateTaskSchema>;

// ---------------------------------------------------------------------------
// Update — derived from Create, all fields optional; extends with update-only fields
// ---------------------------------------------------------------------------

export const UpdateTaskSchema = CreateTaskSchema
  .partial()
  .extend({
    completed: z.boolean().optional().openapi({
      description: "Whether task is done",
    }),
    claimedBy: z.string().nullable().optional().openapi({
      description:
        "Person ID of agent working on this task. Set to null to clear.",
    }),
    claimedAt: z.string().nullable().optional().openapi({
      description: "ISO timestamp when claimed. Set to null to clear.",
    }),
    comments: z.array(TaskCommentSchema).nullable().optional().openapi({
      description: "Task comment thread. Set to null to clear.",
    }),
    attachments: z.array(z.string()).nullable().optional().openapi({
      description: "Attachment file paths. Set to null to clear.",
    }),
    time_entries: z.array(TimeEntrySchema).nullable().optional().openapi({
      description: "Time tracking entries. Set to null to clear.",
    }),
    approvalRequest: ApprovalRequestSchema.nullable().optional().openapi({
      description: "Pending approval request. Set to null to clear.",
    }),
  })
  .openapi("UpdateTask");

export type UpdateTask = z.infer<typeof UpdateTaskSchema>;

// ---------------------------------------------------------------------------
// List filter — query options for listing tasks
// ---------------------------------------------------------------------------

export const ListTaskOptionsSchema = z.object({
  section: z.string().optional().openapi({
    description: "Filter by board section",
  }),
  project: z.string().optional().openapi({
    description: "Filter by project name (case-insensitive)",
  }),
  milestone: z.string().optional().openapi({
    description: "Filter by milestone name (case-insensitive)",
  }),
  assignee: z.string().optional().openapi({
    description: "Filter by assignee person ID",
  }),
  tags: z.array(z.string()).optional().openapi({
    description: "Filter by tags (all must match)",
  }),
  ready: z.boolean().optional().openapi({
    description: "Only return tasks with all blockers resolved",
  }),
}).openapi("ListTaskOptions");

export type ListTaskOptions = z.infer<typeof ListTaskOptionsSchema>;

// ---------------------------------------------------------------------------
// Batch update — input for parallel fan-out updates
// ---------------------------------------------------------------------------

export const BatchUpdateItemSchema = z.object({
  id: z.string().openapi({ description: "Task ID" }),
  updates: UpdateTaskSchema.openapi({ description: "Fields to update" }),
  comment: z.string().optional().openapi({
    description: "Optional comment to add after update",
  }),
}).openapi("BatchUpdateItem");

export type BatchUpdateItem = z.infer<typeof BatchUpdateItemSchema>;

export const BatchUpdateResultSchema = z.object({
  succeeded: z.array(z.object({ id: z.string(), task: TaskSchema })).openapi({
    description: "Successfully updated tasks",
  }),
  failed: z.array(z.object({
    id: z.string(),
    error: z.string(),
  })).openapi({ description: "Failed updates with error messages" }),
}).openapi("BatchUpdateResult");

export type BatchUpdateResult = z.infer<typeof BatchUpdateResultSchema>;

// ---------------------------------------------------------------------------
// Route param schemas
// ---------------------------------------------------------------------------

export const IdAndCommentIdParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
  commentId: z.string().openapi({ param: { name: "commentId", in: "path" } }),
});

// ---------------------------------------------------------------------------
// Workflow input schemas
// ---------------------------------------------------------------------------

export const ClaimTaskInputSchema = z.object({
  assignee: z.string().openapi({ description: "Agent person ID" }),
  expectedSection: z.string().optional().openapi({
    description: "Expected current section (default: Todo)",
  }),
}).openapi("ClaimTaskInput");

export const MoveTaskInputSchema = z.object({
  section: z.string().openapi({ description: "Target section name" }),
}).openapi("MoveTaskInput");

export const SweepStaleClaimsInputSchema = z.object({
  ttlMinutes: z.number().optional().openapi({
    description: "Claim TTL in minutes (default: 60)",
  }),
}).openapi("SweepStaleClaimsInput");

export const SweepStaleClaimsResultSchema = z.object({
  swept: z.array(z.string()).openapi({
    description: "IDs of tasks whose claims were released",
  }),
}).openapi("SweepStaleClaimsResult");

export const GetNextTaskQuerySchema = z.object({
  agentId: z.string().openapi({ description: "Agent person ID" }),
  skills: z.string().optional().openapi({
    description: "Comma-separated skill list for tag matching",
  }),
}).openapi("GetNextTaskQuery");

// ---------------------------------------------------------------------------
// Comment input schemas
// ---------------------------------------------------------------------------

export const AddCommentInputSchema = z.object({
  body: z.string().min(1).openapi({ description: "Comment text" }),
  author: z.string().optional().openapi({ description: "Author name" }),
  metadata: z.record(z.string(), z.unknown()).optional().openapi({
    description: "Structured metadata for machine-readable progress",
  }),
}).openapi("AddCommentInput");

export const UpdateCommentInputSchema = z.object({
  body: z.string().min(1).openapi({ description: "Updated comment text" }),
}).openapi("UpdateCommentInput");

// ---------------------------------------------------------------------------
// Attachment input schema
// ---------------------------------------------------------------------------

export const AddAttachmentsInputSchema = z.object({
  paths: z.array(z.string()).min(1).openapi({
    description: "File paths to attach",
  }),
}).openapi("AddAttachmentsInput");

// ---------------------------------------------------------------------------
// Approval input schemas
// ---------------------------------------------------------------------------

export const RequestApprovalInputSchema = z.object({
  requestedBy: z.string().openapi({ description: "Agent person ID" }),
  summary: z.string().openapi({ description: "Summary of work done (markdown)" }),
  commitHash: z.string().optional().openapi({ description: "Git commit hash" }),
  artifactUrls: z.array(z.string()).optional().openapi({
    description: "Build artifact or deployment URLs",
  }),
}).openapi("RequestApprovalInput");

export const ApproveTaskInputSchema = z.object({
  decidedBy: z.string().openapi({ description: "Reviewer person ID" }),
  feedback: z.string().optional().openapi({ description: "Optional feedback" }),
}).openapi("ApproveTaskInput");

export const RejectTaskInputSchema = z.object({
  decidedBy: z.string().openapi({ description: "Reviewer person ID" }),
  feedback: z.string().optional().openapi({ description: "Optional feedback" }),
  rejectionType: z.enum(REJECTION_TYPES).optional().openapi({
    description: "Rejection category",
  }),
}).openapi("RejectTaskInput");
