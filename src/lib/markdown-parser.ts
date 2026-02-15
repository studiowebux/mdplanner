import {
  BillingRate,
  Brief,
  BusinessModelCanvas,
  C4Component,
  CapacityPlan,
  Company,
  Contact,
  Customer,
  Deal,
  Goal,
  Idea,
  Interaction,
  Invoice,
  InvoiceLineItem,
  LeanCanvas,
  Milestone,
  Mindmap,
  MindmapNode,
  Note,
  Payment,
  ProjectConfig,
  ProjectInfo,
  ProjectLink,
  ProjectValueBoard,
  Quote,
  QuoteLineItem,
  Retrospective,
  RiskAnalysis,
  StickyNote,
  StrategicLevel,
  StrategicLevelsBuilder,
  STRATEGIC_LEVEL_ORDER,
  StrategicLevelType,
  SwotAnalysis,
  Task,
  TeamMember,
  TimeEntry,
  WeeklyAllocation,
} from "./types.ts";
import { BaseParser } from "./parser/core.ts";
import { TaskParser } from "./parser/task-parser.ts";
import { NotesParser } from "./parser/notes-parser.ts";
import { CanvasParser } from "./parser/canvas-parser.ts";
import { GoalsParser } from "./parser/goals-parser.ts";
import { C4Parser } from "./parser/c4-parser.ts";
import { MilestonesParser } from "./parser/features/milestones-parser.ts";
import { IdeasParser } from "./parser/features/ideas-parser.ts";
import { RetrospectivesParser } from "./parser/features/retrospectives-parser.ts";
import { TimeTrackingParser } from "./parser/features/time-tracking-parser.ts";
import { SwotParser } from "./parser/features/swot-parser.ts";
import { RiskParser } from "./parser/features/risk-parser.ts";
import { LeanCanvasParser } from "./parser/features/lean-canvas-parser.ts";
import { BusinessModelParser } from "./parser/features/business-model-parser.ts";
import { ProjectValueParser } from "./parser/features/project-value-parser.ts";
import { BriefParser } from "./parser/features/brief-parser.ts";
import { CapacityParser } from "./parser/features/capacity-parser.ts";
import { StrategicParser } from "./parser/features/strategic-parser.ts";
import { BillingParser } from "./parser/features/billing-parser.ts";
import { CRMParser } from "./parser/features/crm-parser.ts";

export class MarkdownParser extends BaseParser {
  private taskParser: TaskParser;
  private notesParser: NotesParser;
  private canvasParser: CanvasParser;
  private goalsParser: GoalsParser;
  private c4Parser: C4Parser;
  private milestonesParser: MilestonesParser;
  private ideasParser: IdeasParser;
  private retrospectivesParser: RetrospectivesParser;
  private timeTrackingParser: TimeTrackingParser;
  private swotParser: SwotParser;
  private riskParser: RiskParser;
  private leanCanvasParser: LeanCanvasParser;
  private businessModelParser: BusinessModelParser;
  private projectValueParser: ProjectValueParser;
  private briefParser: BriefParser;
  private capacityParser: CapacityParser;
  private strategicParser: StrategicParser;
  private billingParser: BillingParser;
  private crmParser: CRMParser;

  constructor(filePath: string) {
    super(filePath);
    this.taskParser = new TaskParser(filePath);
    this.notesParser = new NotesParser(filePath);
    this.canvasParser = new CanvasParser(filePath);
    this.goalsParser = new GoalsParser(filePath);
    this.c4Parser = new C4Parser(filePath);
    this.milestonesParser = new MilestonesParser(filePath);
    this.ideasParser = new IdeasParser(filePath);
    this.retrospectivesParser = new RetrospectivesParser(filePath);
    this.timeTrackingParser = new TimeTrackingParser(filePath);
    this.swotParser = new SwotParser(filePath);
    this.riskParser = new RiskParser(filePath);
    this.leanCanvasParser = new LeanCanvasParser(filePath);
    this.businessModelParser = new BusinessModelParser(filePath);
    this.projectValueParser = new ProjectValueParser(filePath);
    this.briefParser = new BriefParser(filePath);
    this.capacityParser = new CapacityParser(filePath);
    this.strategicParser = new StrategicParser(filePath);
    this.billingParser = new BillingParser(filePath);
    this.crmParser = new CRMParser(filePath);
  }

  async readTasks(): Promise<Task[]> {
    try {
      const content = await Deno.readTextFile(this.filePath);
      return this.parseMarkdown(content);
    } catch (error) {
      console.error("Error reading markdown file:", error);
      return [];
    }
  }

  async readProjectInfo(): Promise<ProjectInfo> {
    try {
      const content = await Deno.readTextFile(this.filePath);
      return this.parseProjectInfo(content);
    } catch (error) {
      console.error("Error reading markdown file:", error);
      return {
        name: "Untitled Project",
        description: [],
        notes: [],
        goals: [],
        stickyNotes: [],
        mindmaps: [],
        c4Components: [],
      };
    }
  }

