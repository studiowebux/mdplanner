// Cerveau viewer API — read-only access to a configured Cerveau root
// (_configs_/brains.json + registry.json, _packages_, version.txt). Consumed by
// api/mod.ts. The viewer is gated on ProjectConfig.cerveauDir: because that
// config is runtime-mutable (Settings toggle), the router is always mounted and
// each handler returns 404 when no cerveau dir is configured, rather than the v1
// static --cerveau-dir mount.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getCerveauService } from "../../../singletons/services.ts";
import {
  CerveauBrainSchema,
  CerveauFileEntrySchema,
  CerveauPackageSchema,
  CerveauProtocolOverviewSchema,
  CerveauRegistrySchema,
} from "../../../types/cerveau.types.ts";
import {
  errorContent,
  jsonContent,
  notFoundContent,
} from "../../../types/api.ts";

export const cerveauApiRouter = new OpenAPIHono();

const NOT_CONFIGURED = "Cerveau viewer is not configured";

/** 404 body matching ErrorSchema — cerveau 404s are not entity/id based. */
const err404 = (message: string) => ({
  error: "CERVEAU_NOT_FOUND",
  message,
  status: 404,
});

// GET /version
const versionRoute = createRoute({
  method: "get",
  path: "/version",
  tags: ["Cerveau"],
  summary: "Get the configured Cerveau version (version.txt)",
  operationId: "getCerveauVersion",
  responses: {
    200: jsonContent(z.object({ version: z.string() }), "Cerveau version"),
    404: notFoundContent,
  },
});

cerveauApiRouter.openapi(versionRoute, async (c) => {
  const svc = getCerveauService();
  if (!(await svc.isConfigured())) return c.json(err404(NOT_CONFIGURED), 404);
  const version = await svc.version();
  if (version === null) return c.json(err404("version.txt not found"), 404);
  return c.json({ version }, 200);
});

// GET /brains
const listBrainsRoute = createRoute({
  method: "get",
  path: "/brains",
  tags: ["Cerveau"],
  summary: "List all brains",
  operationId: "listCerveauBrains",
  responses: {
    200: jsonContent(z.array(CerveauBrainSchema), "List of brains"),
    404: notFoundContent,
  },
});

cerveauApiRouter.openapi(listBrainsRoute, async (c) => {
  const svc = getCerveauService();
  if (!(await svc.isConfigured())) return c.json(err404(NOT_CONFIGURED), 404);
  return c.json(await svc.brains(), 200);
});

// GET /brains/{name}/memory
const brainMemoryRoute = createRoute({
  method: "get",
  path: "/brains/{name}/memory",
  tags: ["Cerveau"],
  summary: "Get a brain's Brain Memory section from local-dev.md",
  operationId: "getCerveauBrainMemory",
  request: {
    params: z.object({
      name: z.string().openapi({ param: { name: "name", in: "path" } }),
    }),
  },
  responses: {
    200: jsonContent(z.object({ content: z.string() }), "Brain memory content"),
    404: notFoundContent,
  },
});

cerveauApiRouter.openapi(brainMemoryRoute, async (c) => {
  const svc = getCerveauService();
  if (!(await svc.isConfigured())) return c.json(err404(NOT_CONFIGURED), 404);
  const { name } = c.req.valid("param");
  const brain = (await svc.brains()).find((b) => b.name === name);
  if (!brain) return c.json(err404(`Brain '${name}' not found`), 404);
  return c.json({ content: await svc.brainMemory(brain.path) }, 200);
});

// GET /registry
const registryRoute = createRoute({
  method: "get",
  path: "/registry",
  tags: ["Cerveau"],
  summary: "Get the package registry",
  operationId: "getCerveauRegistry",
  responses: {
    200: jsonContent(CerveauRegistrySchema, "Package registry"),
    404: notFoundContent,
  },
});

cerveauApiRouter.openapi(registryRoute, async (c) => {
  const svc = getCerveauService();
  if (!(await svc.isConfigured())) return c.json(err404(NOT_CONFIGURED), 404);
  const registry = await svc.registry();
  if (!registry) return c.json(err404("registry.json not found"), 404);
  return c.json(registry, 200);
});

