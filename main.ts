import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { dirname, extname, fromFileUrl, join } from "@std/path";
import { ProjectManager } from "./src/lib/project-manager.ts";
import { createApiRouter } from "./src/api/routes/index.ts";
import { createMcpHonoRouter } from "./src/mcp/http.ts";
import { initProject, printInitSuccess } from "./src/lib/init.ts";
import { createWebDavHandler } from "./src/lib/webdav/handler.ts";
import { GITHUB_REPO, VERSION } from "./src/lib/version.ts";
import { validateProjectPath } from "./src/lib/cli.ts";

// Get the directory where this script is located (works for both dev and compiled)
const __dirname = dirname(fromFileUrl(import.meta.url));

// CLI argument parsing
interface CLIArgs {
  projectPath: string;
  port: number;
  help: boolean;
  cache: boolean;
  mcpToken?: string;
  webdav: boolean;
  webdavUser?: string;
  webdavPass?: string;
}

function printHelp(): void {
  console.log(`
mdplanner v${VERSION}

Usage:
  mdplanner [OPTIONS] <project-directory>
  mdplanner init <directory>

Commands:
  init <directory>       Initialize a new project in the given directory

Arguments:
  <project-directory>    Path to the project directory (must contain project.md)

Options:
  -p, --port <port>      Port to run the server on (default: 8003)
  -c, --cache            Enable SQLite cache for fast search and queries
      --mcp-token <tok>  Protect the /mcp endpoint with a bearer token
      --webdav           Enable WebDAV server at /webdav (mount project dir)
      --webdav-user <u>  WebDAV basic auth username (requires --webdav-pass)
      --webdav-pass <p>  WebDAV basic auth password
  -h, --help             Show this help message

Examples:
  mdplanner init ./my-project
  mdplanner ./my-project
  mdplanner --port 8080 ./my-project
  mdplanner --cache ./my-project

Repository: https://github.com/${GITHUB_REPO}
`);
}

function parseArgs(args: string[]): CLIArgs {
  // Environment variable fallbacks (CLI flags take precedence)
  const result: CLIArgs = {
    projectPath: ".",
    port: Deno.env.get("MDPLANNER_PORT")
      ? parseInt(Deno.env.get("MDPLANNER_PORT")!, 10)
      : 8003,
    help: false,
    cache: !!Deno.env.get("MDPLANNER_CACHE"),
    mcpToken: Deno.env.get("MDPLANNER_MCP_TOKEN") ?? undefined,
    webdav: !!Deno.env.get("MDPLANNER_WEBDAV"),
    webdavUser: Deno.env.get("MDPLANNER_WEBDAV_USER") ?? undefined,
    webdavPass: Deno.env.get("MDPLANNER_WEBDAV_PASS") ?? undefined,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      result.help = true;
      i++;
    } else if (arg === "-c" || arg === "--cache") {
      result.cache = true;
      i++;
    } else if (arg === "--mcp-token") {
      const tok = args[i + 1];
      if (!tok || tok.startsWith("-")) {
        console.error("Error: --mcp-token requires a value");
        Deno.exit(1);
      }
      result.mcpToken = tok;
      i += 2;
    } else if (arg === "--webdav") {
      result.webdav = true;
      i++;
    } else if (arg === "--webdav-user") {
      const user = args[i + 1];
      if (!user || user.startsWith("-")) {
        console.error("Error: --webdav-user requires a value");
        Deno.exit(1);
      }
      result.webdavUser = user;
      i += 2;
    } else if (arg === "--webdav-pass") {
      const pass = args[i + 1];
      if (!pass || pass.startsWith("-")) {
        console.error("Error: --webdav-pass requires a value");
        Deno.exit(1);
      }
      result.webdavPass = pass;
      i += 2;
    } else if (arg === "-p" || arg === "--port") {
      const portValue = args[i + 1];
      if (!portValue || portValue.startsWith("-")) {
        console.error("Error: --port requires a numeric value");
        Deno.exit(1);
      }
      const port = parseInt(portValue, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        console.error("Error: --port must be a valid port number (1-65535)");
        Deno.exit(1);
      }
      result.port = port;
      i += 2;
    } else if (arg.startsWith("-")) {
      console.error(`Error: Unknown option '${arg}'`);
      console.error("Use --help for usage information");
      Deno.exit(1);
    } else {
      // Positional argument: project directory
      result.projectPath = arg;
      i++;
    }
  }

  return result;
}

