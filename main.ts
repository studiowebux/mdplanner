import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { dirname, fromFileUrl, join } from "@std/path";
import { ProjectManager } from "./src/lib/project-manager.ts";
import { createApiRouter } from "./src/api/routes/index.ts";

// Get the directory where this script is located (works for both dev and compiled)
const __dirname = dirname(fromFileUrl(import.meta.url));

export const VERSION = "0.2.1";
export const GITHUB_REPO = "studiowebux/mdplanner";

// CLI argument parsing
interface CLIArgs {
  projectPath: string;
  port: number;
  help: boolean;
  cache: boolean;
}

function printHelp(): void {
  console.log(`
mdplanner v${VERSION}

Usage:
  mdplanner [OPTIONS] <project-directory>

Arguments:
  <project-directory>    Path to the project directory (must contain project.md)

Options:
  -p, --port <port>      Port to run the server on (default: 8003)
  -c, --cache            Enable SQLite cache for fast search and queries
  -h, --help             Show this help message

Examples:
  mdplanner ./my-project
  mdplanner --port 8080 ./my-project
  mdplanner --cache ./my-project
  deno task dev ./example/portfolio

Repository: https://github.com/${GITHUB_REPO}
`);
}

function parseArgs(args: string[]): CLIArgs {
  const result: CLIArgs = {
    projectPath: ".",
    port: 8003,
    help: false,
    cache: false,
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

async function validateProjectPath(path: string): Promise<void> {
  try {
    const stat = await Deno.stat(path);
    if (!stat.isDirectory) {
      console.error(`Error: '${path}' is not a directory`);
      Deno.exit(1);
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`Error: Directory '${path}' does not exist`);
      Deno.exit(1);
    }
    throw error;
  }

  // Check for project.md
  try {
    await Deno.stat(`${path}/project.md`);
  } catch {
    console.error(`Error: '${path}' does not contain a project.md file`);
    console.error("Create a project.md file to initialize the project.");
    Deno.exit(1);
  }
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
console.log(`Server running on http://localhost:${cliArgs.port}`);
console.log(`Project: ${cliArgs.projectPath}`);
if (cliArgs.cache) {
  console.log(`Cache: enabled (${cliArgs.projectPath}/.mdplanner.db)`);
}

const projects = await projectManager.scanProjects();
console.log(`Found ${projects.length} project(s):`);
projects.forEach((p) =>
  console.log(`  - ${p.filename} (${p.name}, ${p.taskCount} tasks)`)
);

Deno.serve({ port: cliArgs.port }, app.fetch);