// GET /packages
const packagesRoute = createRoute({
  method: "get",
  path: "/packages",
  tags: ["Cerveau"],
  summary: "List all registered packages",
  operationId: "listCerveauPackages",
  responses: {
    200: jsonContent(z.array(CerveauPackageSchema), "Packages"),
    404: notFoundContent,
  },
});

cerveauApiRouter.openapi(packagesRoute, async (c) => {
  const svc = getCerveauService();
  if (!(await svc.isConfigured())) return c.json(err404(NOT_CONFIGURED), 404);
  return c.json(await svc.packages(), 200);
});

// GET /protocol
const protocolRoute = createRoute({
  method: "get",
  path: "/protocol",
  tags: ["Cerveau"],
  summary: "Protocol overview — package file names grouped by type",
  operationId: "getCerveauProtocol",
  responses: {
    200: jsonContent(CerveauProtocolOverviewSchema, "Protocol overview"),
    404: notFoundContent,
  },
});

cerveauApiRouter.openapi(protocolRoute, async (c) => {
  const svc = getCerveauService();
  if (!(await svc.isConfigured())) return c.json(err404(NOT_CONFIGURED), 404);
  return c.json(await svc.protocolOverview(), 200);
});

// GET /files?path=
const listFilesRoute = createRoute({
  method: "get",
  path: "/files",
  tags: ["Cerveau"],
  summary: "List files in a directory within the cerveau tree",
  operationId: "listCerveauFiles",
  request: {
    query: z.object({
      path: z.string().optional().openapi({
        description: "Relative path within the cerveau directory",
      }),
    }),
  },
  responses: {
    200: jsonContent(z.array(CerveauFileEntrySchema), "File listing"),
    400: errorContent("Invalid path"),
    404: notFoundContent,
  },
});

cerveauApiRouter.openapi(listFilesRoute, async (c) => {
  const svc = getCerveauService();
  if (!(await svc.isConfigured())) return c.json(err404(NOT_CONFIGURED), 404);
  const { path: relPath } = c.req.valid("query");
  try {
    return c.json(await svc.listFiles(relPath ?? ""), 200);
  } catch (e) {
    return c.json(err404(e instanceof Error ? e.message : String(e)), 404);
  }
});

// GET /tree?path=
const treeRoute = createRoute({
  method: "get",
  path: "/tree",
  tags: ["Cerveau"],
  summary: "Get the full recursive directory tree under a path",
  operationId: "getCerveauTree",
  request: {
    query: z.object({
      path: z.string().optional().openapi({
        description: "Relative path to the root of the tree",
      }),
    }),
  },
  responses: {
    200: jsonContent(z.array(CerveauFileEntrySchema), "Recursive file tree"),
    404: notFoundContent,
  },
});

cerveauApiRouter.openapi(treeRoute, async (c) => {
  const svc = getCerveauService();
  if (!(await svc.isConfigured())) return c.json(err404(NOT_CONFIGURED), 404);
  const { path: relPath } = c.req.valid("query");
  try {
    return c.json(await svc.listTree(relPath ?? ""), 200);
  } catch (e) {
    return c.json(err404(e instanceof Error ? e.message : String(e)), 404);
  }
});

// GET /file?path= — raw file content as plain text.
const readFileRoute = createRoute({
  method: "get",
  path: "/file",
  tags: ["Cerveau"],
  summary: "Read a file from the cerveau directory as plain text",
  operationId: "readCerveauFile",
  request: {
    query: z.object({
      path: z.string().openapi({ description: "Relative path to the file" }),
    }),
  },
  responses: {
    200: { description: "File content as plain text" },
    404: notFoundContent,
  },
});

cerveauApiRouter.openapi(readFileRoute, async (c) => {
  const svc = getCerveauService();
  if (!(await svc.isConfigured())) return c.json(err404(NOT_CONFIGURED), 404);
  const { path: relPath } = c.req.valid("query");
  try {
    const content = await svc.readFile(relPath);
    return new Response(content, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json(err404(msg), 404);
  }
});
