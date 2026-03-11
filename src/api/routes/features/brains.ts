/**
 * Brain management API routes.
 * Feature-gated: only mounted when --brains-config is provided.
 * Bypasses DirectoryMarkdownParser — reads/writes filesystem directly.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { AppVariables } from "../context.ts";
import {
  BrainInfoSchema,
  RegisterBrainSchema,
  SetupRequestSchema,
  SyncApplySchema,
  UpdateBrainSchema,
} from "../../../lib/brains/schemas.ts";
import type { BrainRegistry } from "../../../lib/brains/registry.ts";
import { listDirs, listFiles, readFile } from "../../../lib/brains/files.ts";
import { getSession, listSessions } from "../../../lib/brains/sessions.ts";
import { applySync, computeDiff } from "../../../lib/brains/sync.ts";
import { rebuildRules, scaffoldBrain } from "../../../lib/brains/setup.ts";
import { pathToSlug } from "../../../lib/brains/registry.ts";
import { join } from "@std/path";

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const SuccessSchema = z.object({ success: z.boolean() });

// File entry returned by the brain file browser.
const FileEntrySchema = z
  .object({
    name: z.string(),
    path: z.string(),
    isDir: z.boolean(),
    size: z.number().optional(),
  })
  .openapi("BrainFileEntry");

// Directory item returned by the directory picker.
const DirItemSchema = z
  .object({
    name: z.string(),
    path: z.string(),
  })
  .openapi("BrainDirItem");

// Session metadata returned by listSessions.
const SessionMetaSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    lastModified: z.string(),
    messageCount: z.number(),
    preview: z.string(),
  })
  .openapi("BrainSessionMeta");

// Tool use block within a session message.
const ToolUseSchema = z.object({
  id: z.string(),
  name: z.string(),
  input: z.string(),
});

// Tool result block within a session message.
const ToolResultSchema = z.object({
  toolUseId: z.string(),
  content: z.string(),
});

// Individual message within a session transcript.
const SessionMessageSchema = z.object({
  role: z.string(),
  text: z.string(),
  thinking: z.string(),
  toolUses: z.array(ToolUseSchema),
  toolResults: z.array(ToolResultSchema),
  timestamp: z.string(),
});

// Subagent session within a parent session.
const SubagentSessionSchema = z.object({
  id: z.string(),
  messages: z.array(SessionMessageSchema),
});

// Full session detail returned by getSession.
const SessionDetailSchema = z
  .object({
    messages: z.array(SessionMessageSchema),
    subagents: z.array(SubagentSessionSchema),
  })
  .openapi("BrainSessionDetail");

// Rebuild result — wraps rebuildRules() output with brain name and message.
// Uses z.unknown() because the exact shape evolves with brain config.
const RebuildResultSchema = z.unknown().openapi({});

// Sync diff entry — typed from DiffEntry in sync.ts.
const SyncDiffEntrySchema = z
  .object({
    relPath: z.string(),
    dir: z.string(),
    status: z.enum(["added", "modified", "identical", "removed", "skipped"]),
    sourceMod: z.string().optional(),
    targetMod: z.string().optional(),
    newer: z.string(),
  })
  .openapi("BrainSyncDiffEntry");

// Sync apply result — { applied: string[], failed: string[] }.
const SyncApplyResultSchema = z
  .object({
    applied: z.array(z.string()),
    failed: z.array(z.string()),
  })
  .openapi("BrainSyncApplyResult");

// Setup result — returns brainDir + message; keep open for future fields.
const SetupResultSchema = z
  .object({
    brainDir: z.string(),
    message: z.string(),
  })
  .openapi("BrainSetupResult");

/** Extended variables for brain routes. */
interface BrainVariables extends AppVariables {
  brainRegistry: BrainRegistry;
  claudeDir: string;
}

export const brainsRouter = new OpenAPIHono<{ Variables: BrainVariables }>();

// --- Helper to extract registry from context ---

