import { serve } from "deno/http";
import { serveDir } from "deno/http/file_server";
import { join } from "@std/path";
import { TaskAPI } from "./src/api/tasks.ts";
import { ProjectManager } from "./src/lib/project-manager.ts";

export const VERSION = "0.1.0";
export const GITHUB_REPO = "studiowebux/mdplanner";

// Get directory from command line args or default to current directory
const directory = Deno.args[0] || ".";
const projectManager = new ProjectManager(directory);
await projectManager.init();

const taskAPI = new TaskAPI(projectManager);

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // API routes
  if (url.pathname.startsWith("/api/")) {
    return await taskAPI.handle(req);
  }

  // Static files
  const response = await serveDir(req, {
    fsRoot: join(Deno.cwd(), "src/static"),
    urlRoot: "",
  });

  // Add no-cache headers for development
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers,
  });
}

console.log(`Server running on http://localhost:8003`);
console.log(`Scanning for projects in: ${directory}`);

const projects = await projectManager.scanProjects();
console.log(`Found ${projects.length} project(s):`);
projects.forEach(p => console.log(`  - ${p.filename} (${p.name}, ${p.taskCount} tasks)`));

await serve(handler, { port: 8003 });
