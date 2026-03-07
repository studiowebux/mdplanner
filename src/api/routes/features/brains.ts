/**
 * Brain management API routes.
 * Feature-gated: only mounted when --brains-config is provided.
 * Bypasses DirectoryMarkdownParser — reads/writes filesystem directly.
 */

import { Hono } from "hono";
import type { AppVariables } from "../context.ts";
import { errorResponse, jsonResponse } from "../context.ts";
import {
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

/** Extended variables for brain routes. */
interface BrainVariables extends AppVariables {
  brainRegistry: BrainRegistry;
  claudeDir: string;
}

export const brainsRouter = new Hono<{ Variables: BrainVariables }>();

// --- Helper to extract registry from context ---

function getRegistry(
  c: { get: (key: "brainRegistry") => BrainRegistry },
): BrainRegistry {
  return c.get("brainRegistry");
}

function getClaudeDir(c: { get: (key: "claudeDir") => string }): string {
  return c.get("claudeDir");
}

// --- Brain CRUD ---

brainsRouter.get("/", async (c) => {
  const reg = getRegistry(c);
  const claudeDir = getClaudeDir(c);
  const brains = await reg.listWithInfo(claudeDir);
  return jsonResponse(brains);
});

brainsRouter.post("/", async (c) => {
  const reg = getRegistry(c);
  const body = await c.req.json();
  const parsed = RegisterBrainSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Invalid input: " + parsed.error.message, 400);
  }
  try {
    await reg.register(parsed.data);
    return jsonResponse(parsed.data, 201);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : String(e), 409);
  }
});

brainsRouter.delete("/:name", async (c) => {
  const reg = getRegistry(c);
  const name = c.req.param("name");
  try {
    await reg.remove(name);
    return jsonResponse({ deleted: name });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : String(e), 404);
  }
});

brainsRouter.patch("/:name", async (c) => {
  const reg = getRegistry(c);
  const name = c.req.param("name");
  const body = await c.req.json();
  const parsed = UpdateBrainSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Invalid input: " + parsed.error.message, 400);
  }
  try {
    const updated = await reg.update(name, parsed.data);
    return jsonResponse(updated);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : String(e), 404);
  }
});

// --- File browser ---

brainsRouter.get("/:name/files", async (c) => {
  const reg = getRegistry(c);
  const name = c.req.param("name");
  const brain = reg.get(name);
  if (!brain) return errorResponse("brain not found", 404);

  const rel = c.req.query("path") ?? "";
  try {
    const files = await listFiles(brain.path, rel);
    return jsonResponse(files);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : String(e), 400);
  }
});

brainsRouter.get("/:name/file", async (c) => {
  const reg = getRegistry(c);
  const name = c.req.param("name");
  const brain = reg.get(name);
  if (!brain) return errorResponse("brain not found", 404);

  const rel = c.req.query("path") ?? "";
  try {
    const content = await readFile(brain.path, rel);
    return new Response(content, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return errorResponse("file not found", 404);
    }
    return errorResponse(e instanceof Error ? e.message : String(e), 400);
  }
});

// --- Sessions ---

brainsRouter.get("/:name/sessions", async (c) => {
  const reg = getRegistry(c);
  const claudeDir = getClaudeDir(c);
  const name = c.req.param("name");
  const brain = reg.get(name);
  if (!brain) return errorResponse("brain not found", 404);

  const sessions = await listSessions(claudeDir, brain.path);
  return jsonResponse(sessions);
});

brainsRouter.get("/:name/sessions/:id", async (c) => {
  const reg = getRegistry(c);
  const claudeDir = getClaudeDir(c);
  const name = c.req.param("name");
  const id = c.req.param("id");
  const brain = reg.get(name);
  if (!brain) return errorResponse("brain not found", 404);

  try {
    const detail = await getSession(claudeDir, brain.path, id);
    return jsonResponse(detail);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return errorResponse("session not found", 404);
    }
    return errorResponse(e instanceof Error ? e.message : String(e), 500);
  }
});

// --- Memory ---

brainsRouter.get("/:name/memory", async (c) => {
  const reg = getRegistry(c);
  const claudeDir = getClaudeDir(c);
  const name = c.req.param("name");
  const brain = reg.get(name);
  if (!brain) return errorResponse("brain not found", 404);

  const slug = pathToSlug(brain.path);
  const path = join(claudeDir, "projects", slug, "memory", "MEMORY.md");

  try {
    const content = await Deno.readTextFile(path);
    return jsonResponse({ content, exists: true });
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return jsonResponse({ content: "", exists: false });
    }
    return errorResponse("cannot read memory file", 500);
  }
});