function getRegistry(
  c: { get: (key: "brainRegistry") => BrainRegistry },
): BrainRegistry {
  return c.get("brainRegistry");
}

function getClaudeDir(c: { get: (key: "claudeDir") => string }): string {
  return c.get("claudeDir");
}

// --- Param schemas ---

const nameParam = z.object({
  name: z.string().openapi({ param: { name: "name", in: "path" } }),
});

const nameAndIdParam = z.object({
  name: z.string().openapi({ param: { name: "name", in: "path" } }),
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

// --- Route definitions ---

const listBrainsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Brains"],
  summary: "List all brains",
  operationId: "listBrains",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(BrainInfoSchema) } },
      description: "List of brains with info",
    },
  },
});

const registerBrainRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Brains"],
  summary: "Register a new brain",
  operationId: "registerBrain",
  request: {
    body: {
      content: { "application/json": { schema: RegisterBrainSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: BrainInfoSchema } },
      description: "Registered brain",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid input",
    },
    409: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Conflict",
    },
  },
});

const deleteBrainRoute = createRoute({
  method: "delete",
  path: "/{name}",
  tags: ["Brains"],
  summary: "Delete a brain",
  operationId: "deleteBrain",
  request: { params: nameParam },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ deleted: z.string() }),
        },
      },
      description: "Brain deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const updateBrainRoute = createRoute({
  method: "patch",
  path: "/{name}",
  tags: ["Brains"],
  summary: "Update a brain",
  operationId: "updateBrain",
  request: {
    params: nameParam,
    body: {
      content: { "application/json": { schema: UpdateBrainSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: BrainInfoSchema } },
      description: "Updated brain",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid input",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const listFilesRoute = createRoute({
  method: "get",
  path: "/{name}/files",
  tags: ["Brains"],
  summary: "List files in a brain directory",
  operationId: "listBrainFiles",
  request: {
    params: nameParam,
    query: z.object({
      path: z.string().optional().openapi({
        description: "Relative path within brain",
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(FileEntrySchema) } },
      description: "File listing",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Bad request",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Brain not found",
    },
  },
});

const readFileRoute = createRoute({
  method: "get",
  path: "/{name}/file",
  tags: ["Brains"],
  summary: "Read a file from a brain",
  operationId: "readBrainFile",
  request: {
    params: nameParam,
    query: z.object({
      path: z.string().optional().openapi({
        description: "Relative path to file",
      }),
    }),
  },
  responses: {
    200: {
      description: "File content as plain text",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Bad request",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const listSessionsRoute = createRoute({
  method: "get",
  path: "/{name}/sessions",
  tags: ["Brains"],
  summary: "List sessions for a brain",
  operationId: "listBrainSessions",
  request: { params: nameParam },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(SessionMetaSchema) },
      },
      description: "Session listing",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Brain not found",
    },
  },
});

const getSessionRoute = createRoute({
  method: "get",
  path: "/{name}/sessions/{id}",
  tags: ["Brains"],
  summary: "Get a session by ID",
  operationId: "getBrainSession",
  request: { params: nameAndIdParam },
  responses: {
    200: {
      content: { "application/json": { schema: SessionDetailSchema } },
      description: "Session detail",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Server error",
    },
  },
});

const getMemoryRoute = createRoute({
  method: "get",
  path: "/{name}/memory",
  tags: ["Brains"],
  summary: "Get memory file for a brain",
  operationId: "getBrainMemory",
  request: { params: nameParam },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ content: z.string(), exists: z.boolean() }),
        },
      },
      description: "Memory content",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Brain not found",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Server error",
    },
  },
});

const updateMemoryRoute = createRoute({
  method: "put",
  path: "/{name}/memory",
  tags: ["Brains"],
  summary: "Update memory file for a brain",
  operationId: "updateBrainMemory",
  request: {
    params: nameParam,
    body: {
      content: {
        "application/json": {
          schema: z.object({
            content: z.string().openapi({ description: "Memory file content" }),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ saved: z.string() }),
        },
      },
      description: "Memory saved",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid input",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Brain not found",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Server error",
    },
  },
});

