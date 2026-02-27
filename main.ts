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
import { generateKeyPair } from "./src/lib/backup/crypto.ts";
import { initScheduler } from "./src/lib/backup/scheduler.ts";

// Get the directory where this script is located (works for both dev and compiled)
const __dirname = dirname(fromFileUrl(import.meta.url));

// CLI argument parsing
interface CLIArgs {
  projectPath: string;
  port: number;
  help: boolean;
  cache: boolean;
  readOnly: boolean;
  mcpToken?: string;
  webdav: boolean;
  webdavUser?: string;
  webdavPass?: string;
  backupDir?: string;
  backupIntervalHours: number;
  backupPublicKey?: string;
}

function printHelp(): void {
  console.log(`
mdplanner v${VERSION}

Usage:
  mdplanner [OPTIONS] <project-directory>
  mdplanner init <directory>
  mdplanner keygen

Commands:
  init <directory>       Initialize a new project in the given directory
  keygen                 Generate a hex-encoded RSA-OAEP-4096 key pair for backup encryption

Arguments:
  <project-directory>    Path to the project directory (must contain project.md)

Options:
  -p, --port <port>            Port to run the server on (default: 8003)
  -c, --cache                  Enable SQLite cache for fast search and queries
      --read-only              Block all mutations (public demo mode)
      --mcp-token <tok>        Protect the /mcp endpoint with a bearer token
      --webdav                 Enable WebDAV server at /webdav (mount project dir)
      --webdav-user <u>        WebDAV basic auth username (requires --webdav-pass)
      --webdav-pass <p>        WebDAV basic auth password
      --backup-dir <path>      Directory for automated backups
      --backup-interval <hrs>  Backup frequency in hours (requires --backup-dir)
      --backup-public-key <h>  Hex RSA public key — encrypts all backups
  -h, --help                   Show this help message

Examples:
  mdplanner init ./my-project
  mdplanner keygen
  mdplanner ./my-project
  mdplanner --port 8080 ./my-project
  mdplanner --cache ./my-project
  mdplanner --backup-dir /var/backups/myproject --backup-interval 24 ./my-project

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
    readOnly: !!Deno.env.get("MDPLANNER_READ_ONLY"),
    mcpToken: Deno.env.get("MDPLANNER_MCP_TOKEN") ?? undefined,
    webdav: !!Deno.env.get("MDPLANNER_WEBDAV"),
    webdavUser: Deno.env.get("MDPLANNER_WEBDAV_USER") ?? undefined,
    webdavPass: Deno.env.get("MDPLANNER_WEBDAV_PASS") ?? undefined,
    backupDir: Deno.env.get("MDPLANNER_BACKUP_DIR") ?? undefined,
    backupIntervalHours: Deno.env.get("MDPLANNER_BACKUP_INTERVAL")
      ? parseInt(Deno.env.get("MDPLANNER_BACKUP_INTERVAL")!, 10)
      : 0,
    backupPublicKey: Deno.env.get("MDPLANNER_BACKUP_PUBLIC_KEY") ?? undefined,
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
    } else if (arg === "--read-only") {
      result.readOnly = true;
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
    } else if (arg === "--backup-dir") {
      const dir = args[i + 1];
      if (!dir || dir.startsWith("-")) {
        console.error("Error: --backup-dir requires a path");
        Deno.exit(1);
      }
      result.backupDir = dir;
      i += 2;
    } else if (arg === "--backup-interval") {
      const val = args[i + 1];
      if (!val || val.startsWith("-")) {
        console.error("Error: --backup-interval requires a number of hours");
        Deno.exit(1);
      }
      const hrs = parseInt(val, 10);
      if (isNaN(hrs) || hrs < 1) {
        console.error("Error: --backup-interval must be a positive integer");
        Deno.exit(1);
      }
      result.backupIntervalHours = hrs;
      i += 2;
    } else if (arg === "--backup-public-key") {
      const key = args[i + 1];
      if (!key || key.startsWith("-")) {
        console.error("Error: --backup-public-key requires a hex value");
        Deno.exit(1);
      }
      result.backupPublicKey = key;
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

// Handle `keygen` subcommand — generate a hex-encoded RSA-OAEP-4096 key pair
if (Deno.args[0] === "keygen") {
  console.log("Generating RSA-OAEP-4096 key pair...");
  const { publicKeyHex, privateKeyHex } = await generateKeyPair();
  console.log(
    "\nPUBLIC KEY (hex) — store in --backup-public-key or MDPLANNER_BACKUP_PUBLIC_KEY:",
  );
  console.log(publicKeyHex);
  console.log(
    "\nPRIVATE KEY (hex) — keep secret, used to decrypt backups (X-Backup-Private-Key header):",
  );
  console.log(privateKeyHex);
  console.log(
    "\nKeep the private key in a safe place. It cannot be recovered if lost.",
  );
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
  readOnly: cliArgs.readOnly,
  backupPublicKey: cliArgs.backupPublicKey,
});
await projectManager.init();

// Start automated backup scheduler when --backup-dir is configured
if (cliArgs.backupDir && cliArgs.backupIntervalHours > 0) {
  initScheduler({
    projectDir: cliArgs.projectPath,
    backupDir: cliArgs.backupDir,
    intervalHours: cliArgs.backupIntervalHours,
    publicKeyHex: cliArgs.backupPublicKey,
  });
} else if (cliArgs.backupDir && cliArgs.backupIntervalHours === 0) {
  console.warn(
    "[backup] --backup-dir set but --backup-interval not provided — automated backups disabled. Use POST /api/backup/trigger for manual backups.",
  );
}

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
if (cliArgs.readOnly) {
  console.log(`Mode    read-only (mutations blocked)`);
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
