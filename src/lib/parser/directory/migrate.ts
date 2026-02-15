/**
 * Migration utilities for converting between single-file and directory-based formats.
 */
import { MarkdownParser } from "../../markdown-parser.ts";
import { DirectoryMarkdownParser } from "./parser.ts";
import type { Task, Note, Goal } from "../../types.ts";

export interface MigrationResult {
  success: boolean;
  projectDir: string;
  stats: {
    notes: number;
    goals: number;
    tasks: number;
    sections: number;
  };
  errors: string[];
}

/**
 * Migrate a single-file markdown project to directory-based format.
 */
export async function migrateToDirectory(
  sourceFile: string,
  targetDir: string
): Promise<MigrationResult> {
  const errors: string[] = [];
  const stats = { notes: 0, goals: 0, tasks: 0, sections: 0 };

  try {
    // Read from single-file parser
    const singleFileParser = new MarkdownParser(sourceFile);
    const dirParser = new DirectoryMarkdownParser(targetDir);

    // Initialize directory structure
    await dirParser.initialize();

    // Read all data from single file
    const projectInfo = await singleFileParser.readProjectInfo();
    const projectConfig = await singleFileParser.readProjectConfig();
    const tasks = await singleFileParser.readTasks();

    // Migrate project info
    await dirParser.saveProjectName(projectInfo.name);
    await dirParser.saveProjectDescription(projectInfo.description);
    await dirParser.saveProjectConfig(projectConfig);

    // Migrate notes
    for (const note of projectInfo.notes) {
      try {
        await dirParser.addNote({
          title: note.title,
          content: note.content,
          mode: note.mode || "simple",
        });
        stats.notes++;
      } catch (error) {
        errors.push(`Failed to migrate note "${note.title}": ${(error as Error).message}`);
      }
    }

    // Migrate goals
    for (const goal of projectInfo.goals) {
      try {
        const { id, ...goalData } = goal;
        await dirParser.addGoal(goalData);
        stats.goals++;
      } catch (error) {
        errors.push(`Failed to migrate goal "${goal.title}": ${(error as Error).message}`);
      }
    }

    // Collect sections and migrate tasks
    const sections = new Set<string>();
    for (const task of tasks) {
      sections.add(task.section);
    }

    for (const section of sections) {
      await dirParser.addSection(section);
      stats.sections++;
    }

    for (const task of tasks) {
      try {
        const { id, ...taskData } = task;
        await dirParser.addTask(taskData);
        stats.tasks++;
      } catch (error) {
        errors.push(`Failed to migrate task "${task.title}": ${(error as Error).message}`);
      }
    }

    // TODO: Migrate sticky notes, mindmaps, C4, and other features
    // when their directory parsers are implemented

    return {
      success: errors.length === 0,
      projectDir: targetDir,
      stats,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      projectDir: targetDir,
      stats,
      errors: [`Migration failed: ${(error as Error).message}`],
    };
  }
}

/**
 * Migrate a directory-based project back to single-file format.
 */
export async function migrateFromDirectory(
  sourceDir: string,
  targetFile: string
): Promise<MigrationResult> {
  const errors: string[] = [];
  const stats = { notes: 0, goals: 0, tasks: 0, sections: 0 };

  try {
    const dirParser = new DirectoryMarkdownParser(sourceDir);
    const singleFileParser = new MarkdownParser(targetFile);

    // Read all data from directory
    const projectInfo = await dirParser.readProjectInfo();
    const projectConfig = await dirParser.readProjectConfig();
    const tasks = await dirParser.readTasks();

    // Initialize single file with project info
    const sections = await dirParser.readSections();
    stats.sections = sections.length;

    // Write initial structure
    let content = `# ${projectInfo.name}\n\n`;
    if (projectInfo.description.length > 0) {
      content += projectInfo.description.join("\n") + "\n\n";
    }

    // Add Configurations section
    content += "<!-- Configurations -->\n";
    content += "# Configurations\n";
    if (projectConfig.startDate) content += `Start Date: ${projectConfig.startDate}\n`;
    if (projectConfig.workingDaysPerWeek) {
      content += `Working Days: ${projectConfig.workingDaysPerWeek}\n`;
    }
    if (projectConfig.workingDays) {
      content += `Working Days List: ${projectConfig.workingDays.join(", ")}\n`;
    }
    if (projectConfig.assignees?.length) {
      content += `Assignees: ${projectConfig.assignees.join(", ")}\n`;
    }
    if (projectConfig.tags?.length) {
      content += `Tags: ${projectConfig.tags.join(", ")}\n`;
    }
    content += "\n";

    // Add Notes section
    content += "<!-- Notes -->\n";
    content += "# Notes\n";
    for (const note of projectInfo.notes) {
      content += `## ${note.title}\n`;
      content += `<!-- id: ${note.id} | created: ${note.createdAt} | updated: ${note.updatedAt} | rev: ${note.revision} -->\n`;
      content += note.content + "\n\n";
      stats.notes++;
    }

    // Add Goals section
    content += "<!-- Goals -->\n";
    content += "# Goals\n";
    for (const goal of projectInfo.goals) {
      const config = `type: ${goal.type}; kpi: ${goal.kpi}; start: ${goal.startDate}; end: ${goal.endDate}; status: ${goal.status}`;
      content += `## ${goal.title} {${config}}\n`;
      content += `<!-- id: ${goal.id} -->\n`;
      if (goal.description) content += goal.description + "\n";
      content += "\n";
      stats.goals++;
    }

    // Add Board section
    content += "<!-- Board -->\n";
    content += "# Board\n";
    for (const section of sections) {
      content += `## ${section}\n`;
      const sectionTasks = tasks.filter((t) => t.section === section);
      for (const task of sectionTasks) {
        const checkbox = task.completed ? "[x]" : "[ ]";
        let config = "";
        if (task.config.tag?.length) config += `tag: [${task.config.tag.join(", ")}]; `;
        if (task.config.due_date) config += `due_date: ${task.config.due_date}; `;
        if (task.config.assignee) config += `assignee: ${task.config.assignee}; `;
        if (task.config.priority !== undefined) config += `priority: ${task.config.priority}; `;
        if (task.config.effort !== undefined) config += `effort: ${task.config.effort}; `;
        if (task.config.milestone) config += `milestone: ${task.config.milestone}; `;

        const configStr = config ? ` {${config.slice(0, -2)}}` : "";
        content += `- ${checkbox} (${task.id}) ${task.title}${configStr}\n`;

        if (task.description?.length) {
          for (const line of task.description) {
            content += `  ${line}\n`;
          }
        }

        if (task.children?.length) {
          for (const child of task.children) {
            const childCheckbox = child.completed ? "[x]" : "[ ]";
            content += `  - ${childCheckbox} (${child.id}) ${child.title}\n`;
          }
        }

        stats.tasks++;
      }
      content += "\n";
    }

    await Deno.writeTextFile(targetFile, content);

    return {
      success: errors.length === 0,
      projectDir: sourceDir,
      stats,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      projectDir: sourceDir,
      stats,
      errors: [`Migration failed: ${(error as Error).message}`],
    };
  }
}