const setupBrainRoute = createRoute({
  method: "post",
  path: "/{name}/setup",
  tags: ["Brains"],
  summary: "Scaffold a brain",
  operationId: "setupBrain",
  request: {
    params: nameParam,
    body: {
      content: { "application/json": { schema: SetupRequestSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SetupResultSchema } },
      description: "Brain scaffolded",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid input",
    },
    409: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Already exists",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Server error",
    },
  },
});

const rebuildRulesRoute = createRoute({
  method: "post",
  path: "/{name}/rebuild-rules",
  tags: ["Brains"],
  summary: "Rebuild rules for a brain",
  operationId: "rebuildBrainRules",
  request: { params: nameParam },
  responses: {
    200: {
      // Shape evolves with brain config — z.unknown() avoids handler mismatch.
      content: { "application/json": { schema: z.unknown() } },
      description: "Rules rebuilt",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Brain not found",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Protocol rules not found",
    },
  },
});

const listStacksRoute = createRoute({
  method: "get",
  path: "/stacks",
  tags: ["Brains"],
  summary: "List available stack rule names",
  operationId: "listBrainStacks",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.string()) } },
      description: "Stack rule names",
    },
  },
});

const listPracticesRoute = createRoute({
  method: "get",
  path: "/practices",
  tags: ["Brains"],
  summary: "List available practice rule names",
  operationId: "listBrainPractices",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.string()) } },
      description: "Practice rule names",
    },
  },
});

const listWorkflowsRoute = createRoute({
  method: "get",
  path: "/workflows",
  tags: ["Brains"],
  summary: "List available workflow rule names",
  operationId: "listBrainWorkflows",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.string()) } },
      description: "Workflow rule names",
    },
  },
});

const syncDiffRoute = createRoute({
  method: "get",
  path: "/sync/diff",
  tags: ["Brains"],
  summary: "Compute diff between two brains",
  operationId: "getBrainSyncDiff",
  request: {
    query: z.object({
      from: z.string().optional().openapi({
        description: "Source brain name",
      }),
      to: z.string().optional().openapi({
        description: "Target brain name",
      }),
      dirs: z.string().optional().openapi({
        description: "Comma-separated directories to compare",
      }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(SyncDiffEntrySchema) },
      },
      description: "Diff entries",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Missing parameters",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Brain not found",
    },
  },
});

const syncApplyRoute = createRoute({
  method: "post",
  path: "/sync/apply",
  tags: ["Brains"],
  summary: "Apply sync changes between brains",
  operationId: "applyBrainSync",
  request: {
    body: {
      content: { "application/json": { schema: SyncApplySchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SyncApplyResultSchema } },
      description: "Sync result",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid input",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Brain not found",
    },
  },
});

const listDirsRoute = createRoute({
  method: "get",
  path: "/dirs",
  tags: ["Brains"],
  summary: "List directories for directory picker",
  operationId: "listBrainDirs",
  request: {
    query: z.object({
      parent: z.string().optional().openapi({
        description: "Parent directory path",
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(DirItemSchema) } },
      description: "Directory listing",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Missing parent",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Cannot read directory",
    },
  },
});

// --- Handlers ---

// --- Brain CRUD ---

brainsRouter.openapi(listBrainsRoute, async (c) => {
  const reg = getRegistry(c);
  const claudeDir = getClaudeDir(c);
  const brains = await reg.listWithInfo(claudeDir);
  return c.json(brains, 200);
});

brainsRouter.openapi(registerBrainRoute, async (c) => {
  const reg = getRegistry(c);
  const body = await c.req.valid("json");
  const parsed = RegisterBrainSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input: " + parsed.error.message }, 400);
  }
  try {
    await reg.register(parsed.data);
    return c.json(parsed.data, 201);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 409);
  }
});

