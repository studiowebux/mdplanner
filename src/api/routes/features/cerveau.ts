/**
 * Cerveau viewer API routes — read-only access to ~/.cerveau structure.
 * Feature-gated: only mounted when --cerveau-dir is provided.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { AppVariables } from "../context.ts";
import type { CerveauReader } from "../../../lib/cerveau/reader.ts";

const ErrorSchema = z.object({ error: z.string() });

const BrainSchema = z.object({
  name: z.string(),
  path: z.string(),
  codebase: z.string(),
  isCore: z.boolean(),
  stacks: z.array(z.string()),
  practices: z.array(z.string()),
  workflows: z.array(z.string()),
  agents: z.array(z.string()),
}).openapi("CerveauBrain");

const PackageSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: z.string(),
  files: z.array(z.string()),
  tags: z.array(z.string()),
}).openapi("CerveauPackage");

const RegistrySchema = z.object({
  version: z.string(),
  packages: z.array(PackageSchema),
}).openapi("CerveauRegistry");

const ManifestSchema = z.object({
  version: z.string(),
  protocol: z.string(),
  min_claude_version: z.string().optional(),
}).openapi("CerveauManifest");

const FileEntrySchema = z.object({
  name: z.string(),
  path: z.string(),
  isDir: z.boolean(),
  isSymlink: z.boolean(),
  size: z.number().optional(),
}).openapi("CerveauFileEntry");

const ProtocolOverviewSchema = z.object({
  stacks: z.array(z.string()),
  practices: z.array(z.string()),
  workflows: z.array(z.string()),
  hooks: z.array(z.string()),
  skills: z.array(z.string()),
  agents: z.array(z.string()),
}).openapi("CerveauProtocolOverview");

interface CerveauVariables extends AppVariables {
  cerveauReader: CerveauReader;
}

export const cerveauRouter = new OpenAPIHono<{ Variables: CerveauVariables }>();

function getReader(
  c: { get: (key: "cerveauReader") => CerveauReader },
): CerveauReader {
  return c.get("cerveauReader");
}

// --- Route definitions ---

const manifestRoute = createRoute({
  method: "get",
  path: "/manifest",
  tags: ["Cerveau"],
  summary: "Get cerveau manifest",
  operationId: "getCerveauManifest",
  responses: {
    200: {
      content: { "application/json": { schema: ManifestSchema } },
      description: "Cerveau manifest",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Manifest not found",
    },
  },
});

const listBrainsRoute = createRoute({
  method: "get",
  path: "/brains",
  tags: ["Cerveau"],
  summary: "List all brains",
  operationId: "listCerveauBrains",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(BrainSchema) } },
      description: "List of brains",
    },
  },
});

const registryRoute = createRoute({
  method: "get",
  path: "/registry",
  tags: ["Cerveau"],
  summary: "Get package registry",
  operationId: "getCerveauRegistry",
  responses: {
    200: {
      content: { "application/json": { schema: RegistrySchema } },
      description: "Package registry",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Registry not found",
    },
  },
});

const protocolRoute = createRoute({
  method: "get",
  path: "/protocol",
  tags: ["Cerveau"],
  summary: "Get protocol overview",
  operationId: "getCerveauProtocol",
  responses: {
    200: {
      content: { "application/json": { schema: ProtocolOverviewSchema } },
      description: "Protocol overview",
    },
  },
});

const listFilesRoute = createRoute({
  method: "get",
  path: "/files",
  tags: ["Cerveau"],
  summary: "List files in cerveau directory",
  operationId: "listCerveauFiles",
  request: {
    query: z.object({
      path: z.string().optional().openapi({
        description: "Relative path within cerveau directory",
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
      description: "Invalid path",
    },
  },
});

const readFileRoute = createRoute({
  method: "get",
  path: "/file",
  tags: ["Cerveau"],
  summary: "Read a file from cerveau directory",
  operationId: "readCerveauFile",
  request: {
    query: z.object({
      path: z.string().openapi({
        description: "Relative path to file",
      }),
    }),
  },
  responses: {
    200: { description: "File content as plain text" },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid path",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "File not found",
    },
  },
});

const brainMemoryRoute = createRoute({
  method: "get",
  path: "/brains/{name}/memory",
  tags: ["Cerveau"],
  summary: "Get brain memory from local-dev.md",
  operationId: "getCerveauBrainMemory",
  request: {
    params: z.object({
      name: z.string().openapi({ param: { name: "name", in: "path" } }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ content: z.string() }),
        },
      },
      description: "Brain memory content",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Brain not found",
    },
  },
});

// --- Handlers ---

cerveauRouter.openapi(manifestRoute, async (c) => {
  const reader = getReader(c);
  const manifest = await reader.manifest();
  if (!manifest) return c.json({ error: "manifest not found" }, 404);
  return c.json(manifest, 200);
});

cerveauRouter.openapi(listBrainsRoute, async (c) => {
  const reader = getReader(c);
  const brains = await reader.brains();
  return c.json(brains, 200);
});

cerveauRouter.openapi(registryRoute, async (c) => {
  const reader = getReader(c);
  const registry = await reader.registry();
  if (!registry) return c.json({ error: "registry not found" }, 404);
  return c.json(registry, 200);
});

cerveauRouter.openapi(protocolRoute, async (c) => {
  const reader = getReader(c);
  const [stacks, practices, workflows, hooks, skills, agents] = await Promise
    .all([
      reader.protocolRuleNames("stack"),
      reader.protocolRuleNames("practices"),
      reader.protocolRuleNames("workflow"),
      reader.protocolHooks(),
      reader.protocolSkills(),
      reader.protocolAgents(),
    ]);
  return c.json({ stacks, practices, workflows, hooks, skills, agents }, 200);
});

cerveauRouter.openapi(listFilesRoute, async (c) => {
  const reader = getReader(c);
  const { path: relPath } = c.req.valid("query");
  try {
    const files = await reader.listFiles(relPath ?? "");
    return c.json(files, 200);
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : String(e) },
      400,
    );
  }
});

cerveauRouter.openapi(readFileRoute, async (c) => {
  const reader = getReader(c);
  const { path: relPath } = c.req.valid("query");
  if (!relPath) return c.json({ error: "path is required" }, 400);
  try {
    const content = await reader.readFile(relPath);
    return new Response(content, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return c.json({ error: "file not found" }, 404);
    }
    return c.json(
      { error: e instanceof Error ? e.message : String(e) },
      400,
    );
  }
});

cerveauRouter.openapi(brainMemoryRoute, async (c) => {
  const reader = getReader(c);
  const { name } = c.req.valid("param");
  const brains = await reader.brains();
  const brain = brains.find((b) => b.name === name);
  if (!brain) return c.json({ error: "brain not found" }, 404);
  const content = await reader.brainMemory(brain.path);
  return c.json({ content }, 200);
});