brainsRouter.put("/:name/memory", async (c) => {
  const reg = getRegistry(c);
  const claudeDir = getClaudeDir(c);
  const name = c.req.param("name");
  const brain = reg.get(name);
  if (!brain) return errorResponse("brain not found", 404);

  const body = await c.req.json();
  if (typeof body.content !== "string") {
    return errorResponse("content is required", 400);
  }

  const slug = pathToSlug(brain.path);
  const dir = join(claudeDir, "projects", slug, "memory");
  const path = join(dir, "MEMORY.md");

  try {
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(path, body.content);
    return jsonResponse({ saved: path });
  } catch {
    return errorResponse("cannot write memory file", 500);
  }
});

// --- Setup ---

brainsRouter.post("/:name/setup", async (c) => {
  const reg = getRegistry(c);
  const name = c.req.param("name");
  const body = await c.req.json();
  const parsed = SetupRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Invalid input: " + parsed.error.message, 400);
  }

  try {
    const brainDir = await scaffoldBrain(reg, {
      name,
      ...parsed.data,
    });
    return jsonResponse(
      { brainDir, message: "brain scaffolded successfully" },
      201,
    );
  } catch (e) {
    const status = e instanceof Error && e.message.includes("already exists")
      ? 409
      : 500;
    return errorResponse(e instanceof Error ? e.message : String(e), status);
  }
});

brainsRouter.post("/:name/rebuild-rules", async (c) => {
  const reg = getRegistry(c);
  const name = c.req.param("name");
  const brain = reg.get(name);
  if (!brain) return errorResponse("brain not found", 404);

  const protocolRules = reg.protocolRulesDir();
  try {
    await Deno.stat(protocolRules);
  } catch {
    return errorResponse("protocol rules not found", 500);
  }

  const result = await rebuildRules(
    brain.path,
    protocolRules,
    brain.stacks,
    brain.practices,
    brain.workflows,
  );

  return jsonResponse({
    brain: name,
    ...result,
    stacks: brain.stacks,
    message: "rules rebuilt successfully",
  });
});

// --- Rule names (available stacks/practices/workflows) ---

brainsRouter.get("/stacks", async (c) => {
  const reg = getRegistry(c);
  const names = await reg.listRuleNames("stack");
  return jsonResponse(names);
});

brainsRouter.get("/practices", async (c) => {
  const reg = getRegistry(c);
  const names = await reg.listRuleNames("practices");
  return jsonResponse(names);
});

brainsRouter.get("/workflows", async (c) => {
  const reg = getRegistry(c);
  const names = await reg.listRuleNames("workflow");
  return jsonResponse(names);
});

// --- Sync ---

brainsRouter.get("/sync/diff", async (c) => {
  const reg = getRegistry(c);
  const fromName = c.req.query("from") ?? "";
  const toName = c.req.query("to") ?? "";
  const dirsParam = c.req.query("dirs") ?? "";

  if (!fromName || !toName) {
    return errorResponse("from and to are required", 400);
  }

  const fromBrain = reg.get(fromName);
  if (!fromBrain) return errorResponse("from brain not found", 404);
  const toBrain = reg.get(toName);
  if (!toBrain) return errorResponse("to brain not found", 404);

  const dirs = dirsParam ? dirsParam.split(",") : undefined;
  const entries = await computeDiff(fromBrain.path, toBrain.path, dirs, {
    stacks: toBrain.stacks,
    practices: toBrain.practices,
    workflows: toBrain.workflows,
  });

  return jsonResponse(entries);
});

brainsRouter.post("/sync/apply", async (c) => {
  const reg = getRegistry(c);
  const body = await c.req.json();
  const parsed = SyncApplySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Invalid input: " + parsed.error.message, 400);
  }

  const fromBrain = reg.get(parsed.data.from);
  if (!fromBrain) return errorResponse("from brain not found", 404);
  const toBrain = reg.get(parsed.data.to);
  if (!toBrain) return errorResponse("to brain not found", 404);

  const result = await applySync(
    fromBrain.path,
    toBrain.path,
    parsed.data.files,
  );
  return jsonResponse(result);
});

// --- Directory picker ---

brainsRouter.get("/dirs", async (c) => {
  const parent = c.req.query("parent") ?? "";
  if (!parent) return errorResponse("parent is required", 400);

  try {
    const dirs = await listDirs(parent);
    return jsonResponse(dirs);
  } catch {
    return errorResponse("cannot read directory", 404);
  }
});