// Handle `init` subcommand before normal arg parsing
if (Deno.args[0] === "init") {
  const initDir = Deno.args[1];
  if (!initDir) {
    console.error("Error: init requires a directory argument");
    console.error("Usage: mdplanner init <directory>");
    Deno.exit(1);
  }
  const result = await initProject(initDir);
  printInitSuccess(result, VERSION);
  Deno.exit(0);
}

// Parse CLI arguments
const cliArgs = parseArgs(Deno.args);

if (cliArgs.help) {
  printHelp();
  Deno.exit(0);
}

// Validate project path
await validateProjectPath(cliArgs.projectPath);

const projectManager = new ProjectManager(cliArgs.projectPath, {
  enableCache: cliArgs.cache,
  dbPath: `${cliArgs.projectPath}/.mdplanner.db`,
});
await projectManager.init();

// Create main app
const app = new Hono();

// API routes
const apiRouter = createApiRouter(projectManager);
app.route("/api", apiRouter);

// MCP HTTP endpoint (Model Context Protocol — remote AI client access)
const mcpRouter = createMcpHonoRouter(projectManager, cliArgs.mcpToken);
app.route("/mcp", mcpRouter);

// WebDAV — mount project directory as a WebDAV volume (e.g. for Obsidian)
if (cliArgs.webdav) {
  const webdavHandler = await createWebDavHandler({
    rootDir: cliArgs.projectPath,
    authUser: cliArgs.webdavUser ?? null,
    authPass: cliArgs.webdavPass ?? null,
  });

  // Redirect /webdav → /webdav/ so DAV clients hit the root collection
  app.get("/webdav", (c) => c.redirect("/webdav/", 301));

  // Strip /webdav prefix and forward the raw request to the WebDAV handler
  app.all("/webdav/*", async (c) => {
    const orig = new URL(c.req.raw.url);
    const davPath = orig.pathname.replace(/^\/webdav/, "") || "/";
    const davUrl = new URL(davPath + orig.search, orig.origin);
    const davReq = new Request(davUrl.toString(), c.req.raw);
    return webdavHandler(davReq);
  });
}

// Serve uploaded files from the project directory
const UPLOAD_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".csv": "text/csv",
  ".json": "application/json",
};

app.get("/uploads/*", async (c) => {
  const filePath = join(cliArgs.projectPath, c.req.path);
  try {
    const data = await Deno.readFile(filePath);
    const mime = UPLOAD_MIME[extname(filePath).toLowerCase()] ??
      "application/octet-stream";
    return new Response(data, { headers: { "Content-Type": mime } });
  } catch {
    return c.notFound();
  }
});

// Static files with no-cache headers
const staticRoot = join(__dirname, "src", "static");
app.use(
  "/*",
  serveStatic({
    root: staticRoot,
    onFound: (_path, c) => {
      c.header("Cache-Control", "no-cache, no-store, must-revalidate");
      c.header("Pragma", "no-cache");
      c.header("Expires", "0");
    },
  }),
);

console.log(`mdplanner v${VERSION}`);
console.log(`Server  http://localhost:${cliArgs.port}`);
console.log(`MCP     http://localhost:${cliArgs.port}/mcp`);
console.log(`Project ${cliArgs.projectPath}`);
if (cliArgs.cache) {
  console.log(`Cache   ${cliArgs.projectPath}/.mdplanner.db`);
}
if (cliArgs.mcpToken) {
  console.log(`MCP auth enabled (bearer token)`);
}
if (cliArgs.webdav) {
  console.log(`WebDAV http://localhost:${cliArgs.port}/webdav`);
  if (cliArgs.webdavUser) console.log(`WebDAV auth enabled (basic auth)`);
}

const projects = await projectManager.scanProjects();
console.log(`Found ${projects.length} project(s):`);
projects.forEach((p) =>
  console.log(`  - ${p.filename} (${p.name}, ${p.taskCount} tasks)`)
);

Deno.serve({ port: cliArgs.port }, app.fetch);