brainsRouter.openapi(deleteBrainRoute, async (c) => {
  const reg = getRegistry(c);
  const { name } = c.req.valid("param");
  try {
    await reg.remove(name);
    return c.json({ deleted: name }, 200);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 404);
  }
});

brainsRouter.openapi(updateBrainRoute, async (c) => {
  const reg = getRegistry(c);
  const { name } = c.req.valid("param");
  const body = await c.req.valid("json");
  const parsed = UpdateBrainSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input: " + parsed.error.message }, 400);
  }
  try {
    const updated = await reg.update(name, parsed.data);
    return c.json(updated, 200);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 404);
  }
});

// --- File browser ---

brainsRouter.openapi(listFilesRoute, async (c) => {
  const reg = getRegistry(c);
  const { name } = c.req.valid("param");
  const brain = reg.get(name);
  if (!brain) return c.json({ error: "brain not found" }, 404);

  const { path: rel } = c.req.valid("query");
  try {
    const files = await listFiles(brain.path, rel ?? "");
    return c.json(files, 200);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 400);
  }
});

brainsRouter.openapi(readFileRoute, async (c) => {
  const reg = getRegistry(c);
  const { name } = c.req.valid("param");
  const brain = reg.get(name);
  if (!brain) return c.json({ error: "brain not found" }, 404);

  const { path: rel } = c.req.valid("query");
  try {
    const content = await readFile(brain.path, rel ?? "");
    return new Response(content, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return c.json({ error: "file not found" }, 404);
    }
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 400);
  }
});

// --- Sessions ---

brainsRouter.openapi(listSessionsRoute, async (c) => {
  const reg = getRegistry(c);
  const claudeDir = getClaudeDir(c);
  const { name } = c.req.valid("param");
  const brain = reg.get(name);
  if (!brain) return c.json({ error: "brain not found" }, 404);

  const sessions = await listSessions(claudeDir, brain.path);
  return c.json(sessions, 200);
});

brainsRouter.openapi(getSessionRoute, async (c) => {
  const reg = getRegistry(c);
  const claudeDir = getClaudeDir(c);
  const { name, id } = c.req.valid("param");
  const brain = reg.get(name);
  if (!brain) return c.json({ error: "brain not found" }, 404);

  try {
    const detail = await getSession(claudeDir, brain.path, id);
    return c.json(detail, 200);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return c.json({ error: "session not found" }, 404);
    }
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

// --- Memory ---

brainsRouter.openapi(getMemoryRoute, async (c) => {
  const reg = getRegistry(c);
  const claudeDir = getClaudeDir(c);
  const { name } = c.req.valid("param");
  const brain = reg.get(name);
  if (!brain) return c.json({ error: "brain not found" }, 404);

  const slug = pathToSlug(brain.path);
  const path = join(claudeDir, "projects", slug, "memory", "MEMORY.md");

  try {
    const content = await Deno.readTextFile(path);
    return c.json({ content, exists: true }, 200);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return c.json({ content: "", exists: false }, 200);
    }
    return c.json({ error: "cannot read memory file" }, 500);
  }
});

brainsRouter.openapi(updateMemoryRoute, async (c) => {
  const reg = getRegistry(c);
  const claudeDir = getClaudeDir(c);
  const { name } = c.req.valid("param");
  const brain = reg.get(name);
  if (!brain) return c.json({ error: "brain not found" }, 404);

  const body = await c.req.valid("json");
  if (typeof body.content !== "string") {
    return c.json({ error: "content is required" }, 400);
  }

  const slug = pathToSlug(brain.path);
  const dir = join(claudeDir, "projects", slug, "memory");
  const path = join(dir, "MEMORY.md");

  try {
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(path, body.content);
    return c.json({ saved: path }, 200);
  } catch {
    return c.json({ error: "cannot write memory file" }, 500);
  }
});

// --- Setup ---

brainsRouter.openapi(setupBrainRoute, async (c) => {
  const reg = getRegistry(c);
  const { name } = c.req.valid("param");
  const body = await c.req.valid("json");
  const parsed = SetupRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input: " + parsed.error.message }, 400);
  }

  try {
    const brainDir = await scaffoldBrain(reg, {
      name,
      ...parsed.data,
    });
    return c.json(
      { brainDir, message: "brain scaffolded successfully" },
      201,
    );
  } catch (e) {
    const status = e instanceof Error && e.message.includes("already exists")
      ? 409
      : 500;
    return c.json(
      { error: e instanceof Error ? e.message : String(e) },
      status,
    );
  }
});

