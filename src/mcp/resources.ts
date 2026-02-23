/**
 * MCP resource handlers for mdplanner:// URIs.
 *
 * Resources:
 *   mdplanner://project  — project config + metadata
 *   mdplanner://tasks    — all tasks as JSON
 *   mdplanner://notes    — all notes as JSON
 *   mdplanner://goals    — all goals as JSON
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ProjectManager } from "../lib/project-manager.ts";

export function registerResources(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerResource(
    "project",
    "mdplanner://project",
    {
      mimeType: "application/json",
      description: "Project configuration and metadata",
    },
    async () => {
      const [info, config] = await Promise.all([
        parser.readProjectInfo(),
        parser.readProjectConfig(),
      ]);
      return {
        contents: [{
          uri: "mdplanner://project",
          mimeType: "application/json",
          text: JSON.stringify(
            { name: info.name, description: info.description, ...config },
            null,
            2,
          ),
        }],
      };
    },
  );

  server.registerResource(
    "tasks",
    "mdplanner://tasks",
    { mimeType: "application/json", description: "All tasks in the project" },
    async () => {
      const tasks = await parser.readTasks();
      return {
        contents: [{
          uri: "mdplanner://tasks",
          mimeType: "application/json",
          text: JSON.stringify(tasks, null, 2),
        }],
      };
    },
  );

  server.registerResource(
    "notes",
    "mdplanner://notes",
    { mimeType: "application/json", description: "All notes in the project" },
    async () => {
      const notes = await parser.readNotes();
      return {
        contents: [{
          uri: "mdplanner://notes",
          mimeType: "application/json",
          text: JSON.stringify(notes, null, 2),
        }],
      };
    },
  );

  server.registerResource(
    "goals",
    "mdplanner://goals",
    { mimeType: "application/json", description: "All goals in the project" },
    async () => {
      const goals = await parser.readGoals();
      return {
        contents: [{
          uri: "mdplanner://goals",
          mimeType: "application/json",
          text: JSON.stringify(goals, null, 2),
        }],
      };
    },
  );
}