  private parseProjectInfo(content: string): ProjectInfo {
    const lines = content.split("\n");
    let projectName = "Untitled Project";
    const description: string[] = [];
    const notes: Note[] = [];
    const goals: Goal[] = [];
    const stickyNotes: StickyNote[] = [];
    const mindmaps: Mindmap[] = [];
    let c4Components: C4Component[] = [];
    let i = 0;
    let foundFirstHeader = false;
    let descriptionComplete = false; // Set true after first section header
    let inConfigSection = false;
    let inNotesSection = false;
    let inGoalsSection = false;
    let inCanvasSection = false;
    let inMindmapSection = false;
    let inC4Section = false;

    while (i < lines.length) {
      const line = lines[i].trim();

      // Find the first # header (project name)
      if (line.startsWith("# ") && !foundFirstHeader) {
        projectName = line.substring(2).trim();
        foundFirstHeader = true;
        i++;
        continue;
      }

      // Check which section we're entering
      // Check for section boundary comments
      if (line.trim() === "<!-- Configurations -->") {
        descriptionComplete = true;
        inConfigSection = true;
        inNotesSection = false;
        inGoalsSection = false;
        i++;
        continue;
      }

      if (line.trim() === "<!-- Notes -->") {
        descriptionComplete = true;
        inNotesSection = true;
        inConfigSection = false;
        inGoalsSection = false;
        i++;
        continue;
      }

      if (line.trim() === "<!-- Goals -->") {
        descriptionComplete = true;
        inGoalsSection = true;
        inConfigSection = false;
        inNotesSection = false;
        inCanvasSection = false;
        inMindmapSection = false;
        i++;
        continue;
      }

      if (line.trim() === "<!-- Canvas -->") {
        descriptionComplete = true;
        inCanvasSection = true;
        inConfigSection = false;
        inNotesSection = false;
        inGoalsSection = false;
        inMindmapSection = false;
        i++;
        continue;
      }

      if (line.trim() === "<!-- Mindmap -->") {
        descriptionComplete = true;
        inMindmapSection = true;
        inConfigSection = false;
        inNotesSection = false;
        inGoalsSection = false;
        inCanvasSection = false;
        inC4Section = false;
        i++;
        continue;
      }

      if (line.trim() === "<!-- C4 Architecture -->") {
        descriptionComplete = true;
        inC4Section = true;
        inMindmapSection = false;
        inConfigSection = false;
        inNotesSection = false;
        inGoalsSection = false;
        inCanvasSection = false;
        i++;
        continue;
      }

      if (line === "# Configurations") {
        descriptionComplete = true;
        inConfigSection = true;
        inNotesSection = false;
        inGoalsSection = false;
        inCanvasSection = false;
        inMindmapSection = false;
        i++;
        continue;
      }

      if (line === "# Notes") {
        descriptionComplete = true;
        inNotesSection = true;
        inConfigSection = false;
        inGoalsSection = false;
        inCanvasSection = false;
        inMindmapSection = false;
        i++;
        continue;
      }

      if (line === "# Goals") {
        descriptionComplete = true;
        inGoalsSection = true;
        inConfigSection = false;
        inNotesSection = false;
        inCanvasSection = false;
        inMindmapSection = false;
        i++;
        continue;
      }

      if (line === "# Canvas") {
        descriptionComplete = true;
        inCanvasSection = true;
        inConfigSection = false;
        inNotesSection = false;
        inGoalsSection = false;
        inMindmapSection = false;
        i++;
        continue;
      }

      if (line === "# Mindmap") {
        descriptionComplete = true;
        inMindmapSection = true;
        inConfigSection = false;
        inNotesSection = false;
        inGoalsSection = false;
        inCanvasSection = false;
        inC4Section = false;
        i++;
        continue;
      }

      if (line === "# C4 Architecture") {
        descriptionComplete = true;
        inC4Section = true;
        inMindmapSection = false;
        inConfigSection = false;
        inNotesSection = false;
        inGoalsSection = false;
        inCanvasSection = false;
        i++;
        continue;
      }

      // Stop at Board section (the task board that follows all metadata sections)
      if (line === "# Board" && foundFirstHeader) {
        // Finalize any open section before stopping
        if (inNotesSection) {
          const notesResult = this.notesParser.parseNotesSection(lines, i);
          notes.push(...notesResult.notes);
          inNotesSection = false;
        }
        if (inGoalsSection) {
          const goalsResult = this.goalsParser.parseGoalsSection(lines, i);
          goals.push(...goalsResult.goals);
          inGoalsSection = false;
        }
        if (inCanvasSection) {
          const canvasResult = this.canvasParser.parseCanvasSection(lines, i);
          stickyNotes.push(...canvasResult.stickyNotes);
          inCanvasSection = false;
        }
        if (inMindmapSection) {
          const mindmapResult = this.canvasParser.parseMindmapSection(lines, i);
          mindmaps.push(...mindmapResult.mindmaps);
          inMindmapSection = false;
        }
        if (inC4Section) {
          const c4Result = this.c4Parser.parseC4ComponentsSection(lines, i);
          c4Components.push(...c4Result.components);
          inC4Section = false;
        }
        break;
      }

      // Parse section content when encountering a ## header while in a section
      if (foundFirstHeader && line.startsWith("## ")) {
        if (inNotesSection) {
          const notesResult = this.notesParser.parseNotesSection(lines, i);
          notes.push(...notesResult.notes);
          i = notesResult.nextIndex;
          inNotesSection = false;
          continue;
        }
        if (inGoalsSection) {
          const goalsResult = this.goalsParser.parseGoalsSection(lines, i);
          goals.push(...goalsResult.goals);
          i = goalsResult.nextIndex;
          inGoalsSection = false;
          continue;
        }
        if (inCanvasSection) {
          const canvasResult = this.canvasParser.parseCanvasSection(lines, i);
          stickyNotes.push(...canvasResult.stickyNotes);
          i = canvasResult.nextIndex;
          inCanvasSection = false;
          continue;
        }
        if (inMindmapSection) {
          const mindmapResult = this.canvasParser.parseMindmapSection(lines, i);
          mindmaps.push(...mindmapResult.mindmaps);
          i = mindmapResult.nextIndex;
          inMindmapSection = false;
          continue;
        }
        if (inC4Section) {
          const c4Result = this.c4Parser.parseC4ComponentsSection(lines, i);
          c4Components.push(...c4Result.components);
          i = c4Result.nextIndex;
          inC4Section = false;
          continue;
        }
      }

      // Parse notes in Notes section
      if (inNotesSection && line.startsWith("## ")) {
        const notesResult = this.notesParser.parseNotesSection(lines, i);
        notes.push(...notesResult.notes);
        i = notesResult.nextIndex;
        continue;
      }

      // Parse goals in Goals section
      if (inGoalsSection && line.startsWith("## ")) {
        const goalsResult = this.goalsParser.parseGoalsSection(lines, i);
        goals.push(...goalsResult.goals);
        i = goalsResult.nextIndex;
        continue;
      }

      // Parse sticky notes in Canvas section
      if (inCanvasSection && line.startsWith("## ")) {
        const canvasResult = this.canvasParser.parseCanvasSection(lines, i);
        stickyNotes.push(...canvasResult.stickyNotes);
        i = canvasResult.nextIndex;
        continue;
      }

      // Parse mindmaps in Mindmap section
      if (inMindmapSection && line.startsWith("## ")) {
        const mindmapResult = this.canvasParser.parseMindmapSection(lines, i);
        mindmaps.push(...mindmapResult.mindmaps);
        i = mindmapResult.nextIndex;
        continue;
      }

      // Parse C4 components in C4 section
      if (inC4Section && line.startsWith("## ")) {
        const c4Result = this.c4Parser.parseC4ComponentsSection(lines, i);
        c4Components.push(...c4Result.components);
        i = c4Result.nextIndex;
        continue;
      }

      // Skip any section content (not just known sections)
      if (
        inConfigSection || inNotesSection || inGoalsSection ||
        inCanvasSection || inMindmapSection || inC4Section
      ) {
        i++;
        continue;
      }

      // If we hit any # header (unknown section) or section comment after project name,
      // mark description as complete and skip this content
      if (foundFirstHeader && line.startsWith("# ")) {
        descriptionComplete = true;
        i++;
        continue;
      }

      // Section boundary comments also end description collection
      if (foundFirstHeader && line.startsWith("<!--") && line.endsWith("-->") && !line.includes("id:")) {
        descriptionComplete = true;
        i++;
        continue;
      }

      // Collect description lines only before any section starts
      if (foundFirstHeader && !descriptionComplete && line) {
        description.push(line);
      } else if (foundFirstHeader && !descriptionComplete && !line && description.length > 0) {
        // Keep empty lines if we already have content
        description.push("");
      }

      i++;
    }

    return {
      name: projectName,
      description,
      notes,
      goals,
      stickyNotes,
      mindmaps,
      c4Components,
    };
  }

