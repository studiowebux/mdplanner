import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { ProjectManager } from "./src/lib/project-manager.ts";
import { createApiRouter } from "./src/api/routes/index.ts";

export const VERSION = "0.1.0";
export const GITHUB_REPO = "studiowebux/mdplanner";

// Get directory from command line args or default to current directory
const directory = Deno.args[0] || ".";
const projectManager = new ProjectManager(directory);
await projectManager.init();

// Create main app
const app = new Hono();

// API routes
const apiRouter = createApiRouter(projectManager);
app.route("/api", apiRouter);

// Static files with no-cache headers
app.use(
  "/*",
  serveStatic({
    root: "./src/static",
    onFound: (_path, c) => {
      c.header("Cache-Control", "no-cache, no-store, must-revalidate");
      c.header("Pragma", "no-cache");
      c.header("Expires", "0");
    },
  })
);

console.log(`Server running on http://localhost:8003`);
console.log(`Scanning for projects in: ${directory}`);

const projects = await projectManager.scanProjects();
console.log(`Found ${projects.length} project(s):`);
projects.forEach(p => console.log(`  - ${p.filename} (${p.name}, ${p.taskCount} tasks)`));

Deno.serve({ port: 8003 }, app.fetch);
