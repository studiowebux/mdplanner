import { ensureDir } from "@std/fs";
import { join } from "@std/path";

// Starter directories — essential set for a new project
const STARTER_DIRECTORIES = [
  "board/todo",
  "board/in_progress",
  "board/done",
  "notes",
  "goals",
  "milestones",
  "ideas",
  "canvas",
  "retrospectives",
];

function generateProjectMd(projectName: string): string {
  const today = new Date().toISOString().split("T")[0];
  return `---
start_date: ${today}
status: active
working_days_per_week: 5
working_days: [Mon, Tue, Wed, Thu, Fri]
assignees: []
tags: []
links: []
---

# ${projectName}

A new mdplanner project.
`;
}

interface InitResult {
  created: string[];
  projectPath: string;
}

export async function initProject(directory: string): Promise<InitResult> {
  const projectMdPath = join(directory, "project.md");

  // Prevent overwriting an existing project
  try {
    await Deno.stat(projectMdPath);
    console.error(
      `Error: '${directory}' already contains a project.md file.`,
    );
    console.error("Cannot initialize over an existing project.");
    Deno.exit(1);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
    // NotFound is expected — proceed
  }

  const created: string[] = [];

  // Create project directory
  await ensureDir(directory);

  // Derive project name from directory name
  const projectName = directory.split("/").pop() || "Untitled Project";

  // Create project.md
  await Deno.writeTextFile(projectMdPath, generateProjectMd(projectName));
  created.push("project.md");

  // Create starter subdirectories
  for (const dir of STARTER_DIRECTORIES) {
    await ensureDir(join(directory, dir));
    created.push(dir + "/");
  }

  return { created, projectPath: directory };
}

export function printInitSuccess(result: InitResult, version: string): void {
  console.log(`mdplanner v${version}`);
  console.log("");
  console.log(`Project initialized in '${result.projectPath}'`);
  console.log("");
  console.log("Created:");
  for (const item of result.created) {
    console.log(`  ${item}`);
  }
  console.log("");
  console.log("Next steps:");
  console.log(`  cd ${result.projectPath}`);
  console.log("  mdplanner .");
  console.log("");
  console.log("Edit project.md to configure your project settings.");
}