  private parseMarkdown(content: string): Task[] {
    const lines = content.split("\n");
    const tasks: Task[] = [];
    let currentSection = "";
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();

      // Parse sections (## Section Name)
      if (line.startsWith("## ")) {
        currentSection = line.substring(3).trim();
        i++;
        continue;
      }

      // Parse tasks (- [ ] or - [x])
      if (line.match(/^- \[([ x])\]/)) {
        const result = this.taskParser.parseTask(lines, i, currentSection);
        if (result.task) {
          tasks.push(result.task);
        }
        i = result.nextIndex;
        continue;
      }

      i++;
    }

    return tasks;
  }

  async writeTasks(tasks: Task[], customSections?: string[]): Promise<void> {
    // Read existing file and only update the Board section
    // This preserves all other sections (Milestones, Retrospectives, etc.)
    const existingContent = await Deno.readTextFile(this.filePath);
    const lines = existingContent.split("\n");

    // Find Board section boundaries
    let boardStartIndex = -1;
    let boardEndIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (boardStartIndex === -1 && (line === "# Board" || line === "<!-- Board -->")) {
        boardStartIndex = i;
      } else if (boardStartIndex !== -1 && line.startsWith("# ") && line !== "# Board") {
        boardEndIndex = i;
        break;
      }
    }

    // Generate new Board section content
    const sections = customSections || this.getSectionsFromBoard();
    let boardContent = "<!-- Board -->\n# Board\n\n";

    for (const section of sections) {
      boardContent += `## ${section}\n\n`;

      const sectionTasks = tasks.filter((task) =>
        task.section === section && !task.parentId
      );

      for (const task of sectionTasks) {
        boardContent += this.taskParser.taskToMarkdown(task, 0);
      }

      boardContent += "\n";
    }

    // Replace only the Board section, keeping everything else
    if (boardStartIndex !== -1) {
      // Find comment line before # Board if it exists
      if (boardStartIndex > 0 && lines[boardStartIndex - 1].trim() === "<!-- Board -->") {
        boardStartIndex--;
      }

      const before = lines.slice(0, boardStartIndex);
      const after = boardEndIndex !== -1 ? lines.slice(boardEndIndex) : [];
      const newContent = [...before, boardContent.trimEnd(), ...after].join("\n");
      await this.safeWriteFile(newContent);
    } else {
      // No Board section exists, append it at the end
      const newContent = existingContent.trimEnd() + "\n\n" + boardContent;
      await this.safeWriteFile(newContent);
    }
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<boolean> {
    const tasks = await this.readTasks();
    const updatedTasks = this.taskParser.updateTaskInList(tasks, taskId, updates);
    if (updatedTasks) {
      await this.writeTasks(updatedTasks);
      return true;
    }
    return false;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const tasks = await this.readTasks();
    const filteredTasks = this.taskParser.deleteTaskFromList(tasks, taskId);
    if (
      filteredTasks.length !== tasks.length ||
      this.taskParser.hasDeletedChild(tasks, filteredTasks)
    ) {
      await this.writeTasks(filteredTasks);
      return true;
    }
    return false;
  }

  async addTask(task: Omit<Task, "id">): Promise<string> {
    const tasks = await this.readTasks();
    const newTask: Task = {
      ...task,
      id: this.taskParser.generateNextTaskId(),
    };

    if (task.parentId) {
      this.taskParser.addChildTask(tasks, task.parentId, newTask);
    } else {
      tasks.push(newTask);
    }

    await this.writeTasks(tasks);
    return newTask.id;
  }

  async readProjectConfig(): Promise<ProjectConfig> {
    try {
      const content = await Deno.readTextFile(this.filePath);
      const config = this.parseProjectConfig(content);
      return config;
    } catch (error) {
      console.error("Error reading project config:", error);
      return {
        startDate: new Date().toISOString().split("T")[0],
        workingDaysPerWeek: 5,
        assignees: [],
        tags: [],
        // sections: ["Ideas", "Todo", "In Progress", "Done"],
      };
    }
  }

  private parseProjectConfig(content: string): ProjectConfig {
    const lines = content.split("\n");
    const config: ProjectConfig = {
      startDate: new Date().toISOString().split("T")[0],
      workingDaysPerWeek: 5,
      assignees: [],
      tags: [],
      links: [],
    };

    let inConfigSection = false;
    let currentSection = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === "# Configurations") {
        inConfigSection = true;
        continue;
      }

      if (line.startsWith("# ") && line !== "# Configurations") {
        inConfigSection = false;
        continue;
      }

      if (inConfigSection) {
        if (line.startsWith("Start Date: ")) {
          config.startDate = line.substring(12).trim();
        } else if (line.startsWith("Working Days: ")) {
          const value = line.substring(14).trim();
          // Check if it's a number or a list of days
          if (/^\d+$/.test(value)) {
            config.workingDaysPerWeek = parseInt(value) || 5;
          } else {
            // Parse comma-separated days like "Mon, Tue, Wed, Thu, Fri"
            config.workingDays = value.split(",").map(d => d.trim()).filter(d => d);
            config.workingDaysPerWeek = config.workingDays.length;
          }
        } else if (line.startsWith("Last Updated: ")) {
          config.lastUpdated = line.substring(14).trim();
        } else if (line === "Assignees:") {
          currentSection = "assignees";
        } else if (line === "Tags:") {
          currentSection = "tags";
        } else if (line === "Links:") {
          currentSection = "links";
        } else if (line.startsWith("- ") && currentSection) {
          const value = line.substring(2).trim();
          if (currentSection === "assignees") {
            config.assignees!.push(value);
          } else if (currentSection === "tags") {
            config.tags!.push(value);
          } else if (currentSection === "links") {
            // Parse markdown link format: [Title](URL)
            const linkMatch = value.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (linkMatch) {
              config.links!.push({ title: linkMatch[1], url: linkMatch[2] });
            }
          }
        } else if (line === "") {
          currentSection = "";
        }
      }
    }

    return config;
  }

  generateNextTaskId(): string {
    return this.taskParser.generateNextTaskId();
  }

  generateNoteId(): string {
    return this.notesParser.generateNoteId();
  }

  getSectionsFromBoard(): string[] {
    try {
      const content = Deno.readTextFileSync(this.filePath);
      const lines = content.split("\n");
      const sections: string[] = [];

      let inBoardSection = false;

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed === "# Board") {
          inBoardSection = true;
          continue;
        }

        if (trimmed.startsWith("# ") && trimmed !== "# Board") {
          inBoardSection = false;
          continue;
        }

        if (inBoardSection && trimmed.startsWith("## ")) {
          sections.push(trimmed.substring(3).trim());
        }
      }

      return sections.length > 0
        ? sections
        : ["Ideas", "Todo", "In Progress", "Done"];
    } catch (error) {
      console.error("Error reading sections from board:", error);
      return ["Ideas", "Todo", "In Progress", "Done"];
    }
  }

  /**
   * Extract sections from the original file that saveProjectInfo doesn't handle.
   * These are preserved verbatim to prevent data loss.
   */
  extractPreservedSections(existingContent: string): string {
    const preservedMarkers = [
      "<!-- Milestones -->",
      "<!-- Ideas -->",
      "<!-- Retrospectives -->",
      "<!-- SWOT Analysis -->",
      "<!-- Risk Analysis -->",
      "<!-- Lean Canvas -->",
      "<!-- Business Model -->",
      "<!-- Project Value -->",
      "<!-- Brief -->",
      "<!-- Time Tracking -->",
      "<!-- Capacity Planning -->",
      "<!-- Strategic Levels -->",
      "<!-- Billing -->",
      "<!-- Companies -->",
      "<!-- Contacts -->",
      "<!-- Deals -->",
      "<!-- Interactions -->",
    ];

    const endMarkers = [
      "<!-- Configurations -->",
      "<!-- Notes -->",
      "<!-- Goals -->",
      "<!-- Canvas -->",
      "<!-- Mindmap -->",
      "<!-- C4 Architecture -->",
      "<!-- Board -->",
      ...preservedMarkers,
    ];

    let result = "";

    for (const marker of preservedMarkers) {
      const startIdx = existingContent.indexOf(marker);
      if (startIdx === -1) continue;

      // Find the end of this section (next marker or end of file)
      let endIdx = existingContent.length;
      for (const endMarker of endMarkers) {
        if (endMarker === marker) continue;
        const idx = existingContent.indexOf(endMarker, startIdx + marker.length);
        if (idx !== -1 && idx < endIdx) {
          endIdx = idx;
        }
      }

      const sectionContent = existingContent.substring(startIdx, endIdx).trim();
      if (sectionContent) {
        result += "\n" + sectionContent + "\n\n";
      }
    }

    return result;
  }

  async saveProjectConfig(config: ProjectConfig): Promise<boolean> {
    try {
      const content = await Deno.readTextFile(this.filePath);
      console.log("Current content length:", content.length);
      const updatedContent = this.updateProjectConfigInMarkdown(
        content,
        config,
      );
      console.log("Updated content length:", updatedContent.length);
      await this.safeWriteFile(updatedContent);
      console.log("File written successfully");
      return true;
    } catch (error) {
      console.error("Error saving project config:", error);
      return false;
    }
  }

  private updateProjectConfigInMarkdown(
    content: string,
    config: ProjectConfig,
  ): string {
    const lines = content.split("\n");
    const result: string[] = [];
    let inConfigSection = false;
    let configInserted = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim() === "# Configurations") {
        inConfigSection = true;
        result.push(line);
        result.push("");
        result.push(
          `Start Date: ${
            config.startDate || new Date().toISOString().split("T")[0]
          }`,
        );
        if (config.workingDays && config.workingDays.length > 0) {
          result.push(`Working Days: ${config.workingDays.join(", ")}`);
        } else if (config.workingDaysPerWeek && config.workingDaysPerWeek !== 5) {
          result.push(`Working Days: ${config.workingDaysPerWeek}`);
        }
        result.push("");

        if (config.assignees && config.assignees.length > 0) {
          result.push("Assignees:");
          // Deduplicate and sort assignees alphabetically
          const uniqueAssignees = [...new Set(config.assignees)].sort();
          uniqueAssignees.forEach((assignee) => {
            result.push(`- ${assignee}`);
          });
          result.push("");
        }

        if (config.tags && config.tags.length > 0) {
          result.push("Tags:");
          // Deduplicate and sort tags alphabetically
          const uniqueTags = [...new Set(config.tags)].sort();
          uniqueTags.forEach((tag) => {
            result.push(`- ${tag}`);
          });
          result.push("");
        }

        if (config.links && config.links.length > 0) {
          result.push("Links:");
          config.links.forEach((link) => {
            result.push(`- [${link.title}](${link.url})`);
          });
          result.push("");
        }

        configInserted = true;

        // Skip existing config content
        while (i + 1 < lines.length && !lines[i + 1].trim().startsWith("# ")) {
          i++;
        }
        continue;
      }

      // If we haven't found a config section and we're at the # Board section, insert config
      if (line.trim() === "# Board" && !configInserted) {
        result.push("# Configurations");
        result.push("");
        result.push(
          `Start Date: ${
            config.startDate || new Date().toISOString().split("T")[0]
          }`,
        );
        if (config.workingDays && config.workingDays.length > 0) {
          result.push(`Working Days: ${config.workingDays.join(", ")}`);
        } else if (config.workingDaysPerWeek && config.workingDaysPerWeek !== 5) {
          result.push(`Working Days: ${config.workingDaysPerWeek}`);
        }
        result.push("");

        if (config.assignees && config.assignees.length > 0) {
          result.push("Assignees:");
          // Deduplicate and sort assignees alphabetically
          const uniqueAssignees = [...new Set(config.assignees)].sort();
          uniqueAssignees.forEach((assignee) => {
            result.push(`- ${assignee}`);
          });
          result.push("");
        }

        if (config.tags && config.tags.length > 0) {
          result.push("Tags:");
          // Deduplicate and sort tags alphabetically
          const uniqueTags = [...new Set(config.tags)].sort();
          uniqueTags.forEach((tag) => {
            result.push(`- ${tag}`);
          });
          result.push("");
        }

        if (config.links && config.links.length > 0) {
          result.push("Links:");
          config.links.forEach((link) => {
            result.push(`- [${link.title}](${link.url})`);
          });
          result.push("");
        }

        result.push(line);
        configInserted = true;
        continue;
      }

      result.push(line);
    }

    return result.join("\n");
  }

  async addNote(
    note: Omit<Note, "id" | "createdAt" | "updatedAt" | "revision">,
  ): Promise<string> {
    const projectInfo = await this.readProjectInfo();
    const newNote = this.notesParser.createNote(note);

    projectInfo.notes.push(newNote);
    await this.saveProjectInfo(projectInfo);
    return newNote.id;
  }

  async updateNote(
    noteId: string,
    updates: Partial<Omit<Note, "id" | "createdAt" | "revision">>,
  ): Promise<boolean> {
    const projectInfo = await this.readProjectInfo();
    const result = this.notesParser.updateNoteInList(
      projectInfo.notes,
      noteId,
      updates,
    );

    if (!result.success) return false;

    projectInfo.notes = result.notes;
    await this.saveProjectInfo(projectInfo);
    return true;
  }

  async deleteNote(noteId: string): Promise<boolean> {
    const projectInfo = await this.readProjectInfo();
    const result = this.notesParser.deleteNoteFromList(
      projectInfo.notes,
      noteId,
    );

    if (!result.success) return false;

    projectInfo.notes = result.notes;
    await this.saveProjectInfo(projectInfo);
    return true;
  }

  async addGoal(goal: Omit<Goal, "id">): Promise<string> {
    const projectInfo = await this.readProjectInfo();
    const newGoal: Goal = {
      ...goal,
      id: this.goalsParser.generateGoalId(),
    };

    projectInfo.goals.push(newGoal);
    await this.saveProjectInfo(projectInfo);
    return newGoal.id;
  }

  async updateGoal(
    goalId: string,
    updates: Partial<Omit<Goal, "id">>,
  ): Promise<boolean> {
    const projectInfo = await this.readProjectInfo();
    const goalIndex = projectInfo.goals.findIndex((goal) => goal.id === goalId);

    if (goalIndex === -1) return false;

    projectInfo.goals[goalIndex] = {
      ...projectInfo.goals[goalIndex],
      ...updates,
    };

    await this.saveProjectInfo(projectInfo);
    return true;
  }

  async deleteGoal(goalId: string): Promise<boolean> {
    const projectInfo = await this.readProjectInfo();
    const originalLength = projectInfo.goals.length;
    projectInfo.goals = projectInfo.goals.filter((goal) => goal.id !== goalId);

    if (projectInfo.goals.length !== originalLength) {
      await this.saveProjectInfo(projectInfo);
      return true;
    }
    return false;
  }

  async saveProjectInfo(projectInfo: ProjectInfo): Promise<void> {
    const existingContent = await Deno.readTextFile(this.filePath);
    const config = this.parseProjectConfig(existingContent);
    const tasks = await this.readTasks();

    // Update lastUpdated timestamp
    config.lastUpdated = new Date().toISOString();

    // Update the content with new project info
    let content = `# ${projectInfo.name}\n`;

    // Add project description (filter out empty lines)
    const cleanDescription = projectInfo.description.filter((line) =>
      line.trim() !== ""
    );
    if (cleanDescription.length > 0) {
      content += "\n" + cleanDescription.join("\n") + "\n";
    }

    // Add configuration section
    content += "\n<!-- Configurations -->\n# Configurations\n\n";
    content += `Start Date: ${
      config.startDate || new Date().toISOString().split("T")[0]
    }\n`;
    if (config.workingDays && config.workingDays.length > 0) {
      content += `Working Days: ${config.workingDays.join(", ")}\n`;
    } else {
      content += `Working Days: ${config.workingDaysPerWeek ?? 5}\n`;
    }
    content += `Last Updated: ${config.lastUpdated}\n`;
    content += "\n";

    content += "Assignees:\n";
    // Sort assignees alphabetically
    [...(config.assignees || [])].sort().forEach((assignee) => {
      content += `- ${assignee}\n`;
    });
    content += "\n";

    content += "Tags:\n";
    // Sort tags alphabetically
    [...(config.tags || [])].sort().forEach((tag) => {
      content += `- ${tag}\n`;
    });
    content += "\n";

    if (config.links && config.links.length > 0) {
      content += "Links:\n";
      config.links.forEach((link) => {
        content += `- [${link.title}](${link.url})\n`;
      });
      content += "\n";
    }

    // Add notes section
    content += this.notesParser.notesToMarkdown(projectInfo.notes);

    // Add goals section
    content += this.goalsParser.goalsToMarkdown(projectInfo.goals);

    // Preserve sections we don't handle (Milestones, Ideas, Retrospectives, etc.)
    const preservedSections = this.extractPreservedSections(existingContent);
    if (preservedSections) {
      content += preservedSections;
    }

    // Add canvas section
    content += "<!-- Canvas -->\n# Canvas\n\n";
    for (const stickyNote of projectInfo.stickyNotes) {
      // Generate sticky note markdown - ALWAYS use "Sticky Note" as header
      const sizeStr = stickyNote.size
        ? `; size: {width: ${stickyNote.size.width}, height: ${stickyNote.size.height}}`
        : "";

      const stickyNoteLines = [
        `## Sticky note {color: ${stickyNote.color}; position: {x: ${stickyNote.position.x}, y: ${stickyNote.position.y}}${sizeStr}}`,
        "",
        `<!-- id: ${stickyNote.id} -->`,
        stickyNote.content,
        "",
      ];

      content += stickyNoteLines.join("\n");
    }

    // Add mindmap section
    content += "<!-- Mindmap -->\n# Mindmap\n\n";
    for (const mindmap of projectInfo.mindmaps) {
      content += `## ${mindmap.title}\n\n`;
      content += `<!-- id: ${mindmap.id} -->\n\n`;

      // Write mindmap nodes as nested list
      const rootNodes = mindmap.nodes.filter((node) => node.level === 0);
      for (const rootNode of rootNodes) {
        content += this.canvasParser.mindmapNodeToMarkdown(rootNode, mindmap.nodes, 0);
      }
      content += "\n";
    }

    // Add C4 Architecture section
    content += this.c4Parser.c4ComponentsToMarkdown(projectInfo.c4Components || []);

    // Add board section
    content += "<!-- Board -->\n# Board\n\n";

    // Get existing board sections (this reads from the current file structure)
    const sections = this.getSectionsFromBoard();

    for (const section of sections) {
      content += `## ${section}\n\n`;

      const sectionTasks = tasks.filter((task) =>
        task.section === section && !task.parentId
      );

      for (const task of sectionTasks) {
        content += this.taskParser.taskToMarkdown(task, 0);
      }

      content += "\n";
    }

    await this.safeWriteFile(content);
  }

  async addStickyNote(stickyNote: Omit<StickyNote, "id">): Promise<string> {
    const projectInfo = await this.readProjectInfo();
    const newStickyNote: StickyNote = {
      ...stickyNote,
      id: this.canvasParser.generateStickyNoteId(),
    };

    projectInfo.stickyNotes.push(newStickyNote);
    // Use direct file manipulation for sticky notes to avoid Canvas regeneration
    await this.canvasParser.addStickyNoteToFile(newStickyNote);
    return newStickyNote.id;
  }

  async updateStickyNote(
    stickyNoteId: string,
    updates: Partial<Omit<StickyNote, "id">>,
  ): Promise<boolean> {
    const projectInfo = await this.readProjectInfo();
    const stickyNoteIndex = projectInfo.stickyNotes.findIndex((stickyNote) =>
      stickyNote.id === stickyNoteId
    );

    if (stickyNoteIndex === -1) return false;

    projectInfo.stickyNotes[stickyNoteIndex] = {
      ...projectInfo.stickyNotes[stickyNoteIndex],
      ...updates,
    };

    // Use direct file manipulation for sticky notes to avoid Canvas regeneration
    await this.canvasParser.updateStickyNoteInFile(
      stickyNoteId,
      projectInfo.stickyNotes[stickyNoteIndex],
    );
    return true;
  }

  async deleteStickyNote(stickyNoteId: string): Promise<boolean> {
    const projectInfo = await this.readProjectInfo();
    const originalLength = projectInfo.stickyNotes.length;
    projectInfo.stickyNotes = projectInfo.stickyNotes.filter((stickyNote) =>
      stickyNote.id !== stickyNoteId
    );

    if (projectInfo.stickyNotes.length !== originalLength) {
      await this.saveProjectInfo(projectInfo);
      return true;
    }
    return false;
  }

  async addMindmap(mindmap: Omit<Mindmap, "id">): Promise<string> {
    const projectInfo = await this.readProjectInfo();
    const newMindmap: Mindmap = {
      ...mindmap,
      id: this.canvasParser.generateMindmapId(),
    };

    projectInfo.mindmaps.push(newMindmap);
    await this.saveProjectInfo(projectInfo);
    return newMindmap.id;
  }

  async updateMindmap(
    mindmapId: string,
    updates: Partial<Omit<Mindmap, "id">>,
  ): Promise<boolean> {
    const projectInfo = await this.readProjectInfo();
    const mindmapIndex = projectInfo.mindmaps.findIndex((mindmap) =>
      mindmap.id === mindmapId
    );

    if (mindmapIndex === -1) return false;

    projectInfo.mindmaps[mindmapIndex] = {
      ...projectInfo.mindmaps[mindmapIndex],
      ...updates,
    };

    await this.saveProjectInfo(projectInfo);
    return true;
  }

  async deleteMindmap(mindmapId: string): Promise<boolean> {
    const projectInfo = await this.readProjectInfo();
    const originalLength = projectInfo.mindmaps.length;
    projectInfo.mindmaps = projectInfo.mindmaps.filter((mindmap) =>
      mindmap.id !== mindmapId
    );

    if (projectInfo.mindmaps.length !== originalLength) {
      await this.saveProjectInfo(projectInfo);
      return true;
    }
    return false;
  }

  async readMilestones(): Promise<Milestone[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    // First, read from dedicated Milestones section
    const milestoneMap = this.milestonesParser.parseMilestonesSection(lines);

    // Second, extract unique milestones from tasks
    const tasks = await this.readTasks();
    this.milestonesParser.extractMilestonesFromTasks(tasks, milestoneMap);

    return Array.from(milestoneMap.values());
  }

  async saveMilestones(milestones: Milestone[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } = this.milestonesParser.findMilestonesSection(lines);
    const milestonesContent = this.milestonesParser.milestonesToMarkdown(milestones);

    if (startIndex === -1) {
      // Add before Board section
      const boardIndex = lines.findIndex(
        (l) => l.includes("<!-- Board -->") || l.startsWith("# Board"),
      );
      if (boardIndex !== -1) {
        lines.splice(boardIndex, 0, milestonesContent);
      } else {
        lines.push(milestonesContent);
      }
    } else {
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, milestonesContent, ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }

  async readIdeas(): Promise<Idea[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    return this.ideasParser.parseIdeasSection(lines);
  }

  async saveIdeas(ideas: Idea[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } = this.ideasParser.findIdeasSection(lines);
    const ideasContent = this.ideasParser.ideasToMarkdown(ideas);

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(
        (l) => l.includes("<!-- Board -->") || l.startsWith("# Board"),
      );
      if (boardIndex !== -1) {
        lines.splice(boardIndex, 0, ideasContent);
      } else {
        lines.push(ideasContent);
      }
    } else {
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, ideasContent, ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }

  async readRetrospectives(): Promise<Retrospective[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    return this.retrospectivesParser.parseRetrospectivesSection(lines);
  }

  async saveRetrospectives(retrospectives: Retrospective[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } =
      this.retrospectivesParser.findRetrospectivesSection(lines);
    const retrospectivesContent =
      this.retrospectivesParser.retrospectivesToMarkdown(retrospectives);

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(
        (l) => l.includes("<!-- Board -->") || l.startsWith("# Board"),
      );
      if (boardIndex !== -1) {
        lines.splice(boardIndex, 0, retrospectivesContent);
      } else {
        lines.push(retrospectivesContent);
      }
    } else {
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, retrospectivesContent, ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }

  async readTimeEntries(): Promise<Map<string, TimeEntry[]>> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    return this.timeTrackingParser.parseTimeTrackingSection(lines);
  }

  async saveTimeEntries(timeEntries: Map<string, TimeEntry[]>): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } =
      this.timeTrackingParser.findTimeTrackingSection(lines);
    const timeTrackingContent =
      this.timeTrackingParser.timeEntriesToMarkdown(timeEntries);

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(
        (l) => l.includes("<!-- Board -->") || l.startsWith("# Board"),
      );
      if (boardIndex !== -1) {
        lines.splice(boardIndex, 0, timeTrackingContent);
      } else {
        lines.push(timeTrackingContent);
      }
    } else {
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, timeTrackingContent, ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }

  async addTimeEntry(
    taskId: string,
    entry: Omit<TimeEntry, "id">,
  ): Promise<string> {
    const timeEntries = await this.readTimeEntries();
    const { newEntry } = this.timeTrackingParser.addTimeEntryToMap(
      timeEntries,
      taskId,
      entry,
    );
    await this.saveTimeEntries(timeEntries);
    return newEntry.id;
  }

  async deleteTimeEntry(taskId: string, entryId: string): Promise<boolean> {
    const timeEntries = await this.readTimeEntries();
    const { success } = this.timeTrackingParser.deleteTimeEntryFromMap(
      timeEntries,
      taskId,
      entryId,
    );
    if (success) {
      await this.saveTimeEntries(timeEntries);
    }
    return success;
  }

  async getTimeEntriesForTask(taskId: string): Promise<TimeEntry[]> {
    const timeEntries = await this.readTimeEntries();
    return this.timeTrackingParser.getEntriesForTask(timeEntries, taskId);
  }

  async readSwotAnalyses(): Promise<SwotAnalysis[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    return this.swotParser.parseSwotSection(lines);
  }

  async saveSwotAnalyses(swotAnalyses: SwotAnalysis[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } = this.swotParser.findSwotSection(lines);
    const swotContent = this.swotParser.swotAnalysesToMarkdown(swotAnalyses);

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(
        (l) => l.includes("<!-- Board -->") || l.startsWith("# Board"),
      );
      if (boardIndex !== -1) {
        lines.splice(boardIndex, 0, swotContent);
      } else {
        lines.push(swotContent);
      }
    } else {
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, swotContent, ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }

  async readRiskAnalyses(): Promise<RiskAnalysis[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    return this.riskParser.parseRiskSection(lines);
  }

  async saveRiskAnalyses(riskAnalyses: RiskAnalysis[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } = this.riskParser.findRiskSection(lines);
    const riskContent = this.riskParser.riskAnalysesToMarkdown(riskAnalyses);

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(l => l.includes("<!-- Board -->") || l.startsWith("# Board"));
      if (boardIndex !== -1) {
        lines.splice(boardIndex, 0, riskContent);
      } else {
        lines.push(riskContent);
      }
    } else {
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, riskContent, ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }

  async readLeanCanvases(): Promise<LeanCanvas[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    return this.leanCanvasParser.parseLeanCanvasSection(lines);
  }

  async saveLeanCanvases(leanCanvases: LeanCanvas[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } = this.leanCanvasParser.findLeanCanvasSection(lines);
    const leanContent = this.leanCanvasParser.leanCanvasesToMarkdown(leanCanvases);

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(l => l.includes("<!-- Board -->") || l.startsWith("# Board"));
      if (boardIndex !== -1) {
        lines.splice(boardIndex, 0, leanContent);
      } else {
        lines.push(leanContent);
      }
    } else {
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, leanContent, ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }

  async readBusinessModelCanvases(): Promise<BusinessModelCanvas[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    return this.businessModelParser.parseBusinessModelSection(lines);
  }

  async saveBusinessModelCanvases(canvases: BusinessModelCanvas[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } = this.businessModelParser.findBusinessModelSection(lines);
    const bmcContent = this.businessModelParser.businessModelsToMarkdown(canvases);

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(l => l.includes("<!-- Board -->") || l.startsWith("# Board"));
      if (boardIndex !== -1) {
        lines.splice(boardIndex, 0, bmcContent);
      } else {
        lines.push(bmcContent);
      }
    } else {
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, bmcContent, ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }

  async readProjectValueBoards(): Promise<ProjectValueBoard[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    return this.projectValueParser.parseProjectValueSection(lines);
  }

  async saveProjectValueBoards(boards: ProjectValueBoard[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } = this.projectValueParser.findProjectValueSection(lines);
    const pvbContent = this.projectValueParser.projectValuesToMarkdown(boards);

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(l => l.includes("<!-- Board -->") || l.startsWith("# Board"));
      if (boardIndex !== -1) {
        lines.splice(boardIndex, 0, pvbContent);
      } else {
        lines.push(pvbContent);
      }
    } else {
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, pvbContent, ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }

  async readBriefs(): Promise<Brief[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    return this.briefParser.parseBriefSection(lines);
  }

  async saveBriefs(briefs: Brief[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } = this.briefParser.findBriefSection(lines);
    const briefContent = this.briefParser.briefsToMarkdown(briefs);

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(l => l.includes("<!-- Board -->") || l.startsWith("# Board"));
      if (boardIndex !== -1) {
        lines.splice(boardIndex, 0, briefContent);
      } else {
        lines.push(briefContent);
      }
    } else {
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, briefContent, ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }

  async readCapacityPlans(): Promise<CapacityPlan[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    return this.capacityParser.parseCapacitySection(lines);
  }

  async saveCapacityPlans(plans: CapacityPlan[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } = this.capacityParser.findCapacitySection(lines);
    const capacityContent = this.capacityParser.capacityPlansToMarkdown(plans);

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(l => l.includes("<!-- Board -->") || l.trim() === "# Board");
      if (boardIndex !== -1) {
        lines.splice(boardIndex, 0, capacityContent);
      } else {
        lines.push(capacityContent);
      }
    } else {
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, capacityContent, ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }

  async readStrategicLevelsBuilders(): Promise<StrategicLevelsBuilder[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    return this.strategicParser.parseStrategicSection(lines);
  }

  async saveStrategicLevelsBuilders(builders: StrategicLevelsBuilder[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } = this.strategicParser.findStrategicSection(lines);
    const strategicContent = this.strategicParser.strategicBuildersToMarkdown(builders);

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(l => l.includes("<!-- Board -->") || l.trim() === "# Board");
      if (boardIndex !== -1) {
        lines.splice(boardIndex, 0, strategicContent);
      } else {
        lines.push(strategicContent);
      }
    } else {
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, strategicContent, ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }

  // Compute backlinks for ideas (Zettelkasten-style)
  async readIdeasWithBacklinks(): Promise<(Idea & { backlinks: string[] })[]> {
    const ideas = await this.readIdeas();
    return this.ideasParser.computeBacklinks(ideas);
  }

  // Customer Management
  async readCustomers(): Promise<Customer[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    return this.billingParser.parseCustomersSection(lines);
  }

  async saveCustomers(customers: Customer[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } = this.billingParser.findCustomersSection(lines);
    const customersContent = this.billingParser.customersToMarkdown(customers);

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(l => l.includes("<!-- Board -->") || l.startsWith("# Board"));
      if (boardIndex !== -1) {
        lines.splice(boardIndex, 0, customersContent);
      } else {
        lines.push(customersContent);
      }
    } else {
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, customersContent, ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }

  // Billing Rates
  async readBillingRates(): Promise<BillingRate[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    return this.billingParser.parseBillingRatesSection(lines);
  }

  async saveBillingRates(rates: BillingRate[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } = this.billingParser.findBillingRatesSection(lines);
    const ratesContent = this.billingParser.billingRatesToMarkdown(rates);

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(l => l.includes("<!-- Board -->") || l.startsWith("# Board"));
      if (boardIndex !== -1) {
        lines.splice(boardIndex, 0, ratesContent);
      } else {
        lines.push(ratesContent);
      }
    } else {
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, ratesContent, ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }

  // Quotes
  async readQuotes(): Promise<Quote[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    return this.billingParser.parseQuotesSection(lines);
  }

  async saveQuotes(quotes: Quote[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } = this.billingParser.findQuotesSection(lines);
    const quotesContent = this.billingParser.quotesToMarkdown(quotes);

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(l => l.includes("<!-- Board -->") || l.startsWith("# Board"));
      if (boardIndex !== -1) {
        lines.splice(boardIndex, 0, quotesContent);
      } else {
        lines.push(quotesContent);
      }
    } else {
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, quotesContent, ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }

  // Invoices
  async readInvoices(): Promise<Invoice[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    return this.billingParser.parseInvoicesSection(lines);
  }

  async saveInvoices(invoices: Invoice[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } = this.billingParser.findInvoicesSection(lines);
    const invoicesContent = this.billingParser.invoicesToMarkdown(invoices);

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(l => l.includes("<!-- Board -->") || l.startsWith("# Board"));
      if (boardIndex !== -1) {
        lines.splice(boardIndex, 0, invoicesContent);
      } else {
        lines.push(invoicesContent);
      }
    } else {
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, invoicesContent, ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }

  // Payments
  async readPayments(): Promise<Payment[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    return this.billingParser.parsePaymentsSection(lines);
  }

  async savePayments(payments: Payment[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } = this.billingParser.findPaymentsSection(lines);
    const paymentsContent = this.billingParser.paymentsToMarkdown(payments);

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(l => l.includes("<!-- Board -->") || l.startsWith("# Board"));
      if (boardIndex !== -1) {
        lines.splice(boardIndex, 0, paymentsContent);
      } else {
        lines.push(paymentsContent);
      }
    } else {
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, paymentsContent, ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }

  // Generate next quote number
  async getNextQuoteNumber(): Promise<string> {
    const quotes = await this.readQuotes();
    return this.billingParser.getNextQuoteNumber(quotes);
  }

  // Generate next invoice number
  async getNextInvoiceNumber(): Promise<string> {
    const invoices = await this.readInvoices();
    return this.billingParser.getNextInvoiceNumber(invoices);
  }

  // ============================================
  // CRM: COMPANIES
  // ============================================

  async readCompanies(): Promise<Company[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    return this.crmParser.parseCompaniesSection(lines);
  }

  async saveCompanies(companies: Company[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } = this.crmParser.findCompaniesSection(lines);
    const companiesContent = this.crmParser.companiesToMarkdown(companies);

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(l => l.includes("<!-- Board -->") || l.startsWith("# Board"));
      if (boardIndex !== -1) {
        lines.splice(boardIndex, 0, companiesContent);
      } else {
        lines.push(companiesContent);
      }
    } else {
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, companiesContent, ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }

  // ============================================
  // CRM: CONTACTS
  // ============================================

  async readContacts(): Promise<Contact[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    return this.crmParser.parseContactsSection(lines);
  }

  async saveContacts(contacts: Contact[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } = this.crmParser.findContactsSection(lines);
    const contactsContent = this.crmParser.contactsToMarkdown(contacts);

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(l => l.includes("<!-- Board -->") || l.startsWith("# Board"));
      if (boardIndex !== -1) {
        lines.splice(boardIndex, 0, contactsContent);
      } else {
        lines.push(contactsContent);
      }
    } else {
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, contactsContent, ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }

  // ============================================
  // CRM: DEALS
  // ============================================

  async readDeals(): Promise<Deal[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    return this.crmParser.parseDealsSection(lines);
  }

  async saveDeals(deals: Deal[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } = this.crmParser.findDealsSection(lines);
    const dealsContent = this.crmParser.dealsToMarkdown(deals);

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(l => l.includes("<!-- Board -->") || l.startsWith("# Board"));
      if (boardIndex !== -1) {
        lines.splice(boardIndex, 0, dealsContent);
      } else {
        lines.push(dealsContent);
      }
    } else {
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, dealsContent, ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }

  // ============================================
  // CRM: INTERACTIONS
  // ============================================

  async readInteractions(): Promise<Interaction[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    return this.crmParser.parseInteractionsSection(lines);
  }

  async saveInteractions(interactions: Interaction[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } = this.crmParser.findInteractionsSection(lines);
    const interactionsContent = this.crmParser.interactionsToMarkdown(interactions);

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(l => l.includes("<!-- Board -->") || l.startsWith("# Board"));
      if (boardIndex !== -1) {
        lines.splice(boardIndex, 0, interactionsContent);
      } else {
        lines.push(interactionsContent);
      }
    } else {
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, interactionsContent, ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }

  // ============================================
  // CRM: SUMMARY
  // ============================================

  async getCRMSummary(): Promise<{
    totalCompanies: number;
    totalContacts: number;
    totalDeals: number;
    pipelineValue: number;
    wonValue: number;
    lostValue: number;
    dealsByStage: Record<string, { count: number; value: number }>;
    recentInteractions: number;
  }> {
    const [companies, contacts, deals, interactions] = await Promise.all([
      this.readCompanies(),
      this.readContacts(),
      this.readDeals(),
      this.readInteractions(),
    ]);

    const dealsByStage: Record<string, { count: number; value: number }> = {
      lead: { count: 0, value: 0 },
      qualified: { count: 0, value: 0 },
      proposal: { count: 0, value: 0 },
      negotiation: { count: 0, value: 0 },
      won: { count: 0, value: 0 },
      lost: { count: 0, value: 0 },
    };

    let pipelineValue = 0;
    let wonValue = 0;
    let lostValue = 0;

    for (const deal of deals) {
      dealsByStage[deal.stage].count++;
      dealsByStage[deal.stage].value += deal.value;

      if (deal.stage === "won") {
        wonValue += deal.value;
      } else if (deal.stage === "lost") {
        lostValue += deal.value;
      } else {
        pipelineValue += deal.value * (deal.probability / 100);
      }
    }

    // Count recent interactions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentInteractions = interactions.filter(i => new Date(i.date) >= sevenDaysAgo).length;

    return {
      totalCompanies: companies.length,
      totalContacts: contacts.length,
      totalDeals: deals.length,
      pipelineValue,
      wonValue,
      lostValue,
      dealsByStage,
      recentInteractions,
    };
  }
}
