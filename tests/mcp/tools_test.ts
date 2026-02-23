/**
 * Integration tests for MCP tool handlers.
 *
 * Each test spins up a real McpServer + InMemoryTransport pair and exercises
 * the registered tools through a real MCP Client, using a temp project directory
 * with a minimal project.md so ProjectManager can initialise.
 */

import { assertEquals, assertExists } from "@std/assert";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ProjectManager } from "../../src/lib/project-manager.ts";
import { registerTaskTools } from "../../src/mcp/tools/tasks.ts";
import { registerNoteTools } from "../../src/mcp/tools/notes.ts";
import { registerGoalTools } from "../../src/mcp/tools/goals.ts";
import { registerMeetingTools } from "../../src/mcp/tools/meetings.ts";
import { registerPeopleTools } from "../../src/mcp/tools/people.ts";
import { registerProjectTools } from "../../src/mcp/tools/project.ts";
import { registerSearchTools } from "../../src/mcp/tools/search.ts";

// Minimal project.md so ProjectManager.init() succeeds.
// The project name is parsed from the H1 heading in the markdown body.
const MINIMAL_PROJECT_MD = `---
status: active
---

# Test Project

MCP test project
`;

async function createProjectDir(): Promise<string> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-mcp-test-" });
  await Deno.writeTextFile(`${dir}/project.md`, MINIMAL_PROJECT_MD);
  return dir;
}

async function setup(): Promise<{
  client: Client;
  pm: ProjectManager;
  dir: string;
  cleanup: () => Promise<void>;
}> {
  const dir = await createProjectDir();
  const pm = new ProjectManager(dir, { enableCache: false });
  await pm.init();

  const server = new McpServer({ name: "mdplanner-test", version: "0.0.1" });
  registerTaskTools(server, pm);
  registerNoteTools(server, pm);
  registerGoalTools(server, pm);
  registerMeetingTools(server, pm);
  registerPeopleTools(server, pm);
  registerProjectTools(server, pm);
  registerSearchTools(server, pm);

  const [serverTransport, clientTransport] = InMemoryTransport
    .createLinkedPair();
  await server.connect(serverTransport);

  const client = new Client({ name: "test-client", version: "0.0.1" });
  await client.connect(clientTransport);

  const cleanup = async () => {
    await client.close();
    await server.close();
    await Deno.remove(dir, { recursive: true });
  };

  return { client, pm, dir, cleanup };
}

// === list_tasks ===

Deno.test("list_tasks - returns empty array when no tasks exist", async () => {
  const { client, cleanup } = await setup();
  try {
    const result = await client.callTool({ name: "list_tasks", arguments: {} });
    assertExists(result.content);
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;
    const tasks = JSON.parse(text);
    assertEquals(Array.isArray(tasks), true);
    assertEquals(tasks.length, 0);
  } finally {
    await cleanup();
  }
});

Deno.test("list_tasks - returns created task", async () => {
  const { client, pm, cleanup } = await setup();
  try {
    await pm.getActiveParser().addTask({
      title: "Test task",
      completed: false,
      section: "Todo",
      config: {},
    });
    const result = await client.callTool({ name: "list_tasks", arguments: {} });
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;
    const tasks = JSON.parse(text);
    assertEquals(tasks.length, 1);
    assertEquals(tasks[0].title, "Test task");
  } finally {
    await cleanup();
  }
});

Deno.test("list_tasks - filters by section", async () => {
  const { client, pm, cleanup } = await setup();
  try {
    await pm.getActiveParser().addTask({
      title: "Todo item",
      completed: false,
      section: "Todo",
      config: {},
    });
    await pm.getActiveParser().addTask({
      title: "Done item",
      completed: true,
      section: "Done",
      config: {},
    });
    const result = await client.callTool({
      name: "list_tasks",
      arguments: { section: "Todo" },
    });
    const tasks = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    assertEquals(tasks.length, 1);
    assertEquals(tasks[0].title, "Todo item");
  } finally {
    await cleanup();
  }
});

// === get_task ===

Deno.test("get_task - returns task by ID", async () => {
  const { client, pm, cleanup } = await setup();
  try {
    const id = await pm.getActiveParser().addTask({
      title: "Findable task",
      completed: false,
      section: "Todo",
      config: {},
    });
    const result = await client.callTool({
      name: "get_task",
      arguments: { id },
    });
    const task = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    assertEquals(task.id, id);
    assertEquals(task.title, "Findable task");
  } finally {
    await cleanup();
  }
});

Deno.test("get_task - returns error for unknown ID", async () => {
  const { client, cleanup } = await setup();
  try {
    const result = await client.callTool({
      name: "get_task",
      arguments: { id: "nonexistent" },
    });
    assertEquals(result.isError, true);
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;
    assertEquals(text.includes("not found"), true);
  } finally {
    await cleanup();
  }
});

// === create_task ===

Deno.test("create_task - creates task and returns id", async () => {
  const { client, pm, cleanup } = await setup();
  try {
    const result = await client.callTool({
      name: "create_task",
      arguments: { title: "Created via MCP", section: "In Progress" },
    });
    const { id } = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    assertExists(id);
    const tasks = await pm.getActiveParser().readTasks();
    const flat = tasks.flatMap((t) => [t, ...(t.children ?? [])]);
    const created = flat.find((t) => t.id === id);
    assertExists(created);
    assertEquals(created.title, "Created via MCP");
  } finally {
    await cleanup();
  }
});

// === list_notes ===

Deno.test("list_notes - returns empty array when no notes", async () => {
  const { client, cleanup } = await setup();
  try {
    const result = await client.callTool({
      name: "list_notes",
      arguments: {},
    });
    const notes = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    assertEquals(Array.isArray(notes), true);
    assertEquals(notes.length, 0);
  } finally {
    await cleanup();
  }
});

// === list_goals ===

Deno.test("list_goals - returns empty array when no goals", async () => {
  const { client, cleanup } = await setup();
  try {
    const result = await client.callTool({
      name: "list_goals",
      arguments: {},
    });
    const goals = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    assertEquals(Array.isArray(goals), true);
    assertEquals(goals.length, 0);
  } finally {
    await cleanup();
  }
});

// === list_meetings ===

Deno.test("list_meetings - returns empty array when no meetings", async () => {
  const { client, cleanup } = await setup();
  try {
    const result = await client.callTool({
      name: "list_meetings",
      arguments: {},
    });
    const meetings = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    assertEquals(Array.isArray(meetings), true);
    assertEquals(meetings.length, 0);
  } finally {
    await cleanup();
  }
});

// === list_people ===

Deno.test("list_people - returns empty array when no people", async () => {
  const { client, cleanup } = await setup();
  try {
    const result = await client.callTool({
      name: "list_people",
      arguments: {},
    });
    const people = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    assertEquals(Array.isArray(people), true);
    assertEquals(people.length, 0);
  } finally {
    await cleanup();
  }
});

// === get_project_config ===

Deno.test("get_project_config - returns project name", async () => {
  const { client, cleanup } = await setup();
  try {
    const result = await client.callTool({
      name: "get_project_config",
      arguments: {},
    });
    const config = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    assertEquals(config.name, "Test Project");
    assertEquals(config.cacheEnabled, false);
  } finally {
    await cleanup();
  }
});

// === search ===

Deno.test("search - returns error when cache is disabled", async () => {
  const { client, cleanup } = await setup();
  try {
    const result = await client.callTool({
      name: "search",
      arguments: { query: "test" },
    });
    assertEquals(result.isError, true);
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;
    assertEquals(text.includes("--cache"), true);
  } finally {
    await cleanup();
  }
});