brainsRouter.openapi(rebuildRulesRoute, async (c) => {
  const reg = getRegistry(c);
  const { name } = c.req.valid("param");
  const brain = reg.get(name);
  if (!brain) return c.json({ error: "brain not found" }, 404);

  const protocolRules = reg.protocolRulesDir();
  try {
    await Deno.stat(protocolRules);
  } catch {
    return c.json({ error: "protocol rules not found" }, 500);
  }

  const result = await rebuildRules(
    brain.path,
    protocolRules,
    brain.stacks,
    brain.practices,
    brain.workflows,
  );

  return c.json({
    brain: name,
    ...result,
    stacks: brain.stacks,
    message: "rules rebuilt successfully",
  }, 200);
});

// --- Rule names (available stacks/practices/workflows) ---

brainsRouter.openapi(listStacksRoute, async (c) => {
  const reg = getRegistry(c);
  const names = await reg.listRuleNames("stack");
  return c.json(names, 200);
});

brainsRouter.openapi(listPracticesRoute, async (c) => {
  const reg = getRegistry(c);
  const names = await reg.listRuleNames("practices");
  return c.json(names, 200);
});

brainsRouter.openapi(listWorkflowsRoute, async (c) => {
  const reg = getRegistry(c);
  const names = await reg.listRuleNames("workflow");
  return c.json(names, 200);
});

// --- Sync ---

brainsRouter.openapi(syncDiffRoute, async (c) => {
  const reg = getRegistry(c);
  const { from: fromName, to: toName, dirs: dirsParam } = c.req.valid("query");

  if (!fromName || !toName) {
    return c.json({ error: "from and to are required" }, 400);
  }

  const fromBrain = reg.get(fromName);
  if (!fromBrain) return c.json({ error: "from brain not found" }, 404);
  const toBrain = reg.get(toName);
  if (!toBrain) return c.json({ error: "to brain not found" }, 404);

  const dirs = dirsParam ? dirsParam.split(",") : undefined;
  const entries = await computeDiff(fromBrain.path, toBrain.path, dirs, {
    stacks: toBrain.stacks,
    practices: toBrain.practices,
    workflows: toBrain.workflows,
  });

  return c.json(entries, 200);
});

brainsRouter.openapi(syncApplyRoute, async (c) => {
  const reg = getRegistry(c);
  const body = await c.req.valid("json");
  const parsed = SyncApplySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input: " + parsed.error.message }, 400);
  }

  const fromBrain = reg.get(parsed.data.from);
  if (!fromBrain) return c.json({ error: "from brain not found" }, 404);
  const toBrain = reg.get(parsed.data.to);
  if (!toBrain) return c.json({ error: "to brain not found" }, 404);

  const result = await applySync(
    fromBrain.path,
    toBrain.path,
    parsed.data.files,
  );
  return c.json(result, 200);
});

// --- Directory picker ---

brainsRouter.openapi(listDirsRoute, async (c) => {
  const { parent } = c.req.valid("query");
  if (!parent) return c.json({ error: "parent is required" }, 400);

  try {
    const dirs = await listDirs(parent);
    return c.json(dirs, 200);
  } catch {
    return c.json({ error: "cannot read directory" }, 404);
  }
});
