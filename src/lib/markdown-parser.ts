import {
  BillingRate,
  Brief,
  BusinessModelCanvas,
  C4Component,
  CapacityPlan,
  Customer,
  Goal,
  Idea,
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
  TaskConfig,
  TeamMember,
  TimeEntry,
  WeeklyAllocation,
} from "./types.ts";

export class MarkdownParser {
  public filePath: string;
  private maxBackups: number;
  private backupDir: string;
  private lastContentHash: string | null = null;
  private writeLock: Promise<void> = Promise.resolve();

  constructor(filePath: string) {
    this.filePath = filePath;
    // Default to keep 10 backups, configurable via environment variable
    this.maxBackups = parseInt(Deno.env.get("MD_PLANNER_MAX_BACKUPS") || "10");
    this.backupDir = Deno.env.get("MD_PLANNER_BACKUP_DIR") || "./backups";
  }

  /**
   * Acquires a write lock and executes the operation.
   * Ensures sequential writes to prevent race conditions.
   */
  private async withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
    // Wait for any pending write to complete
    const previousLock = this.writeLock;
    let releaseLock: () => void;
    this.writeLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    try {
      await previousLock;
      return await operation();
    } finally {
      releaseLock!();
    }
  }

  /**
   * Atomically writes content using temp file + rename pattern.
   * Prevents file corruption if process crashes during write.
   */
  private async atomicWriteFile(content: string): Promise<void> {
    const tempPath = this.filePath + ".tmp";
    await Deno.writeTextFile(tempPath, content);
    await Deno.rename(tempPath, this.filePath);
  }

  /**
   * Calculate SHA-256 hash of content
   */
  private async calculateHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Creates a backup of the current markdown file before making changes
   */
  private async createBackup(): Promise<void> {
    try {
      // Read current file content
      const content = await Deno.readTextFile(this.filePath);
      
      // Calculate hash of current content
      const currentHash = await this.calculateHash(content);
      
      // Skip backup if content hasn't changed
      if (this.lastContentHash === currentHash) {
        return;
      }
      
      // Update the last content hash
      this.lastContentHash = currentHash;

      // Ensure backup directory exists
      await Deno.mkdir(this.backupDir, { recursive: true });

      // Create timestamped backup filename
      const fileName = this.filePath.split("/").pop() || "structure.md";
      const baseName = fileName.replace(/\.md$/, "");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFileName = `${baseName}_backup_${timestamp}.md`;
      const backupPath = `${this.backupDir}/${backupFileName}`;

      // Write backup
      await Deno.writeTextFile(backupPath, content);
      console.log(`Created backup: ${backupPath}`);

      // Clean up old backups
      await this.cleanupOldBackups(baseName);
    } catch (error) {
      console.warn("Failed to create backup:", error);
      // Continue execution even if backup fails
    }
  }

  /**
   * Removes old backups, keeping only the most recent maxBackups files
   */
  private async cleanupOldBackups(baseName: string): Promise<void> {
    try {
      const backupFiles: { name: string; mtime: Date }[] = [];

      for await (const entry of Deno.readDir(this.backupDir)) {
        if (
          entry.isFile && entry.name.startsWith(`${baseName}_backup_`) &&
          entry.name.endsWith(".md")
        ) {
          const filePath = `${this.backupDir}/${entry.name}`;
          const stat = await Deno.stat(filePath);
          backupFiles.push({
            name: entry.name,
            mtime: stat.mtime || new Date(0),
          });
        }
      }

      // Sort by modification time (newest first)
      backupFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Remove old backups beyond maxBackups limit
      const filesToDelete = backupFiles.slice(this.maxBackups);
      for (const file of filesToDelete) {
        try {
          await Deno.remove(`${this.backupDir}/${file.name}`);
          console.log(`Removed old backup: ${file.name}`);
        } catch (error) {
          // Ignore file not found errors
          if ((error as Deno.errors.NotFound)?.name !== 'NotFound') {
            console.warn(`Failed to remove backup ${file.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn("Failed to cleanup old backups:", (error as Error).message);
    }
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
        inConfigSection = true;
        inNotesSection = false;
        inGoalsSection = false;
        i++;
        continue;
      }

      if (line.trim() === "<!-- Notes -->") {
        inNotesSection = true;
        inConfigSection = false;
        inGoalsSection = false;
        i++;
        continue;
      }

      if (line.trim() === "<!-- Goals -->") {
        inGoalsSection = true;
        inConfigSection = false;
        inNotesSection = false;
        inCanvasSection = false;
        inMindmapSection = false;
        i++;
        continue;
      }

      if (line.trim() === "<!-- Canvas -->") {
        inCanvasSection = true;
        inConfigSection = false;
        inNotesSection = false;
        inGoalsSection = false;
        inMindmapSection = false;
        i++;
        continue;
      }

      if (line.trim() === "<!-- Mindmap -->") {
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
        inConfigSection = true;
        inNotesSection = false;
        inGoalsSection = false;
        inCanvasSection = false;
        inMindmapSection = false;
        i++;
        continue;
      }

      if (line === "# Notes") {
        inNotesSection = true;
        inConfigSection = false;
        inGoalsSection = false;
        inCanvasSection = false;
        inMindmapSection = false;
        i++;
        continue;
      }

      if (line === "# Goals") {
        inGoalsSection = true;
        inConfigSection = false;
        inNotesSection = false;
        inCanvasSection = false;
        inMindmapSection = false;
        i++;
        continue;
      }

      if (line === "# Canvas") {
        inCanvasSection = true;
        inConfigSection = false;
        inNotesSection = false;
        inGoalsSection = false;
        inMindmapSection = false;
        i++;
        continue;
      }

      if (line === "# Mindmap") {
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
        inC4Section = true;
        inMindmapSection = false;
        inConfigSection = false;
        inNotesSection = false;
        inGoalsSection = false;
        inCanvasSection = false;
        i++;
        continue;
      }

      // Stop at Board section or other sections
      if (
        (line.startsWith("## ") ||
          (line.startsWith("# ") &&
            !["# Configurations", "# Notes", "# Goals", "# Canvas", "# Mindmap", "# C4 Architecture"]
              .includes(line))) && foundFirstHeader
      ) {
        if (inNotesSection) {
          const notesResult = this.parseNotesSection(lines, i);
          notes.push(...notesResult.notes);
          i = notesResult.nextIndex;
          inNotesSection = false;
          continue;
        }
        if (inGoalsSection) {
          const goalsResult = this.parseGoalsSection(lines, i);
          goals.push(...goalsResult.goals);
          i = goalsResult.nextIndex;
          inGoalsSection = false;
          continue;
        }
        if (inCanvasSection) {
          const canvasResult = this.parseCanvasSection(lines, i);
          stickyNotes.push(...canvasResult.stickyNotes);
          i = canvasResult.nextIndex;
          inCanvasSection = false;
          continue;
        }
        if (inMindmapSection) {
          const mindmapResult = this.parseMindmapSection(lines, i);
          mindmaps.push(...mindmapResult.mindmaps);
          i = mindmapResult.nextIndex;
          inMindmapSection = false;
          continue;
        }
        if (inC4Section) {
          const c4Result = this.parseC4ComponentsSection(lines, i);
          c4Components.push(...c4Result.components);
          i = c4Result.nextIndex;
          inC4Section = false;
          continue;
        }
        break;
      }

      // Parse notes in Notes section
      if (inNotesSection && line.startsWith("## ")) {
        const notesResult = this.parseNotesSection(lines, i);
        notes.push(...notesResult.notes);
        i = notesResult.nextIndex;
        continue;
      }

      // Parse goals in Goals section
      if (inGoalsSection && line.startsWith("## ")) {
        const goalsResult = this.parseGoalsSection(lines, i);
        goals.push(...goalsResult.goals);
        i = goalsResult.nextIndex;
        continue;
      }

      // Parse sticky notes in Canvas section
      if (inCanvasSection && line.startsWith("## ")) {
        const canvasResult = this.parseCanvasSection(lines, i);
        stickyNotes.push(...canvasResult.stickyNotes);
        i = canvasResult.nextIndex;
        continue;
      }

      // Parse mindmaps in Mindmap section
      if (inMindmapSection && line.startsWith("## ")) {
        const mindmapResult = this.parseMindmapSection(lines, i);
        mindmaps.push(...mindmapResult.mindmaps);
        i = mindmapResult.nextIndex;
        continue;
      }

      // Parse C4 components in C4 section
      if (inC4Section && line.startsWith("## ")) {
        const c4Result = this.parseC4ComponentsSection(lines, i);
        c4Components.push(...c4Result.components);
        i = c4Result.nextIndex;
        continue;
      }

      // Skip configuration section content for description
      if (
        inConfigSection || inNotesSection || inGoalsSection ||
        inCanvasSection || inMindmapSection || inC4Section
      ) {
        i++;
        continue;
      }

      // Collect description lines (skip empty lines at the start)
      if (
        foundFirstHeader && line && !inConfigSection && !inNotesSection &&
        !inGoalsSection && !inCanvasSection && !inMindmapSection && !inC4Section
      ) {
        description.push(line);
      } else if (
        foundFirstHeader && !line && description.length > 0 &&
        !inConfigSection && !inNotesSection && !inGoalsSection &&
        !inCanvasSection && !inMindmapSection && !inC4Section
      ) {
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

  private parseNotesSection(
    lines: string[],
    startIndex: number,
  ): { notes: Note[]; nextIndex: number } {
    const notes: Note[] = [];
    let i = startIndex;

    while (i < lines.length) {
      const line = lines[i].trim();

      // Stop at next major section
      if (line.startsWith("# ") && !line.startsWith("## ")) {
        break;
      }

      // Parse note tab (## Note Title)
      if (line.startsWith("## ")) {
        const title = line.substring(3).trim();
        const noteContent: string[] = [];
        i++;

        // Collect note content until next note or major section
        while (i < lines.length) {
          const contentLine = lines[i];
          const trimmedLine = contentLine.trim();

          // Break on section boundary comments
          if (
            trimmedLine.match(
              /<!-- (Board|Goals|Configurations|Notes|Canvas|Mindmap) -->/,
            )
          ) {
            break;
          }

          // Check if this is a new note (## followed by <!-- id: note_X --> within a few lines)
          if (trimmedLine.startsWith("## ")) {
            // Look ahead to see if there's an ID comment coming up
            let hasIdComment = false;
            for (
              let lookAhead = i + 1;
              lookAhead < Math.min(i + 5, lines.length);
              lookAhead++
            ) {
              if (lines[lookAhead].trim().match(/<!-- id: note_\d+ -->/)) {
                hasIdComment = true;
                break;
              }
              // If we hit another ## or section boundary, stop looking
              if (
                lines[lookAhead].trim().startsWith("##") ||
                lines[lookAhead].trim().match(
                  /<!-- (Board|Goals|Configurations|Notes|Canvas|Mindmap) -->/,
                )
              ) {
                break;
              }
            }

            // If we found an ID comment, this is a new note
            if (hasIdComment) {
              break;
            }
          }

          noteContent.push(contentLine);
          i++;
        }

        // Check for existing ID and metadata in comment format
        // Format: <!-- id: note_xxx | created: ISO | updated: ISO | rev: N -->
        let noteId = this.generateNoteId();
        let createdAt = new Date().toISOString();
        let updatedAt = new Date().toISOString();
        let revision = 1;
        let actualContent = noteContent.join("\n").trim();

        // Try new format with metadata first
        const metadataMatch = actualContent.match(
          /<!-- id: (note_\d+) \| created: ([^|]+) \| updated: ([^|]+) \| rev: (\d+) -->/
        );
        if (metadataMatch) {
          noteId = metadataMatch[1];
          createdAt = metadataMatch[2].trim();
          updatedAt = metadataMatch[3].trim();
          revision = parseInt(metadataMatch[4], 10);
          actualContent = actualContent
            .replace(/<!-- id: note_\d+ \| created: [^|]+ \| updated: [^|]+ \| rev: \d+ -->\s*/, "")
            .trim();
        } else {
          // Fall back to old format (id only)
          const idMatch = actualContent.match(/<!-- id: (note_\d+) -->/);
          if (idMatch) {
            noteId = idMatch[1];
            actualContent = actualContent.replace(/<!-- id: note_\d+ -->\s*/, "").trim();
          }
        }

        notes.push({
          id: noteId,
          title,
          content: actualContent,
          createdAt,
          updatedAt,
          revision,
        });
        continue;
      }

      i++;
    }

    return { notes, nextIndex: i };
  }

  private parseGoalsSection(
    lines: string[],
    startIndex: number,
  ): { goals: Goal[]; nextIndex: number } {
    const goals: Goal[] = [];
    let i = startIndex;

    while (i < lines.length) {
      const line = lines[i].trim();

      // Stop at next major section
      if (line.startsWith("# ") && !line.startsWith("## ")) {
        break;
      }

      // Parse goal (## Goal Title {type: enterprise; kpi: 30% revenue; start: 2024-01-01; end: 2024-12-31; status: on-track})
      if (line.startsWith("## ")) {
        const goalMatch = line.match(/^## (.+?)\s*\{(.+)\}$/);
        if (goalMatch) {
          const [, title, configStr] = goalMatch;
          const goalDescription: string[] = [];
          i++;

          // Collect goal description until next ## or # or boundary comment
          while (i < lines.length) {
            const contentLine = lines[i];
            const trimmedLine = contentLine.trim();

            // Stop at next goal, section, or boundary comment
            if (
              trimmedLine.startsWith("## ") ||
              trimmedLine.startsWith("# ") ||
              trimmedLine.match(/<!-- (Board|Goals|Configurations|Notes) -->/)
            ) {
              break;
            }

            if (trimmedLine) {
              goalDescription.push(trimmedLine);
            }
            i++;
          }

          // Check for existing ID in comment format <!-- id: goal_xxx -->
          let goalId = this.generateGoalId();
          let actualDescription = goalDescription.join("\n");

          const idMatch = actualDescription.match(/<!-- id: (goal_\d+) -->/);
          if (idMatch) {
            goalId = idMatch[1];
            // Remove the ID comment from description
            actualDescription = actualDescription.replace(
              /<!-- id: goal_\d+ -->\s*/,
              "",
            ).trim();
          }

          // Parse goal config
          const goal: Goal = {
            id: goalId,
            title,
            description: actualDescription,
            type: "project",
            kpi: "",
            startDate: "",
            endDate: "",
            status: "planning",
          };

          // Parse config string
          const configPairs = configStr.split(";");
          for (const pair of configPairs) {
            const [key, value] = pair.split(":").map((s) => s.trim());
            if (key && value) {
              switch (key) {
                case "type":
                  goal.type = value as "enterprise" | "project";
                  break;
                case "kpi":
                  goal.kpi = value;
                  break;
                case "start":
                  goal.startDate = value;
                  break;
                case "end":
                  goal.endDate = value;
                  break;
                case "status":
                  goal.status = value as Goal["status"];
                  break;
              }
            }
          }

          goals.push(goal);
          continue;
        }
      }

      i++;
    }

    return { goals, nextIndex: i };
  }

  private parseCanvasSection(
    lines: string[],
    startIndex: number,
  ): { stickyNotes: StickyNote[]; nextIndex: number } {
    const stickyNotes: StickyNote[] = [];
    let i = startIndex;

    while (i < lines.length) {
      const line = lines[i].trim();

      // Stop at next major section
      if (line.startsWith("# ") && !line.startsWith("## ")) {
        break;
      }

      // Parse sticky note (## StickyNote Content {color: yellow; position: {x: 100, y: 200}})
      if (line.startsWith("## ")) {
        let stickyNoteMatch = line.match(/^## (.+?)\s*\{(.+)\}$/);

        // If no match, look for config in the content and try to extract it
        if (!stickyNoteMatch) {
          // Try to find config pattern anywhere in the line
          const configMatch = line.match(/^## (.+?)\s*(.*)$/);
          if (configMatch) {
            const [, title, rest] = configMatch;
            // Look for configuration in the collected content later
            stickyNoteMatch = [line, title, ""]; // We'll parse config from content
          }
        }

        if (stickyNoteMatch) {
          const [, headerContent, configStr] = stickyNoteMatch;
          i++;

          // Check for existing ID in comment format <!-- id: sticky_note_xxx -->
          let stickyNoteId = this.generateStickyNoteId();
          let bodyContent = "";

          // Look for ID comment first
          while (i < lines.length) {
            const currentLine = lines[i].trim();

            // Check for ID comment
            const idMatch = currentLine.match(/<!-- id: (sticky_note_\d+) -->/);
            if (idMatch) {
              stickyNoteId = idMatch[1];
              i++; // Move past the ID comment
              break;
            }

            // Stop if we hit another sticky note or section
            if (
              currentLine.startsWith("## ") || currentLine.startsWith("# ") ||
              currentLine.startsWith("<!--")
            ) {
              break;
            }

            i++;
          }

          // Collect content after ID comment until next section
          let extractedConfig = "";
          while (i < lines.length) {
            const currentLine = lines[i].trim();

            // Stop if we hit another sticky note or section
            if (
              currentLine.startsWith("## ") || currentLine.startsWith("# ") ||
              currentLine.startsWith("<!--")
            ) {
              break;
            }

            // Check if this line contains configuration pattern
            const configInContentMatch = lines[i].match(
              /^(.+?)\s*\{(.+)\}\s*$/,
            );
            if (configInContentMatch && !extractedConfig) {
              // Extract config and clean content
              const [, cleanContent, foundConfig] = configInContentMatch;
              extractedConfig = foundConfig;
              if (cleanContent.trim()) {
                bodyContent += (bodyContent ? "\n" : "") +
                  cleanContent.trim();
              }
            } else {
              // Collect content (preserve original spacing)
              bodyContent += (bodyContent ? "\n" : "") + lines[i];
            }
            i++;
          }

          // Use extracted config if we didn't have one in the header
          const finalConfigStr = configStr || extractedConfig;

          // ALL sticky notes now use "Sticky Note" header, content is always in body
          const finalContent = bodyContent.trim() || headerContent;

          const stickyNote: StickyNote = {
            id: stickyNoteId,
            content: finalContent,
            color: "yellow",
            position: { x: 0, y: 0 },
          };

          // Parse config string - handle nested braces properly
          const configPairs = this.parseConfigString(finalConfigStr);
          for (const [key, value] of configPairs) {
            if (key && value) {
              switch (key) {
                case "color":
                  stickyNote.color = value as StickyNote["color"];
                  break;
                case "position":
                  try {
                    const posMatch = value.match(
                      /\{\s*x:\s*(\d+),\s*y:\s*(\d+)\s*\}/,
                    );
                    if (posMatch) {
                      stickyNote.position = {
                        x: parseInt(posMatch[1]),
                        y: parseInt(posMatch[2]),
                      };
                    }
                  } catch (e) {
                    console.error("Error parsing position:", e);
                  }
                  break;
                case "size":
                  try {
                    const sizeMatch = value.match(
                      /\{\s*width:\s*(\d+),\s*height:\s*(\d+)\s*\}/,
                    );
                    if (sizeMatch) {
                      stickyNote.size = {
                        width: parseInt(sizeMatch[1]),
                        height: parseInt(sizeMatch[2]),
                      };
                    }
                  } catch (e) {
                    console.error("Error parsing size:", e);
                  }
                  break;
              }
            }
          }

          stickyNotes.push(stickyNote);
          continue;
        }
      }

      i++;
    }

    return { stickyNotes, nextIndex: i };
  }

  private parseMindmapSection(
    lines: string[],
    startIndex: number,
  ): { mindmaps: Mindmap[]; nextIndex: number } {
    const mindmaps: Mindmap[] = [];
    let i = startIndex;

    while (i < lines.length) {
      const line = lines[i].trim();

      // Stop at next major section
      if (line.startsWith("# ") && !line.startsWith("## ")) {
        break;
      }

      // Parse mindmap title (## Mindmap Title)
      if (line.startsWith("## ")) {
        const title = line.substring(3).trim();
        i++;

        // Check for existing ID in comment format <!-- id: mindmap_xxx -->
        let mindmapId = this.generateMindmapId();

        // Look for ID comment in next few lines
        for (
          let lookAhead = i;
          lookAhead < Math.min(i + 3, lines.length);
          lookAhead++
        ) {
          const idMatch = lines[lookAhead].trim().match(
            /<!-- id: (mindmap_\d+) -->/,
          );
          if (idMatch) {
            mindmapId = idMatch[1];
            break;
          }
        }

        const nodes: MindmapNode[] = [];

        // Parse the ul>li structure
        while (i < lines.length) {
          const contentLine = lines[i];
          const trimmedLine = contentLine.trim();

          // Stop at next mindmap, section, or boundary comment
          if (
            trimmedLine.startsWith("## ") ||
            trimmedLine.startsWith("# ") ||
            trimmedLine.match(
              /<!-- (Board|Goals|Configurations|Notes|Canvas|Mindmap) -->/,
            )
          ) {
            break;
          }

          // Parse list items
          if (trimmedLine.match(/^[-*+]\s+/)) {
            const level =
              (contentLine.length - contentLine.trimStart().length) / 2; // Assuming 2 spaces per level
            const text = trimmedLine.replace(/^[-*+]\s+/, "");

            if (text) {
              const node: MindmapNode = {
                id: `${mindmapId}_node_${nodes.length + 1}`,
                text,
                level,
                children: [],
              };

              // Find parent based on level
              if (level > 0) {
                for (let j = nodes.length - 1; j >= 0; j--) {
                  if (nodes[j].level === level - 1) {
                    node.parent = nodes[j].id;
                    nodes[j].children.push(node);
                    break;
                  }
                }
              }

              nodes.push(node);
            }
          }

          i++;
        }

        mindmaps.push({
          id: mindmapId,
          title,
          nodes,
        });
        continue;
      }

      i++;
    }

    return { mindmaps, nextIndex: i };
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
        const result = this.parseTask(lines, i, currentSection);
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

  private parseTask(
    lines: string[],
    startIndex: number,
    section: string,
  ): { task: Task | null; nextIndex: number } {
    const line = lines[startIndex];
    let i = startIndex + 1;

    // Extract task info from line
    const taskMatch = line.match(
      /^(\s*)- \[([ x])\] (?:\(([^)]+)\))?\s*(.+?)(?:\s*\{([^}]+)\})?$/,
    );
    if (!taskMatch) {
      return { task: null, nextIndex: i };
    }

    const [, indent, completedChar, id, title, configStr] = taskMatch;
    const completed = completedChar === "x";
    const indentLevel = indent.length;

    // Parse config
    const config: TaskConfig = {};
    if (configStr) {
      const configPairs = configStr.split(";");
      for (const pair of configPairs) {
        const [key, value] = pair.split(":").map((s) => s.trim());
        if (key && value) {
          switch (key) {
            case "tag":
              config.tag = value.replace(/[\[\]]/g, "").split(",").map((t) =>
                t.trim()
              );
              break;
            case "due_date":
              config.due_date = value;
              break;
            case "assignee":
              config.assignee = value;
              break;
            case "priority":
              config.priority = parseInt(value);
              break;
            case "effort":
              config.effort = parseInt(value);
              break;
            case "blocked_by":
              config.blocked_by = value.replace(/[\[\]]/g, "").split(",").map(
                (t) => t.trim(),
              ).filter((t) => t);
              break;
            case "milestone":
              config.milestone = value;
              break;
            case "planned_start":
              config.planned_start = value;
              break;
            case "planned_end":
              config.planned_end = value;
              break;
          }
        }
      }
    }

    const task: Task = {
      id: id || this.generateNextTaskId(),
      title,
      completed,
      section,
      config,
      description: [],
      children: [],
    };

    // Parse description and children
    while (i < lines.length) {
      const nextLine = lines[i];
      const nextIndent = nextLine.length - nextLine.trimStart().length;

      // If we hit a line with same or less indentation that's not a continuation, we're done
      if (nextLine.trim() && nextIndent <= indentLevel) {
        break;
      }

      // If it's a subtask
      if (nextLine.match(/^\s*- \[([ x])\]/)) {
        const childResult = this.parseTask(lines, i, section);
        if (childResult.task) {
          childResult.task.parentId = task.id;
          task.children!.push(childResult.task);
        }
        i = childResult.nextIndex;
        continue;
      }

      // If it's description
      if (nextLine.trim() && !nextLine.match(/^\s*- \[([ x])\]/)) {
        task.description!.push(nextLine.trim());
      }

      i++;
    }

    return { task, nextIndex: i };
  }

  async writeTasks(tasks: Task[], customSections?: string[]): Promise<void> {
    const existingContent = await Deno.readTextFile(this.filePath);
    const config = this.parseProjectConfig(existingContent);
    const projectInfo = this.parseProjectInfo(existingContent);

    // Update lastUpdated timestamp
    config.lastUpdated = new Date().toISOString();

    let content = `# ${projectInfo.name}\n\n`;

    // Add project description
    if (projectInfo.description && projectInfo.description.length > 0) {
      content += projectInfo.description.join("\n") + "\n\n";
    } else {
      content +=
        "this is a project to track task management using markdown and configurable using `{}`\n\n";
      content += "the configurations:\n\n";
      content += "**tag**: string[]\n";
      content += "**due_date**: Date/Time\n";
      content += "**assignee**: string\n";
      content += "**priority**: 1-5 (High to Low)\n";
      content +=
        "**Effort**: int (number of estimated days to complete the tasks)\n";
      content += "**blocked_by**: taskId[] (so string[])\n";
      content += "**(string)** : is the task id\n";
      content += "**[ ]:** mark a task as completed\n";
      content +=
        "**Children items without [] and (string)**: it is a multiline description of the parent item\n\n\n";
    }

    content = content.trim();

    // Add configuration section
    content += "\n<!-- Configurations -->\n# Configurations\n\n";
    content += `Start Date: ${
      config.startDate || new Date().toISOString().split("T")[0]
    }\n`;
    if (config.workingDaysPerWeek && config.workingDaysPerWeek !== 5) {
      content += `Working Days: ${config.workingDaysPerWeek}\n`;
    }
    content += `Last Updated: ${config.lastUpdated}\n`;
    content += "\n";

    if (config.assignees && config.assignees.length > 0) {
      content += "Assignees:\n";
      // Sort assignees alphabetically
      [...config.assignees].sort().forEach((assignee) => {
        content += `- ${assignee}\n`;
      });
      content += "\n";
    }

    if (config.tags && config.tags.length > 0) {
      content += "Tags:\n";
      // Sort tags alphabetically
      [...config.tags].sort().forEach((tag) => {
        content += `- ${tag}\n`;
      });
      content += "\n";
    }

    if (config.links && config.links.length > 0) {
      content += "Links:\n";
      config.links.forEach((link) => {
        content += `- [${link.title}](${link.url})\n`;
      });
      content += "\n";
    }

    // Add notes section
    content += "<!-- Notes -->\n# Notes\n\n";
    for (const note of projectInfo.notes) {
      content += `## ${note.title}\n\n`;
      content += `<!-- id: ${note.id} | created: ${note.createdAt} | updated: ${note.updatedAt} | rev: ${note.revision || 1} -->\n`;
      content += `${note.content}\n\n`;
    }

    // Add goals section
    content += "<!-- Goals -->\n# Goals\n\n";
    for (const goal of projectInfo.goals) {
      content +=
        `## ${goal.title} {type: ${goal.type}; kpi: ${goal.kpi}; start: ${goal.startDate}; end: ${goal.endDate}; status: ${goal.status}}\n\n`;
      content += `<!-- id: ${goal.id} -->\n`;
      if (goal.description) {
        const line = goal.description.substring(
          0,
          goal.description.indexOf("<!--"),
        );
        content += `${line}\n\n`;
      }
    }

    // Add canvas section
    content += "<!-- Canvas -->\n# Canvas\n\n";
    for (const stickyNote of projectInfo.stickyNotes) {
      // Generate sticky note markdown - ALWAYS use "Sticky Note" as header
      const stickyNoteLines = [
        `## Sticky note {color: ${stickyNote.color}; position: {x: ${stickyNote.position.x}, y: ${stickyNote.position.y}}; size: {width: ${
          stickyNote.size?.width || 0
        }, height: ${stickyNote.size?.height || 0}}}`,
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
        content += this.mindmapNodeToMarkdown(rootNode, mindmap.nodes, 0);
      }
      content += "\n";
    }

    // Add C4 Architecture section
    content += "<!-- C4 Architecture -->\n# C4 Architecture\n\n";
    for (const component of projectInfo.c4Components || []) {
      content += `## ${component.name} {level: ${component.level}; type: ${component.type}`;
      if (component.technology) {
        content += `; technology: ${component.technology}`;
      }
      content += `; position: {x: ${component.position.x}, y: ${component.position.y}}`;
      if (component.connections && component.connections.length > 0) {
        content += `; connections: [${component.connections.map(c => `{target: ${c.target}, label: ${c.label}}`).join(', ')}]`;
      }
      if (component.children && component.children.length > 0) {
        content += `; children: [${component.children.join(', ')}]`;
      }
      if (component.parent) {
        content += `; parent: ${component.parent}`;
      }
      content += "}\n\n";
      content += `<!-- id: ${component.id} -->\n`;
      content += `${component.description}\n\n`;
    }

    content += "<!-- Board -->\n# Board\n\n";

    // Use custom sections if provided, otherwise get from board
    const sections = customSections || this.getSectionsFromBoard();

    for (const section of sections) {
      content += `## ${section}\n\n`;

      const sectionTasks = tasks.filter((task) =>
        task.section === section && !task.parentId
      );

      for (const task of sectionTasks) {
        content += this.taskToMarkdown(task, 0);
      }

      content += "\n";
    }

    await this.safeWriteFile(content);
  }

  private taskToMarkdown(task: Task, indentLevel: number): string {
    const indent = "  ".repeat(indentLevel);
    const checkbox = task.completed ? "[x]" : "[ ]";
    const idPart = task.id ? ` (${task.id})` : "";

    let configStr = "";
    if (Object.keys(task.config).length > 0) {
      const configParts: string[] = [];
      if (task.config.tag) {
        configParts.push(`tag: [${task.config.tag.join(", ")}]`);
      }
      if (task.config.due_date) {
        configParts.push(`due_date: ${task.config.due_date}`);
      }
      if (task.config.assignee) {
        configParts.push(`assignee: ${task.config.assignee}`);
      }
      if (task.config.priority) {
        configParts.push(`priority: ${task.config.priority}`);
      }
      if (task.config.effort) configParts.push(`effort: ${task.config.effort}`);
      if (task.config.blocked_by && task.config.blocked_by.length > 0) {
        configParts.push(`blocked_by: [${task.config.blocked_by.join(", ")}]`);
      }
      if (task.config.milestone) {
        configParts.push(`milestone: ${task.config.milestone}`);
      }
      if (task.config.planned_start) {
        configParts.push(`planned_start: ${task.config.planned_start}`);
      }
      if (task.config.planned_end) {
        configParts.push(`planned_end: ${task.config.planned_end}`);
      }
      if (configParts.length > 0) {
        configStr = ` {${configParts.join("; ")}}`;
      }
    }

    let result = `${indent}- ${checkbox}${idPart} ${task.title}${configStr}\n`;

    // Add description
    if (task.description && task.description.length > 0) {
      for (const desc of task.description) {
        result += `${indent}  ${desc}\n`;
      }
    }

    // Add children
    if (task.children && task.children.length > 0) {
      for (const child of task.children) {
        result += this.taskToMarkdown(child, indentLevel + 1);
      }
    }

    return result;
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<boolean> {
    const tasks = await this.readTasks();
    const updatedTasks = this.updateTaskInList(tasks, taskId, updates);
    if (updatedTasks) {
      await this.writeTasks(updatedTasks);
      return true;
    }
    return false;
  }

  private updateTaskInList(
    tasks: Task[],
    taskId: string,
    updates: Partial<Task>,
  ): Task[] | null {
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].id === taskId) {
        // Preserve children and other important properties that shouldn't be overwritten
        const preservedChildren = tasks[i].children;
        const preservedParentId = tasks[i].parentId;

        tasks[i] = {
          ...tasks[i],
          ...updates,
          // Always preserve these properties unless explicitly being updated
          children: updates.children !== undefined
            ? updates.children
            : preservedChildren,
          parentId: updates.parentId !== undefined
            ? updates.parentId
            : preservedParentId,
        };
        return tasks;
      }
      if (tasks[i].children && tasks[i].children!.length > 0) {
        const updatedChildren = this.updateTaskInList(
          tasks[i].children!,
          taskId,
          updates,
        );
        if (updatedChildren) {
          tasks[i].children = updatedChildren;
          return tasks;
        }
      }
    }
    return null;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const tasks = await this.readTasks();
    const filteredTasks = this.deleteTaskFromList(tasks, taskId);
    if (
      filteredTasks.length !== tasks.length ||
      this.hasDeletedChild(tasks, filteredTasks)
    ) {
      await this.writeTasks(filteredTasks);
      return true;
    }
    return false;
  }

  private deleteTaskFromList(tasks: Task[], taskId: string): Task[] {
    return tasks.filter((task) => {
      if (task.id === taskId) return false;
      if (task.children && task.children.length > 0) {
        task.children = this.deleteTaskFromList(task.children, taskId);
      }
      return true;
    });
  }

  private hasDeletedChild(original: Task[], filtered: Task[]): boolean {
    for (let i = 0; i < original.length; i++) {
      if (original[i].children && filtered[i].children) {
        if (original[i].children!.length !== filtered[i].children!.length) {
          return true;
        }
        if (
          this.hasDeletedChild(original[i].children!, filtered[i].children!)
        ) return true;
      }
    }
    return false;
  }

  async addTask(task: Omit<Task, "id">): Promise<string> {
    const tasks = await this.readTasks();
    const newTask: Task = {
      ...task,
      id: this.generateNextTaskId(),
    };

    if (task.parentId) {
      this.addChildTask(tasks, task.parentId, newTask);
    } else {
      tasks.push(newTask);
    }

    await this.writeTasks(tasks);
    return newTask.id;
  }

  private addChildTask(
    tasks: Task[],
    parentId: string,
    childTask: Task,
  ): boolean {
    for (const task of tasks) {
      if (task.id === parentId) {
        if (!task.children) task.children = [];
        task.children.push(childTask);
        return true;
      }
      if (
        task.children && this.addChildTask(task.children, parentId, childTask)
      ) {
        return true;
      }
    }
    return false;
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
    try {
      const content = Deno.readTextFileSync(this.filePath);
      const lines = content.split("\n");
      let maxId = 0;

      // Find all task IDs and get the highest number
      for (const line of lines) {
        const taskMatch = line.match(/^(\s*)- \[([ x])\] \(([^)]+)\)/);
        if (taskMatch) {
          const taskId = taskMatch[3];
          const numericId = parseInt(taskId);
          if (!isNaN(numericId) && numericId > maxId) {
            maxId = numericId;
          }
        }
      }

      return (maxId + 1).toString();
    } catch (error) {
      console.error("Error generating next task ID:", error);
      return "1";
    }
  }

  generateNoteId(): string {
    try {
      const content = Deno.readTextFileSync(this.filePath);
      const noteIdMatches = content.match(/<!-- id: note_(\d+) -->/g) || [];
      const maxId = Math.max(
        0,
        ...noteIdMatches.map((match) => {
          const idMatch = match.match(/note_(\d+)/);
          return idMatch ? parseInt(idMatch[1]) : 0;
        }),
      );
      return `note_${maxId + 1}`;
    } catch {
      return "note_1";
    }
  }

  generateGoalId(): string {
    try {
      const content = Deno.readTextFileSync(this.filePath);
      const goalIdMatches = content.match(/<!-- id: goal_(\d+) -->/g) || [];
      const maxId = Math.max(
        0,
        ...goalIdMatches.map((match) => {
          const idMatch = match.match(/goal_(\d+)/);
          return idMatch ? parseInt(idMatch[1]) : 0;
        }),
      );
      return `goal_${maxId + 1}`;
    } catch {
      return "goal_1";
    }
  }

  generateStickyNoteId(): string {
    try {
      const content = Deno.readTextFileSync(this.filePath);
      const stickyNoteIdMatches =
        content.match(/<!-- id: sticky_note_(\d+) -->/g) || [];
      const maxId = Math.max(
        0,
        ...stickyNoteIdMatches.map((match) => {
          const idMatch = match.match(/sticky_note_(\d+)/);
          return idMatch ? parseInt(idMatch[1]) : 0;
        }),
      );
      return `sticky_note_${maxId + 1}`;
    } catch {
      return "sticky_note_1";
    }
  }

  generateMindmapId(): string {
    try {
      const content = Deno.readTextFileSync(this.filePath);
      const mindmapIdMatches = content.match(/<!-- id: mindmap_(\d+) -->/g) ||
        [];
      const maxId = Math.max(
        0,
        ...mindmapIdMatches.map((match) => {
          const idMatch = match.match(/mindmap_(\d+)/);
          return idMatch ? parseInt(idMatch[1]) : 0;
        }),
      );
      return `mindmap_${maxId + 1}`;
    } catch {
      return "mindmap_1";
    }
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
    const newNote: Note = {
      ...note,
      id: this.generateNoteId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revision: 1,
    };

    projectInfo.notes.push(newNote);
    await this.saveProjectInfo(projectInfo);
    return newNote.id;
  }

  async updateNote(
    noteId: string,
    updates: Partial<Omit<Note, "id" | "createdAt" | "revision">>,
  ): Promise<boolean> {
    const projectInfo = await this.readProjectInfo();
    const noteIndex = projectInfo.notes.findIndex((note) => note.id === noteId);

    if (noteIndex === -1) return false;

    const currentNote = projectInfo.notes[noteIndex];
    projectInfo.notes[noteIndex] = {
      ...currentNote,
      ...updates,
      updatedAt: new Date().toISOString(),
      revision: (currentNote.revision || 1) + 1,
    };

    await this.saveProjectInfo(projectInfo);
    return true;
  }

  async deleteNote(noteId: string): Promise<boolean> {
    const projectInfo = await this.readProjectInfo();
    const originalLength = projectInfo.notes.length;
    projectInfo.notes = projectInfo.notes.filter((note) => note.id !== noteId);

    if (projectInfo.notes.length !== originalLength) {
      await this.saveProjectInfo(projectInfo);
      return true;
    }
    return false;
  }

  async addGoal(goal: Omit<Goal, "id">): Promise<string> {
    const projectInfo = await this.readProjectInfo();
    const newGoal: Goal = {
      ...goal,
      id: this.generateGoalId(),
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

  private async addStickyNoteToFile(stickyNote: StickyNote): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    // Find Canvas section
    let canvasIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === "<!-- Canvas -->") {
        canvasIndex = i;
        break;
      }
    }

    if (canvasIndex === -1) {
      // No Canvas section, add one at the end before Board
      let boardIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === "<!-- Board -->") {
          boardIndex = i;
          break;
        }
      }

      if (boardIndex === -1) {
        // No Board section, add at end
        lines.push("", "<!-- Canvas -->", "# Canvas", "");
        canvasIndex = lines.length - 4;
      } else {
        // Insert before Board
        lines.splice(boardIndex, 0, "<!-- Canvas -->", "# Canvas", "", "");
        canvasIndex = boardIndex;
      }
    }

    // Find end of Canvas section to insert new sticky note
    let insertIndex = canvasIndex + 2; // Skip "<!-- Canvas -->" and "# Canvas"
    for (let i = insertIndex; i < lines.length; i++) {
      if (lines[i].trim().startsWith("<!--") && !lines[i].includes("id:")) {
        insertIndex = i;
        break;
      }
    }

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

    lines.splice(insertIndex, 0, ...stickyNoteLines);
    await this.safeWriteFile(lines.join("\n"));
  }

  private async updateStickyNoteInFile(
    stickyNoteId: string,
    stickyNote: StickyNote,
  ): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    // Find the sticky note by ID
    let stickyNoteStart = -1;
    let stickyNoteEnd = -1;

    for (let i = 0; i < lines.length; i++) {
      const idMatch = lines[i].trim().match(/<!-- id: (sticky_note_\d+) -->/);
      if (idMatch && idMatch[1] === stickyNoteId) {
        // Found the ID comment, now find the header
        for (let j = i - 1; j >= 0; j--) {
          if (lines[j].trim().startsWith("## ") && lines[j].includes("{")) {
            stickyNoteStart = j;
            break;
          }
        }

        // Find end of this sticky note (next sticky note or section)
        for (let j = i + 1; j < lines.length; j++) {
          if (
            lines[j].trim().startsWith("## ") ||
            lines[j].trim().startsWith("<!--")
          ) {
            stickyNoteEnd = j;
            break;
          }
        }
        if (stickyNoteEnd === -1) stickyNoteEnd = lines.length;
        break;
      }
    }

    if (stickyNoteStart === -1) return; // Sticky note not found

    // Generate new sticky note markdown - ALWAYS use "Sticky Note" as header
    const sizeStr = stickyNote.size
      ? `; size: {width: ${stickyNote.size.width}, height: ${stickyNote.size.height}}`
      : "";

    const newStickyNoteLines = [
      `## Sticky note {color: ${stickyNote.color}; position: {x: ${stickyNote.position.x}, y: ${stickyNote.position.y}}${sizeStr}}`,
      "",
      `<!-- id: ${stickyNote.id} -->`,
      stickyNote.content,
      "",
    ];

    // Replace the old sticky note with the new one
    lines.splice(
      stickyNoteStart,
      stickyNoteEnd - stickyNoteStart,
      ...newStickyNoteLines,
    );
    await this.safeWriteFile(lines.join("\n"));
  }

  private mindmapNodeToMarkdown(
    node: MindmapNode,
    allNodes: MindmapNode[],
    level: number,
  ): string {
    const indent = "  ".repeat(level);
    let result = `${indent}- ${node.text}\n`;

    // Add children
    for (const child of node.children) {
      result += this.mindmapNodeToMarkdown(child, allNodes, level + 1);
    }

    return result;
  }

  private parseC4ComponentsSection(
    lines: string[],
    startIndex: number,
  ): { components: C4Component[]; nextIndex: number } {
    const components: C4Component[] = [];
    let i = startIndex;

    while (i < lines.length) {
      const line = lines[i].trim();

      // Stop at next major section
      if (line.startsWith("# ") && !line.startsWith("## ")) {
        break;
      }

      // Parse component (## Component Name {level: context; type: system; ...})
      if (line.startsWith("## ")) {
        const componentMatch = line.match(/^## (.+?)\s*\{(.+)\}$/);
        if (componentMatch) {
          const [, name, configStr] = componentMatch;
          const componentDescription: string[] = [];
          i++;

          // Collect component description until next ## or # or boundary comment
          while (i < lines.length) {
            const contentLine = lines[i];
            const trimmedLine = contentLine.trim();

            // Stop at next component, section, or boundary comment
            if (
              trimmedLine.startsWith("## ") ||
              trimmedLine.startsWith("# ") ||
              trimmedLine.match(/<!-- (Board|Goals|Configurations|Notes|Canvas|Mindmap|C4 Architecture) -->/)
            ) {
              break;
            }

            if (trimmedLine) {
              componentDescription.push(trimmedLine);
            }
            i++;
          }

          // Check for existing ID in comment format <!-- id: c4_component_xxx -->
          let componentId = this.generateC4ComponentId(components);
          let actualDescription = componentDescription.join("\n");

          const idMatch = actualDescription.match(/<!-- id: (c4_component_\d+) -->/);
          if (idMatch) {
            componentId = idMatch[1];
          }
          // Remove all ID comments from description (both new and old formats)
          actualDescription = actualDescription
            .replace(/<!-- id: c4_component_\d+ -->\s*/g, "")
            .replace(/<!-- id: \d+ -->\s*/g, "")
            .trim();

          // Parse component config
          const component: C4Component = {
            id: componentId,
            name,
            level: "context",
            type: "",
            description: actualDescription,
            position: { x: 0, y: 0 },
          };

          // Parse config string
          const configPairs = this.parseConfigString(configStr);
          for (const [key, value] of configPairs) {
            if (key && value) {
              switch (key) {
                case "level":
                  component.level = value as C4Component["level"];
                  break;
                case "type":
                  component.type = value;
                  break;
                case "technology":
                  component.technology = value;
                  break;
                case "position":
                  try {
                    const posMatch = value.match(
                      /\{\s*x:\s*([+-]?\d+),\s*y:\s*([+-]?\d+)\s*\}/,
                    );
                    if (posMatch) {
                      component.position = {
                        x: parseInt(posMatch[1]),
                        y: parseInt(posMatch[2]),
                      };
                    }
                  } catch (e) {
                    console.error("Error parsing position:", e);
                  }
                  break;
                case "connections":
                  try {
                    // Parse array of connections: [{target: name, label: label}, ...]
                    const connectionsMatch = value.match(/\[(.+)\]/);
                    if (connectionsMatch) {
                      const connectionsStr = connectionsMatch[1];
                      const connections: { target: string; label: string }[] = [];
                      // Simple parsing for now - can be improved
                      const connectionParts = connectionsStr.split(/\},\s*\{/);
                      for (const part of connectionParts) {
                        const cleanPart = part.replace(/[{}]/g, '');
                        const targetMatch = cleanPart.match(/target:\s*([^,]+)/);
                        const labelMatch = cleanPart.match(/label:\s*(.+)/);
                        if (targetMatch && labelMatch) {
                          connections.push({
                            target: targetMatch[1].trim(),
                            label: labelMatch[1].trim()
                          });
                        }
                      }
                      component.connections = connections;
                    }
                  } catch (e) {
                    console.error("Error parsing connections:", e);
                  }
                  break;
                case "children":
                  try {
                    const childrenMatch = value.match(/\[(.+)\]/);
                    if (childrenMatch) {
                      component.children = childrenMatch[1].split(',').map(c => c.trim());
                    }
                  } catch (e) {
                    console.error("Error parsing children:", e);
                  }
                  break;
                case "parent":
                  component.parent = value;
                  break;
              }
            }
          }

          components.push(component);
          continue;
        }
      }

      i++;
    }

    return { components, nextIndex: i };
  }

  generateC4ComponentId(existingComponents: C4Component[] = []): string {
    // Find max ID from existing components without needing to read file
    let maxId = 0;
    existingComponents.forEach((comp) => {
      const match = comp.id.match(/c4_component_(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) {
          maxId = num;
        }
      }
    });
    return `c4_component_${maxId + 1}`;
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
    content += "<!-- Notes -->\n# Notes\n\n";
    for (const note of projectInfo.notes) {
      content += `## ${note.title}\n\n`;
      content += `<!-- id: ${note.id} | created: ${note.createdAt} | updated: ${note.updatedAt} | rev: ${note.revision || 1} -->\n`;
      if (note.content && note.content.trim()) {
        content += `${note.content}\n\n`;
      } else {
        content += `\n`;
      }
    }

    // Add goals section
    content += "<!-- Goals -->\n# Goals\n\n";
    for (const goal of projectInfo.goals) {
      content +=
        `## ${goal.title} {type: ${goal.type}; kpi: ${goal.kpi}; start: ${goal.startDate}; end: ${goal.endDate}; status: ${goal.status}}\n\n`;
      content += `<!-- id: ${goal.id} -->\n`;
      if (goal.description && goal.description.trim()) {
        const line = goal.description.substring(
          0,
          goal.description.indexOf("<!--"),
        );
        content += `${line}\n\n`;
      } else {
        content += `\n`;
      }
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
        content += this.mindmapNodeToMarkdown(rootNode, mindmap.nodes, 0);
      }
      content += "\n";
    }

    // Add C4 Architecture section
    content += "<!-- C4 Architecture -->\n# C4 Architecture\n\n";
    for (const component of projectInfo.c4Components || []) {
      content += `## ${component.name} {level: ${component.level}; type: ${component.type}`;
      if (component.technology) {
        content += `; technology: ${component.technology}`;
      }
      content += `; position: {x: ${component.position.x}, y: ${component.position.y}}`;
      if (component.connections && component.connections.length > 0) {
        content += `; connections: [${component.connections.map(c => `{target: ${c.target}, label: ${c.label}}`).join(', ')}]`;
      }
      if (component.children && component.children.length > 0) {
        content += `; children: [${component.children.join(', ')}]`;
      }
      if (component.parent) {
        content += `; parent: ${component.parent}`;
      }
      content += "}\n\n";
      content += `<!-- id: ${component.id} -->\n`;
      content += `${component.description}\n\n`;
    }

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
        content += this.taskToMarkdown(task, 0);
      }

      content += "\n";
    }

    await this.safeWriteFile(content);
  }

  async addStickyNote(stickyNote: Omit<StickyNote, "id">): Promise<string> {
    const projectInfo = await this.readProjectInfo();
    const newStickyNote: StickyNote = {
      ...stickyNote,
      id: this.generateStickyNoteId(),
    };

    projectInfo.stickyNotes.push(newStickyNote);
    // Use direct file manipulation for sticky notes to avoid Canvas regeneration
    await this.addStickyNoteToFile(newStickyNote);
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
    await this.updateStickyNoteInFile(
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
      id: this.generateMindmapId(),
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

  private parseConfigString(configStr: string): Array<[string, string]> {
    const pairs: Array<[string, string]> = [];
    let i = 0;

    while (i < configStr.length) {
      // Find the key (everything before the first ':')
      let keyEnd = configStr.indexOf(":", i);
      if (keyEnd === -1) break;

      const key = configStr.substring(i, keyEnd).trim();
      i = keyEnd + 1;

      // Skip whitespace after ':'
      while (i < configStr.length && configStr[i] === " ") i++;

      // Find the value - handle nested braces
      let value = "";
      let braceCount = 0;
      let valueStart = i;

      while (i < configStr.length) {
        const char = configStr[i];

        if (char === "{") {
          braceCount++;
        } else if (char === "}") {
          braceCount--;
        } else if (char === ";" && braceCount === 0) {
          // End of this key-value pair
          break;
        }
        i++;
      }

      value = configStr.substring(valueStart, i).trim();
      pairs.push([key, value]);

      // Skip the semicolon
      if (i < configStr.length && configStr[i] === ";") {
        i++;
      }

      // Skip whitespace after ';'
      while (i < configStr.length && configStr[i] === " ") i++;
    }

    return pairs;
  }

  /**
   * Safely writes content to the markdown file with backup.
   * Uses write lock to prevent race conditions and atomic writes to prevent corruption.
   */
  async safeWriteFile(content: string): Promise<void> {
    await this.withWriteLock(async () => {
      await this.createBackup();
      await this.atomicWriteFile(content);
    });
  }

  async readMilestones(): Promise<Milestone[]> {
    const milestoneMap = new Map<string, Milestone>();

    // First, read from dedicated Milestones section if it exists
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    let inMilestonesSection = false;
    let currentMilestone: Partial<Milestone> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("# Milestones") || line.includes("<!-- Milestones -->")) {
        inMilestonesSection = true;
        continue;
      }

      if (inMilestonesSection && line.startsWith("# ") && !line.startsWith("# Milestones")) {
        if (currentMilestone?.name) {
          milestoneMap.set(currentMilestone.name, currentMilestone as Milestone);
        }
        break;
      }

      if (!inMilestonesSection) continue;

      if (line.startsWith("## ")) {
        if (currentMilestone?.name) {
          milestoneMap.set(currentMilestone.name, currentMilestone as Milestone);
        }
        const name = line.substring(3).trim();
        currentMilestone = {
          id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          name,
          status: "open",
        };
      } else if (currentMilestone) {
        if (line.startsWith("Target:")) {
          currentMilestone.target = line.substring(7).trim();
        } else if (line.startsWith("Status:")) {
          const status = line.substring(7).trim().toLowerCase();
          currentMilestone.status = status === "completed" ? "completed" : "open";
        } else if (line.trim() && !line.startsWith("<!--")) {
          currentMilestone.description = (currentMilestone.description || "") + line.trim() + " ";
        }
      }
    }

    if (currentMilestone?.name) {
      milestoneMap.set(currentMilestone.name, currentMilestone as Milestone);
    }

    // Second, extract unique milestones from tasks
    const tasks = await this.readTasks();
    const extractFromTasks = (taskList: Task[]) => {
      for (const task of taskList) {
        if (task.config.milestone && !milestoneMap.has(task.config.milestone)) {
          const name = task.config.milestone;
          milestoneMap.set(name, {
            id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
            name,
            status: "open",
          });
        }
        if (task.children) extractFromTasks(task.children);
      }
    };
    extractFromTasks(tasks);

    return Array.from(milestoneMap.values());
  }

  async saveMilestones(milestones: Milestone[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Milestones -->") || lines[i].startsWith("# Milestones"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# Milestones")) {
        endIndex = i;
        break;
      }
    }

    let milestonesContent = "<!-- Milestones -->\n# Milestones\n\n";
    for (const m of milestones) {
      milestonesContent += `## ${m.name}\n`;
      if (m.target) milestonesContent += `Target: ${m.target}\n`;
      milestonesContent += `Status: ${m.status}\n`;
      if (m.description) milestonesContent += `${m.description.trim()}\n`;
      milestonesContent += "\n";
    }

    if (startIndex === -1) {
      // Add before Board section
      const boardIndex = lines.findIndex(l => l.includes("<!-- Board -->") || l.startsWith("# Board"));
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
    const ideas: Idea[] = [];

    let inIdeasSection = false;
    let currentIdea: Partial<Idea> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("# Ideas") || line.includes("<!-- Ideas -->")) {
        inIdeasSection = true;
        continue;
      }

      if (inIdeasSection && line.startsWith("# ") && !line.startsWith("# Ideas")) {
        if (currentIdea?.title) ideas.push(currentIdea as Idea);
        currentIdea = null;
        break;
      }

      if (!inIdeasSection) continue;

      if (line.startsWith("## ")) {
        if (currentIdea?.title) ideas.push(currentIdea as Idea);
        const title = line.substring(3).trim();
        currentIdea = {
          id: crypto.randomUUID().substring(0, 8),
          title,
          status: "new",
          created: new Date().toISOString().split("T")[0],
        };
      } else if (currentIdea) {
        if (line.startsWith("Status:")) {
          const s = line.substring(7).trim().toLowerCase();
          if (["new", "considering", "planned", "rejected"].includes(s)) {
            currentIdea.status = s as Idea["status"];
          }
        } else if (line.startsWith("Category:")) {
          currentIdea.category = line.substring(9).trim();
        } else if (line.startsWith("Created:")) {
          currentIdea.created = line.substring(8).trim();
        } else if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentIdea.id = match[1];
        } else if (line.startsWith("<!-- links:")) {
          const match = line.match(/<!-- links: ([^-]+) -->/);
          if (match) {
            const linkIds = match[1].trim().split(",").map(id => id.trim()).filter(id => id);
            if (linkIds.length > 0) currentIdea.links = linkIds;
          }
        } else if (line.trim() && !line.startsWith("<!--")) {
          currentIdea.description = (currentIdea.description || "") + line.trim() + "\n";
        }
      }
    }

    if (currentIdea?.title) ideas.push(currentIdea as Idea);
    return ideas;
  }

  async saveIdeas(ideas: Idea[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Ideas -->") || lines[i].startsWith("# Ideas"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# Ideas")) {
        endIndex = i;
        break;
      }
    }

    let ideasContent = "<!-- Ideas -->\n# Ideas\n\n";
    for (const idea of ideas) {
      ideasContent += `## ${idea.title}\n`;
      ideasContent += `<!-- id: ${idea.id} -->\n`;
      if (idea.links && idea.links.length > 0) {
        ideasContent += `<!-- links: ${idea.links.join(",")} -->\n`;
      }
      ideasContent += `Status: ${idea.status}\n`;
      if (idea.category) ideasContent += `Category: ${idea.category}\n`;
      ideasContent += `Created: ${idea.created}\n`;
      if (idea.description) ideasContent += `\n${idea.description.trim()}\n`;
      ideasContent += "\n";
    }

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(l => l.includes("<!-- Board -->") || l.startsWith("# Board"));
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
    const retrospectives: Retrospective[] = [];

    let inRetrospectivesSection = false;
    let currentRetro: Partial<Retrospective> | null = null;
    let currentSubsection: "continue" | "stop" | "start" | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("# Retrospectives") || line.includes("<!-- Retrospectives -->")) {
        inRetrospectivesSection = true;
        continue;
      }

      if (inRetrospectivesSection && line.startsWith("# ") && !line.startsWith("# Retrospectives")) {
        if (currentRetro?.title) retrospectives.push(currentRetro as Retrospective);
        currentRetro = null;
        break;
      }

      if (!inRetrospectivesSection) continue;

      if (line.startsWith("## ")) {
        if (currentRetro?.title) retrospectives.push(currentRetro as Retrospective);
        const title = line.substring(3).trim();
        currentRetro = {
          id: crypto.randomUUID().substring(0, 8),
          title,
          date: new Date().toISOString().split("T")[0],
          status: "open",
          continue: [],
          stop: [],
          start: [],
        };
        currentSubsection = null;
      } else if (currentRetro) {
        if (line.startsWith("Date:")) {
          currentRetro.date = line.substring(5).trim();
        } else if (line.startsWith("Status:")) {
          const s = line.substring(7).trim().toLowerCase();
          if (["open", "closed"].includes(s)) {
            currentRetro.status = s as Retrospective["status"];
          }
        } else if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentRetro.id = match[1];
        } else if (line.startsWith("### Continue")) {
          currentSubsection = "continue";
        } else if (line.startsWith("### Stop")) {
          currentSubsection = "stop";
        } else if (line.startsWith("### Start")) {
          currentSubsection = "start";
        } else if (line.trim().startsWith("- ") && currentSubsection) {
          const item = line.trim().substring(2).trim();
          if (item) {
            currentRetro[currentSubsection]!.push(item);
          }
        }
      }
    }

    if (currentRetro?.title) retrospectives.push(currentRetro as Retrospective);
    return retrospectives;
  }

  async saveRetrospectives(retrospectives: Retrospective[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Retrospectives -->") || lines[i].startsWith("# Retrospectives"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# Retrospectives")) {
        endIndex = i;
        break;
      }
    }

    let retrospectivesContent = "<!-- Retrospectives -->\n# Retrospectives\n\n";
    for (const retro of retrospectives) {
      retrospectivesContent += `## ${retro.title}\n`;
      retrospectivesContent += `<!-- id: ${retro.id} -->\n`;
      retrospectivesContent += `Date: ${retro.date}\n`;
      retrospectivesContent += `Status: ${retro.status}\n\n`;

      retrospectivesContent += `### Continue\n`;
      for (const item of retro.continue) {
        retrospectivesContent += `- ${item}\n`;
      }
      retrospectivesContent += `\n`;

      retrospectivesContent += `### Stop\n`;
      for (const item of retro.stop) {
        retrospectivesContent += `- ${item}\n`;
      }
      retrospectivesContent += `\n`;

      retrospectivesContent += `### Start\n`;
      for (const item of retro.start) {
        retrospectivesContent += `- ${item}\n`;
      }
      retrospectivesContent += `\n`;
    }

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(l => l.includes("<!-- Board -->") || l.startsWith("# Board"));
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
    const timeEntries = new Map<string, TimeEntry[]>();

    let inTimeTrackingSection = false;
    let currentTaskId: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("# Time Tracking") || line.includes("<!-- Time Tracking -->")) {
        inTimeTrackingSection = true;
        continue;
      }

      if (inTimeTrackingSection && line.startsWith("# ") && !line.startsWith("# Time Tracking")) {
        break;
      }

      if (!inTimeTrackingSection) continue;

      if (line.startsWith("## ")) {
        currentTaskId = line.substring(3).trim();
        if (!timeEntries.has(currentTaskId)) {
          timeEntries.set(currentTaskId, []);
        }
      } else if (currentTaskId && line.trim().startsWith("- ")) {
        // Format: - 2025-01-20: 2h by John - Description
        const entryMatch = line.trim().match(/^- (\d{4}-\d{2}-\d{2}): ([\d.]+)h(?: by ([^-]+))?(?: - (.+))?$/);
        if (entryMatch) {
          const [, date, hours, person, description] = entryMatch;
          const entries = timeEntries.get(currentTaskId)!;
          entries.push({
            id: `te_${Date.now()}_${entries.length}`,
            date,
            hours: parseFloat(hours),
            person: person?.trim(),
            description: description?.trim(),
          });
        }
      }
    }

    return timeEntries;
  }

  async saveTimeEntries(timeEntries: Map<string, TimeEntry[]>): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Time Tracking -->") || lines[i].startsWith("# Time Tracking"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# Time Tracking")) {
        endIndex = i;
        break;
      }
    }

    let timeTrackingContent = "<!-- Time Tracking -->\n# Time Tracking\n\n";
    for (const [taskId, entries] of timeEntries) {
      if (entries.length === 0) continue;
      timeTrackingContent += `## ${taskId}\n`;
      for (const entry of entries) {
        let line = `- ${entry.date}: ${entry.hours}h`;
        if (entry.person) line += ` by ${entry.person}`;
        if (entry.description) line += ` - ${entry.description}`;
        timeTrackingContent += line + "\n";
      }
      timeTrackingContent += "\n";
    }

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(l => l.includes("<!-- Board -->") || l.startsWith("# Board"));
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

  async addTimeEntry(taskId: string, entry: Omit<TimeEntry, "id">): Promise<string> {
    const timeEntries = await this.readTimeEntries();
    const entries = timeEntries.get(taskId) || [];
    const newEntry: TimeEntry = {
      ...entry,
      id: `te_${Date.now()}`,
    };
    entries.push(newEntry);
    timeEntries.set(taskId, entries);
    await this.saveTimeEntries(timeEntries);
    return newEntry.id;
  }

  async deleteTimeEntry(taskId: string, entryId: string): Promise<boolean> {
    const timeEntries = await this.readTimeEntries();
    const entries = timeEntries.get(taskId);
    if (!entries) return false;
    const index = entries.findIndex(e => e.id === entryId);
    if (index === -1) return false;
    entries.splice(index, 1);
    if (entries.length === 0) {
      timeEntries.delete(taskId);
    }
    await this.saveTimeEntries(timeEntries);
    return true;
  }

  async getTimeEntriesForTask(taskId: string): Promise<TimeEntry[]> {
    const timeEntries = await this.readTimeEntries();
    return timeEntries.get(taskId) || [];
  }

  async readSwotAnalyses(): Promise<SwotAnalysis[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    const swotAnalyses: SwotAnalysis[] = [];

    let inSwotSection = false;
    let currentSwot: Partial<SwotAnalysis> | null = null;
    let currentSubsection: "strengths" | "weaknesses" | "opportunities" | "threats" | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("# SWOT Analysis") || line.includes("<!-- SWOT Analysis -->")) {
        inSwotSection = true;
        continue;
      }

      if (inSwotSection && line.startsWith("# ") && !line.startsWith("# SWOT Analysis")) {
        if (currentSwot?.title) swotAnalyses.push(currentSwot as SwotAnalysis);
        currentSwot = null;
        break;
      }

      if (!inSwotSection) continue;

      if (line.startsWith("## ")) {
        if (currentSwot?.title) swotAnalyses.push(currentSwot as SwotAnalysis);
        const title = line.substring(3).trim();
        currentSwot = {
          id: crypto.randomUUID().substring(0, 8),
          title,
          date: new Date().toISOString().split("T")[0],
          strengths: [],
          weaknesses: [],
          opportunities: [],
          threats: [],
        };
        currentSubsection = null;
      } else if (currentSwot) {
        if (line.startsWith("Date:")) {
          currentSwot.date = line.substring(5).trim();
        } else if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentSwot.id = match[1];
        } else if (line.startsWith("### Strengths")) {
          currentSubsection = "strengths";
        } else if (line.startsWith("### Weaknesses")) {
          currentSubsection = "weaknesses";
        } else if (line.startsWith("### Opportunities")) {
          currentSubsection = "opportunities";
        } else if (line.startsWith("### Threats")) {
          currentSubsection = "threats";
        } else if (line.trim().startsWith("- ") && currentSubsection) {
          const item = line.trim().substring(2).trim();
          if (item) {
            currentSwot[currentSubsection]!.push(item);
          }
        }
      }
    }

    if (currentSwot?.title) swotAnalyses.push(currentSwot as SwotAnalysis);
    return swotAnalyses;
  }

  async saveSwotAnalyses(swotAnalyses: SwotAnalysis[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- SWOT Analysis -->") || lines[i].startsWith("# SWOT Analysis"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# SWOT Analysis")) {
        endIndex = i;
        break;
      }
    }

    let swotContent = "<!-- SWOT Analysis -->\n# SWOT Analysis\n\n";
    for (const swot of swotAnalyses) {
      swotContent += `## ${swot.title}\n`;
      swotContent += `<!-- id: ${swot.id} -->\n`;
      swotContent += `Date: ${swot.date}\n\n`;

      swotContent += `### Strengths\n`;
      for (const item of swot.strengths) {
        swotContent += `- ${item}\n`;
      }
      swotContent += `\n`;

      swotContent += `### Weaknesses\n`;
      for (const item of swot.weaknesses) {
        swotContent += `- ${item}\n`;
      }
      swotContent += `\n`;

      swotContent += `### Opportunities\n`;
      for (const item of swot.opportunities) {
        swotContent += `- ${item}\n`;
      }
      swotContent += `\n`;

      swotContent += `### Threats\n`;
      for (const item of swot.threats) {
        swotContent += `- ${item}\n`;
      }
      swotContent += `\n`;
    }

    if (startIndex === -1) {
      const boardIndex = lines.findIndex(l => l.includes("<!-- Board -->") || l.startsWith("# Board"));
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
    const riskAnalyses: RiskAnalysis[] = [];

    let inRiskSection = false;
    let currentRisk: Partial<RiskAnalysis> | null = null;
    let currentSubsection: "highImpactHighProb" | "highImpactLowProb" | "lowImpactHighProb" | "lowImpactLowProb" | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("# Risk Analysis") || line.includes("<!-- Risk Analysis -->")) {
        inRiskSection = true;
        continue;
      }

      if (inRiskSection && line.startsWith("# ") && !line.startsWith("# Risk Analysis")) {
        if (currentRisk?.title) riskAnalyses.push(currentRisk as RiskAnalysis);
        currentRisk = null;
        break;
      }

      if (!inRiskSection) continue;

      if (line.startsWith("## ")) {
        if (currentRisk?.title) riskAnalyses.push(currentRisk as RiskAnalysis);
        const title = line.substring(3).trim();
        currentRisk = {
          id: crypto.randomUUID().substring(0, 8),
          title,
          date: new Date().toISOString().split("T")[0],
          highImpactHighProb: [],
          highImpactLowProb: [],
          lowImpactHighProb: [],
          lowImpactLowProb: [],
        };
        currentSubsection = null;
      } else if (currentRisk) {
        if (line.startsWith("Date:")) {
          currentRisk.date = line.substring(5).trim();
        } else if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentRisk.id = match[1];
        } else if (line.startsWith("### High Impact / High Probability")) {
          currentSubsection = "highImpactHighProb";
        } else if (line.startsWith("### High Impact / Low Probability")) {
          currentSubsection = "highImpactLowProb";
        } else if (line.startsWith("### Low Impact / High Probability")) {
          currentSubsection = "lowImpactHighProb";
        } else if (line.startsWith("### Low Impact / Low Probability")) {
          currentSubsection = "lowImpactLowProb";
        } else if (line.trim().startsWith("- ") && currentSubsection) {
          const item = line.trim().substring(2).trim();
          if (item) {
            currentRisk[currentSubsection]!.push(item);
          }
        }
      }
    }

    if (currentRisk?.title) riskAnalyses.push(currentRisk as RiskAnalysis);
    return riskAnalyses;
  }

  async saveRiskAnalyses(riskAnalyses: RiskAnalysis[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Risk Analysis -->") || lines[i].startsWith("# Risk Analysis"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# Risk Analysis")) {
        endIndex = i;
        break;
      }
    }

    let riskContent = "<!-- Risk Analysis -->\n# Risk Analysis\n\n";
    for (const risk of riskAnalyses) {
      riskContent += `## ${risk.title}\n`;
      riskContent += `<!-- id: ${risk.id} -->\n`;
      riskContent += `Date: ${risk.date}\n\n`;

      riskContent += `### High Impact / High Probability\n`;
      for (const item of risk.highImpactHighProb) {
        riskContent += `- ${item}\n`;
      }
      riskContent += `\n`;

      riskContent += `### High Impact / Low Probability\n`;
      for (const item of risk.highImpactLowProb) {
        riskContent += `- ${item}\n`;
      }
      riskContent += `\n`;

      riskContent += `### Low Impact / High Probability\n`;
      for (const item of risk.lowImpactHighProb) {
        riskContent += `- ${item}\n`;
      }
      riskContent += `\n`;

      riskContent += `### Low Impact / Low Probability\n`;
      for (const item of risk.lowImpactLowProb) {
        riskContent += `- ${item}\n`;
      }
      riskContent += `\n`;
    }

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
    const leanCanvases: LeanCanvas[] = [];

    let inLeanSection = false;
    let currentCanvas: Partial<LeanCanvas> | null = null;
    let currentSubsection: keyof Omit<LeanCanvas, "id" | "title" | "date"> | null = null;

    const sectionMap: Record<string, keyof Omit<LeanCanvas, "id" | "title" | "date">> = {
      "### Problem": "problem",
      "### Solution": "solution",
      "### Unique Value Proposition": "uniqueValueProp",
      "### Unfair Advantage": "unfairAdvantage",
      "### Customer Segments": "customerSegments",
      "### Existing Alternatives": "existingAlternatives",
      "### Key Metrics": "keyMetrics",
      "### High-Level Concept": "highLevelConcept",
      "### Channels": "channels",
      "### Early Adopters": "earlyAdopters",
      "### Cost Structure": "costStructure",
      "### Revenue Streams": "revenueStreams",
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("# Lean Canvas") || line.includes("<!-- Lean Canvas -->")) {
        inLeanSection = true;
        continue;
      }

      if (inLeanSection && line.startsWith("# ") && !line.startsWith("# Lean Canvas")) {
        if (currentCanvas?.title) leanCanvases.push(currentCanvas as LeanCanvas);
        currentCanvas = null;
        break;
      }

      if (!inLeanSection) continue;

      if (line.startsWith("## ")) {
        if (currentCanvas?.title) leanCanvases.push(currentCanvas as LeanCanvas);
        const title = line.substring(3).trim();
        currentCanvas = {
          id: crypto.randomUUID().substring(0, 8),
          title,
          date: new Date().toISOString().split("T")[0],
          problem: [],
          solution: [],
          uniqueValueProp: [],
          unfairAdvantage: [],
          customerSegments: [],
          existingAlternatives: [],
          keyMetrics: [],
          highLevelConcept: [],
          channels: [],
          earlyAdopters: [],
          costStructure: [],
          revenueStreams: [],
        };
        currentSubsection = null;
      } else if (currentCanvas) {
        if (line.startsWith("Date:")) {
          currentCanvas.date = line.substring(5).trim();
        } else if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentCanvas.id = match[1];
        } else {
          // Check for section headers
          for (const [header, key] of Object.entries(sectionMap)) {
            if (line.startsWith(header)) {
              currentSubsection = key;
              break;
            }
          }
          // Add items to current section
          if (line.trim().startsWith("- ") && currentSubsection) {
            const item = line.trim().substring(2).trim();
            if (item) {
              (currentCanvas[currentSubsection] as string[]).push(item);
            }
          }
        }
      }
    }

    if (currentCanvas?.title) leanCanvases.push(currentCanvas as LeanCanvas);
    return leanCanvases;
  }

  async saveLeanCanvases(leanCanvases: LeanCanvas[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Lean Canvas -->") || lines[i].startsWith("# Lean Canvas"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# Lean Canvas")) {
        endIndex = i;
        break;
      }
    }

    let leanContent = "<!-- Lean Canvas -->\n# Lean Canvas\n\n";
    for (const canvas of leanCanvases) {
      leanContent += `## ${canvas.title}\n`;
      leanContent += `<!-- id: ${canvas.id} -->\n`;
      leanContent += `Date: ${canvas.date}\n\n`;

      const sections: Array<{ header: string; key: keyof Omit<LeanCanvas, "id" | "title" | "date"> }> = [
        { header: "Problem", key: "problem" },
        { header: "Solution", key: "solution" },
        { header: "Unique Value Proposition", key: "uniqueValueProp" },
        { header: "Unfair Advantage", key: "unfairAdvantage" },
        { header: "Customer Segments", key: "customerSegments" },
        { header: "Existing Alternatives", key: "existingAlternatives" },
        { header: "Key Metrics", key: "keyMetrics" },
        { header: "High-Level Concept", key: "highLevelConcept" },
        { header: "Channels", key: "channels" },
        { header: "Early Adopters", key: "earlyAdopters" },
        { header: "Cost Structure", key: "costStructure" },
        { header: "Revenue Streams", key: "revenueStreams" },
      ];

      for (const { header, key } of sections) {
        leanContent += `### ${header}\n`;
        for (const item of canvas[key]) {
          leanContent += `- ${item}\n`;
        }
        leanContent += `\n`;
      }
    }

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
    const canvases: BusinessModelCanvas[] = [];

    let inSection = false;
    let currentCanvas: Partial<BusinessModelCanvas> | null = null;
    let currentSubsection: keyof Omit<BusinessModelCanvas, "id" | "title" | "date"> | null = null;

    const sectionMap: Record<string, keyof Omit<BusinessModelCanvas, "id" | "title" | "date">> = {
      "### Key Partners": "keyPartners",
      "### Key Activities": "keyActivities",
      "### Key Resources": "keyResources",
      "### Value Proposition": "valueProposition",
      "### Customer Relationships": "customerRelationships",
      "### Channels": "channels",
      "### Customer Segments": "customerSegments",
      "### Cost Structure": "costStructure",
      "### Revenue Streams": "revenueStreams",
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("# Business Model Canvas") || line.includes("<!-- Business Model Canvas -->")) {
        inSection = true;
        continue;
      }

      if (inSection && line.startsWith("# ") && !line.startsWith("# Business Model Canvas")) {
        if (currentCanvas?.title) canvases.push(currentCanvas as BusinessModelCanvas);
        currentCanvas = null;
        break;
      }

      if (!inSection) continue;

      if (line.startsWith("## ")) {
        if (currentCanvas?.title) canvases.push(currentCanvas as BusinessModelCanvas);
        const title = line.substring(3).trim();
        currentCanvas = {
          id: crypto.randomUUID().substring(0, 8),
          title,
          date: new Date().toISOString().split("T")[0],
          keyPartners: [],
          keyActivities: [],
          keyResources: [],
          valueProposition: [],
          customerRelationships: [],
          channels: [],
          customerSegments: [],
          costStructure: [],
          revenueStreams: [],
        };
        currentSubsection = null;
      } else if (currentCanvas) {
        if (line.startsWith("Date:")) {
          currentCanvas.date = line.substring(5).trim();
        } else if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentCanvas.id = match[1];
        } else {
          for (const [header, key] of Object.entries(sectionMap)) {
            if (line.startsWith(header)) {
              currentSubsection = key;
              break;
            }
          }
          if (line.trim().startsWith("- ") && currentSubsection) {
            const item = line.trim().substring(2).trim();
            if (item) {
              (currentCanvas[currentSubsection] as string[]).push(item);
            }
          }
        }
      }
    }

    if (currentCanvas?.title) canvases.push(currentCanvas as BusinessModelCanvas);
    return canvases;
  }

  async saveBusinessModelCanvases(canvases: BusinessModelCanvas[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Business Model Canvas -->") || lines[i].startsWith("# Business Model Canvas"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# Business Model Canvas")) {
        endIndex = i;
        break;
      }
    }

    let bmcContent = "<!-- Business Model Canvas -->\n# Business Model Canvas\n\n";
    for (const canvas of canvases) {
      bmcContent += `## ${canvas.title}\n`;
      bmcContent += `<!-- id: ${canvas.id} -->\n`;
      bmcContent += `Date: ${canvas.date}\n\n`;

      const sections: Array<{ header: string; key: keyof Omit<BusinessModelCanvas, "id" | "title" | "date"> }> = [
        { header: "Key Partners", key: "keyPartners" },
        { header: "Key Activities", key: "keyActivities" },
        { header: "Key Resources", key: "keyResources" },
        { header: "Value Proposition", key: "valueProposition" },
        { header: "Customer Relationships", key: "customerRelationships" },
        { header: "Channels", key: "channels" },
        { header: "Customer Segments", key: "customerSegments" },
        { header: "Cost Structure", key: "costStructure" },
        { header: "Revenue Streams", key: "revenueStreams" },
      ];

      for (const { header, key } of sections) {
        bmcContent += `### ${header}\n`;
        for (const item of canvas[key]) {
          bmcContent += `- ${item}\n`;
        }
        bmcContent += `\n`;
      }
    }

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
    const boards: ProjectValueBoard[] = [];

    let inSection = false;
    let currentBoard: Partial<ProjectValueBoard> | null = null;
    let currentSubsection: keyof Omit<ProjectValueBoard, "id" | "title" | "date"> | null = null;

    const sectionMap: Record<string, keyof Omit<ProjectValueBoard, "id" | "title" | "date">> = {
      "### Customer Segments": "customerSegments",
      "### Problem": "problem",
      "### Solution": "solution",
      "### Benefit": "benefit",
    };

    for (const line of lines) {
      if (line.includes("<!-- Project Value Board -->") || line.startsWith("# Project Value Board")) {
        inSection = true;
        continue;
      }

      if (inSection && line.startsWith("# ") && !line.startsWith("# Project Value Board")) {
        if (currentBoard?.title) boards.push(currentBoard as ProjectValueBoard);
        currentBoard = null;
        break;
      }

      if (!inSection) continue;

      if (line.startsWith("## ")) {
        if (currentBoard?.title) boards.push(currentBoard as ProjectValueBoard);
        const title = line.substring(3).trim();
        currentBoard = {
          id: crypto.randomUUID(),
          title,
          date: new Date().toISOString().split("T")[0],
          customerSegments: [],
          problem: [],
          solution: [],
          benefit: [],
        };
        currentSubsection = null;
        continue;
      }

      if (!currentBoard) continue;

      const idMatch = line.match(/<!--\s*id:\s*([^\s]+)\s*-->/);
      if (idMatch) {
        currentBoard.id = idMatch[1];
        continue;
      }

      if (line.startsWith("Date:")) {
        currentBoard.date = line.substring(5).trim();
        continue;
      }

      for (const [header, key] of Object.entries(sectionMap)) {
        if (line.startsWith(header)) {
          currentSubsection = key;
          break;
        }
      }

      if (currentSubsection && line.startsWith("- ")) {
        const item = line.substring(2).trim();
        if (item) currentBoard[currentSubsection]?.push(item);
      }
    }

    if (currentBoard?.title) boards.push(currentBoard as ProjectValueBoard);
    return boards;
  }

  async saveProjectValueBoards(boards: ProjectValueBoard[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Project Value Board -->") || lines[i].startsWith("# Project Value Board"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# Project Value Board")) {
        endIndex = i;
        break;
      }
    }

    let pvbContent = "<!-- Project Value Board -->\n# Project Value Board\n\n";
    for (const board of boards) {
      pvbContent += `## ${board.title}\n`;
      pvbContent += `<!-- id: ${board.id} -->\n`;
      pvbContent += `Date: ${board.date}\n\n`;

      const sections: Array<{ header: string; key: keyof Omit<ProjectValueBoard, "id" | "title" | "date"> }> = [
        { header: "Customer Segments", key: "customerSegments" },
        { header: "Problem", key: "problem" },
        { header: "Solution", key: "solution" },
        { header: "Benefit", key: "benefit" },
      ];

      for (const { header, key } of sections) {
        pvbContent += `### ${header}\n`;
        for (const item of board[key]) {
          pvbContent += `- ${item}\n`;
        }
        pvbContent += `\n`;
      }
    }

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
    const briefs: Brief[] = [];

    let inSection = false;
    let currentBrief: Partial<Brief> | null = null;
    let currentSubsection: keyof Omit<Brief, "id" | "title" | "date"> | null = null;

    const sectionMap: Record<string, keyof Omit<Brief, "id" | "title" | "date">> = {
      "### Summary": "summary",
      "### Mission": "mission",
      "### Responsible": "responsible",
      "### Accountable": "accountable",
      "### Consulted": "consulted",
      "### Informed": "informed",
      "### High Level Budget": "highLevelBudget",
      "### High Level Timeline": "highLevelTimeline",
      "### Culture": "culture",
      "### Change Capacity": "changeCapacity",
      "### Guiding Principles": "guidingPrinciples",
    };

    for (const line of lines) {
      if (line.includes("<!-- Brief -->") || line.startsWith("# Brief")) {
        inSection = true;
        continue;
      }

      if (inSection && line.startsWith("# ") && !line.startsWith("# Brief")) {
        if (currentBrief?.title) briefs.push(currentBrief as Brief);
        currentBrief = null;
        break;
      }

      if (!inSection) continue;

      if (line.startsWith("## ")) {
        if (currentBrief?.title) briefs.push(currentBrief as Brief);
        const title = line.substring(3).trim();
        currentBrief = {
          id: crypto.randomUUID().substring(0, 8),
          title,
          date: new Date().toISOString().split("T")[0],
          summary: [],
          mission: [],
          responsible: [],
          accountable: [],
          consulted: [],
          informed: [],
          highLevelBudget: [],
          highLevelTimeline: [],
          culture: [],
          changeCapacity: [],
          guidingPrinciples: [],
        };
        currentSubsection = null;
        continue;
      }

      if (!currentBrief) continue;

      const idMatch = line.match(/<!--\s*id:\s*([^\s]+)\s*-->/);
      if (idMatch) {
        currentBrief.id = idMatch[1];
        continue;
      }

      if (line.startsWith("Date:")) {
        currentBrief.date = line.substring(5).trim();
        continue;
      }

      for (const [header, key] of Object.entries(sectionMap)) {
        if (line.startsWith(header)) {
          currentSubsection = key;
          break;
        }
      }

      if (currentSubsection && line.startsWith("- ")) {
        const item = line.substring(2).trim();
        if (item) currentBrief[currentSubsection]?.push(item);
      }
    }

    if (currentBrief?.title) briefs.push(currentBrief as Brief);
    return briefs;
  }

  async saveBriefs(briefs: Brief[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Brief -->") || lines[i].startsWith("# Brief"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# Brief")) {
        endIndex = i;
        break;
      }
    }

    let briefContent = "<!-- Brief -->\n# Brief\n\n";
    for (const brief of briefs) {
      briefContent += `## ${brief.title}\n`;
      briefContent += `<!-- id: ${brief.id} -->\n`;
      briefContent += `Date: ${brief.date}\n\n`;

      const sections: Array<{ header: string; key: keyof Omit<Brief, "id" | "title" | "date"> }> = [
        { header: "Summary", key: "summary" },
        { header: "Mission", key: "mission" },
        { header: "Responsible", key: "responsible" },
        { header: "Accountable", key: "accountable" },
        { header: "Consulted", key: "consulted" },
        { header: "Informed", key: "informed" },
        { header: "High Level Budget", key: "highLevelBudget" },
        { header: "High Level Timeline", key: "highLevelTimeline" },
        { header: "Culture", key: "culture" },
        { header: "Change Capacity", key: "changeCapacity" },
        { header: "Guiding Principles", key: "guidingPrinciples" },
      ];

      for (const { header, key } of sections) {
        briefContent += `### ${header}\n`;
        for (const item of brief[key]) {
          briefContent += `- ${item}\n`;
        }
        briefContent += `\n`;
      }
    }

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
    const plans: CapacityPlan[] = [];

    let inSection = false;
    let currentPlan: Partial<CapacityPlan> | null = null;
    let currentMember: Partial<TeamMember> | null = null;
    let inMembersSection = false;
    let inAllocationsSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.includes("<!-- Capacity Planning -->") || trimmed === "# Capacity Planning") {
        inSection = true;
        continue;
      }

      if (inSection && trimmed.startsWith("# ") && !trimmed.startsWith("# Capacity Planning")) {
        if (currentMember?.name && currentPlan) {
          currentPlan.teamMembers?.push(currentMember as TeamMember);
        }
        if (currentPlan?.title) plans.push(currentPlan as CapacityPlan);
        break;
      }

      if (!inSection) continue;

      // Plan header (## Plan Title)
      if (trimmed.startsWith("## ")) {
        if (currentMember?.name && currentPlan) {
          currentPlan.teamMembers?.push(currentMember as TeamMember);
          currentMember = null;
        }
        if (currentPlan?.title) plans.push(currentPlan as CapacityPlan);

        currentPlan = {
          id: crypto.randomUUID().substring(0, 8),
          title: trimmed.substring(3).trim(),
          date: new Date().toISOString().split("T")[0],
          teamMembers: [],
          allocations: [],
        };
        inMembersSection = false;
        inAllocationsSection = false;
        continue;
      }

      if (!currentPlan) continue;

      // Plan ID
      const idMatch = trimmed.match(/<!--\s*id:\s*([^\s]+)\s*-->/);
      if (idMatch) {
        currentPlan.id = idMatch[1];
        continue;
      }

      // Date
      if (trimmed.startsWith("Date:")) {
        currentPlan.date = trimmed.substring(5).trim();
        continue;
      }

      // Budget Hours
      if (trimmed.startsWith("Budget Hours:")) {
        currentPlan.budgetHours = parseInt(trimmed.substring(13).trim(), 10) || undefined;
        continue;
      }

      // Subsections
      if (trimmed === "### Team Members") {
        if (currentMember?.name) {
          currentPlan.teamMembers?.push(currentMember as TeamMember);
          currentMember = null;
        }
        inMembersSection = true;
        inAllocationsSection = false;
        continue;
      }

      if (trimmed === "### Allocations") {
        if (currentMember?.name) {
          currentPlan.teamMembers?.push(currentMember as TeamMember);
          currentMember = null;
        }
        inMembersSection = false;
        inAllocationsSection = true;
        continue;
      }

      // Team member (#### Member Name)
      if (inMembersSection && trimmed.startsWith("#### ")) {
        if (currentMember?.name) {
          currentPlan.teamMembers?.push(currentMember as TeamMember);
        }
        currentMember = {
          id: crypto.randomUUID().substring(0, 8),
          name: trimmed.substring(5).trim(),
          hoursPerDay: 8,
          workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        };
        continue;
      }

      // Member properties
      if (inMembersSection && currentMember) {
        const memberIdMatch = trimmed.match(/<!--\s*member-id:\s*([^\s]+)\s*-->/);
        if (memberIdMatch) {
          currentMember.id = memberIdMatch[1];
          continue;
        }

        if (trimmed.startsWith("Role:")) {
          currentMember.role = trimmed.substring(5).trim();
          continue;
        }

        if (trimmed.startsWith("Hours Per Day:")) {
          currentMember.hoursPerDay = parseInt(trimmed.substring(14).trim(), 10) || 8;
          continue;
        }

        if (trimmed.startsWith("Working Days:")) {
          currentMember.workingDays = trimmed.substring(13).trim().split(",").map(d => d.trim());
          continue;
        }
      }

      // Allocations (#### 2026-02-10 for week start)
      if (inAllocationsSection && trimmed.startsWith("#### ")) {
        const weekStart = trimmed.substring(5).trim();
        // Parse allocation lines until next #### or ###
        i++;
        while (i < lines.length) {
          const allocLine = lines[i].trim();
          if (allocLine.startsWith("#### ") || allocLine.startsWith("### ") || allocLine.startsWith("## ") || allocLine.startsWith("# ")) {
            i--;
            break;
          }

          // Parse allocation: - member_id: 32h project "notes"
          const allocMatch = allocLine.match(/^-\s+(\S+):\s+(\d+)h\s+(project|task|milestone)(?::(\S+))?\s*(?:"([^"]*)")?$/);
          if (allocMatch) {
            currentPlan.allocations?.push({
              id: crypto.randomUUID().substring(0, 8),
              memberId: allocMatch[1],
              weekStart,
              allocatedHours: parseInt(allocMatch[2], 10),
              targetType: allocMatch[3] as "project" | "task" | "milestone",
              targetId: allocMatch[4] || undefined,
              notes: allocMatch[5] || undefined,
            });
          }
          i++;
        }
        continue;
      }
    }

    // Push last items
    if (currentMember?.name && currentPlan) {
      currentPlan.teamMembers?.push(currentMember as TeamMember);
    }
    if (currentPlan?.title) plans.push(currentPlan as CapacityPlan);

    return plans;
  }

  async saveCapacityPlans(plans: CapacityPlan[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Capacity Planning -->") || lines[i].trim() === "# Capacity Planning")) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].trim().startsWith("# ") && !lines[i].trim().startsWith("# Capacity Planning")) {
        endIndex = i;
        break;
      }
    }

    let capacityContent = "<!-- Capacity Planning -->\n# Capacity Planning\n\n";
    for (const plan of plans) {
      capacityContent += `## ${plan.title}\n`;
      capacityContent += `<!-- id: ${plan.id} -->\n`;
      capacityContent += `Date: ${plan.date}\n`;
      if (plan.budgetHours) {
        capacityContent += `Budget Hours: ${plan.budgetHours}\n`;
      }
      capacityContent += `\n`;

      // Team Members
      capacityContent += `### Team Members\n\n`;
      for (const member of plan.teamMembers) {
        capacityContent += `#### ${member.name}\n`;
        capacityContent += `<!-- member-id: ${member.id} -->\n`;
        if (member.role) {
          capacityContent += `Role: ${member.role}\n`;
        }
        capacityContent += `Hours Per Day: ${member.hoursPerDay}\n`;
        capacityContent += `Working Days: ${member.workingDays.join(", ")}\n\n`;
      }

      // Allocations grouped by week
      capacityContent += `### Allocations\n\n`;
      const weekGroups = new Map<string, WeeklyAllocation[]>();
      for (const alloc of plan.allocations) {
        const group = weekGroups.get(alloc.weekStart) || [];
        group.push(alloc);
        weekGroups.set(alloc.weekStart, group);
      }

      const sortedWeeks = Array.from(weekGroups.keys()).sort();
      for (const week of sortedWeeks) {
        capacityContent += `#### ${week}\n`;
        for (const alloc of weekGroups.get(week)!) {
          let line = `- ${alloc.memberId}: ${alloc.allocatedHours}h ${alloc.targetType}`;
          if (alloc.targetId) {
            line += `:${alloc.targetId}`;
          }
          if (alloc.notes) {
            line += ` "${alloc.notes}"`;
          }
          capacityContent += line + "\n";
        }
        capacityContent += "\n";
      }
    }

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
    const builders: StrategicLevelsBuilder[] = [];

    let inSection = false;
    let currentBuilder: Partial<StrategicLevelsBuilder> | null = null;
    let currentLevel: Partial<StrategicLevel> | null = null;
    let currentLevelType: StrategicLevelType | null = null;

    const levelHeaderMap: Record<string, StrategicLevelType> = {
      "### Vision": "vision",
      "### Mission": "mission",
      "### Goals": "goals",
      "### Objectives": "objectives",
      "### Strategies": "strategies",
      "### Tactics": "tactics",
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.includes("<!-- Strategic Levels -->") || trimmed === "# Strategic Levels") {
        inSection = true;
        continue;
      }

      if (inSection && trimmed.startsWith("# ") && !trimmed.startsWith("# Strategic Levels")) {
        if (currentLevel?.title && currentBuilder) {
          currentBuilder.levels?.push(currentLevel as StrategicLevel);
        }
        if (currentBuilder?.title) builders.push(currentBuilder as StrategicLevelsBuilder);
        break;
      }

      if (!inSection) continue;

      // Builder header (## Builder Title)
      if (trimmed.startsWith("## ")) {
        if (currentLevel?.title && currentBuilder) {
          currentBuilder.levels?.push(currentLevel as StrategicLevel);
          currentLevel = null;
        }
        if (currentBuilder?.title) builders.push(currentBuilder as StrategicLevelsBuilder);

        currentBuilder = {
          id: crypto.randomUUID().substring(0, 8),
          title: trimmed.substring(3).trim(),
          date: new Date().toISOString().split("T")[0],
          levels: [],
        };
        currentLevelType = null;
        continue;
      }

      if (!currentBuilder) continue;

      // Builder ID
      const idMatch = trimmed.match(/<!--\s*id:\s*([^\s]+)\s*-->/);
      if (idMatch) {
        currentBuilder.id = idMatch[1];
        continue;
      }

      // Date
      if (trimmed.startsWith("Date:")) {
        currentBuilder.date = trimmed.substring(5).trim();
        continue;
      }

      // Level type headers (### Vision, ### Mission, etc.)
      for (const [header, levelType] of Object.entries(levelHeaderMap)) {
        if (trimmed.startsWith(header)) {
          if (currentLevel?.title && currentBuilder) {
            currentBuilder.levels?.push(currentLevel as StrategicLevel);
            currentLevel = null;
          }
          currentLevelType = levelType;
          break;
        }
      }

      // Level item (- Title with metadata)
      if (currentLevelType && trimmed.startsWith("- ")) {
        if (currentLevel?.title && currentBuilder) {
          currentBuilder.levels?.push(currentLevel as StrategicLevel);
        }

        const levelText = trimmed.substring(2).trim();
        currentLevel = {
          id: crypto.randomUUID().substring(0, 8),
          title: levelText,
          level: currentLevelType,
          order: (currentBuilder.levels?.filter(l => l.level === currentLevelType).length || 0),
          linkedTasks: [],
          linkedMilestones: [],
        };
        continue;
      }

      // Level metadata comments
      if (currentLevel) {
        const levelIdMatch = trimmed.match(/<!--\s*level-id:\s*([^,\s]+)(?:,\s*parent:\s*([^\s]+))?\s*-->/);
        if (levelIdMatch) {
          currentLevel.id = levelIdMatch[1];
          if (levelIdMatch[2]) {
            currentLevel.parentId = levelIdMatch[2];
          }
          continue;
        }

        const linkedTasksMatch = trimmed.match(/<!--\s*linked-tasks:\s*([^\s]+)\s*-->/);
        if (linkedTasksMatch) {
          currentLevel.linkedTasks = linkedTasksMatch[1].split(",").map(t => t.trim()).filter(Boolean);
          continue;
        }

        const linkedMilestonesMatch = trimmed.match(/<!--\s*linked-milestones:\s*([^\s]+)\s*-->/);
        if (linkedMilestonesMatch) {
          currentLevel.linkedMilestones = linkedMilestonesMatch[1].split(",").map(m => m.trim()).filter(Boolean);
          continue;
        }

        // Description (indented text that's not a comment or list item)
        if (trimmed && !trimmed.startsWith("<!--") && !trimmed.startsWith("-") && !trimmed.startsWith("#") && !trimmed.startsWith("Date:")) {
          if (!currentLevel.description) {
            currentLevel.description = trimmed;
          } else {
            currentLevel.description += " " + trimmed;
          }
          continue;
        }
      }
    }

    // Push last items
    if (currentLevel?.title && currentBuilder) {
      currentBuilder.levels?.push(currentLevel as StrategicLevel);
    }
    if (currentBuilder?.title) builders.push(currentBuilder as StrategicLevelsBuilder);

    return builders;
  }

  async saveStrategicLevelsBuilders(builders: StrategicLevelsBuilder[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Strategic Levels -->") || lines[i].trim() === "# Strategic Levels")) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].trim().startsWith("# ") && !lines[i].trim().startsWith("# Strategic Levels")) {
        endIndex = i;
        break;
      }
    }

    let strategicContent = "<!-- Strategic Levels -->\n# Strategic Levels\n\n";

    for (const builder of builders) {
      strategicContent += `## ${builder.title}\n`;
      strategicContent += `<!-- id: ${builder.id} -->\n`;
      strategicContent += `Date: ${builder.date}\n\n`;

      // Group levels by type and maintain hierarchy
      for (const levelType of STRATEGIC_LEVEL_ORDER) {
        const levelsOfType = builder.levels
          .filter(l => l.level === levelType)
          .sort((a, b) => a.order - b.order);

        if (levelsOfType.length === 0) continue;

        // Capitalize first letter for header
        const header = levelType.charAt(0).toUpperCase() + levelType.slice(1);
        strategicContent += `### ${header}\n`;

        for (const level of levelsOfType) {
          strategicContent += `- ${level.title}\n`;

          // Add metadata comment
          let metadata = `level-id: ${level.id}`;
          if (level.parentId) {
            metadata += `, parent: ${level.parentId}`;
          }
          strategicContent += `<!-- ${metadata} -->\n`;

          // Add description if present
          if (level.description) {
            strategicContent += `${level.description}\n`;
          }

          // Add linked tasks
          if (level.linkedTasks && level.linkedTasks.length > 0) {
            strategicContent += `<!-- linked-tasks: ${level.linkedTasks.join(",")} -->\n`;
          }

          // Add linked milestones
          if (level.linkedMilestones && level.linkedMilestones.length > 0) {
            strategicContent += `<!-- linked-milestones: ${level.linkedMilestones.join(",")} -->\n`;
          }
        }
        strategicContent += "\n";
      }
    }

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
    return ideas.map(idea => {
      const backlinks = ideas
        .filter(other => other.links?.includes(idea.id))
        .map(other => other.id);
      return { ...idea, backlinks };
    });
  }

  // Customer Management
  async readCustomers(): Promise<Customer[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    const customers: Customer[] = [];

    let inCustomersSection = false;
    let currentCustomer: Partial<Customer> | null = null;
    let inAddress = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!inCustomersSection && (line.startsWith("# Customers") || line.includes("<!-- Customers -->"))) {
        inCustomersSection = true;
        continue;
      }

      // Skip the # Customers header if we're already in the section (entered via comment)
      if (inCustomersSection && line.startsWith("# Customers")) {
        continue;
      }

      if (inCustomersSection && line.startsWith("# ") && !line.startsWith("# Customers")) {
        if (currentCustomer?.name) {
          customers.push(currentCustomer as Customer);
        }
        currentCustomer = null; // Clear to prevent double push at end
        break;
      }

      if (!inCustomersSection) continue;

      if (line.startsWith("## ")) {
        if (currentCustomer?.name) customers.push(currentCustomer as Customer);
        const name = line.substring(3).trim();
        currentCustomer = {
          id: crypto.randomUUID().substring(0, 8),
          name,
          created: new Date().toISOString().split("T")[0],
        };
        inAddress = false;
      } else if (currentCustomer) {
        if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentCustomer.id = match[1];
        } else if (line.startsWith("Email:")) {
          currentCustomer.email = line.substring(6).trim();
        } else if (line.startsWith("Phone:")) {
          currentCustomer.phone = line.substring(6).trim();
        } else if (line.startsWith("Company:")) {
          currentCustomer.company = line.substring(8).trim();
        } else if (line.startsWith("Created:")) {
          currentCustomer.created = line.substring(8).trim();
        } else if (line.startsWith("### Billing Address")) {
          inAddress = true;
          currentCustomer.billingAddress = {};
        } else if (line.startsWith("### Notes")) {
          inAddress = false;
        } else if (inAddress && currentCustomer.billingAddress) {
          if (line.startsWith("Street:")) {
            currentCustomer.billingAddress.street = line.substring(7).trim();
          } else if (line.startsWith("City:")) {
            currentCustomer.billingAddress.city = line.substring(5).trim();
          } else if (line.startsWith("State:")) {
            currentCustomer.billingAddress.state = line.substring(6).trim();
          } else if (line.startsWith("Postal Code:")) {
            currentCustomer.billingAddress.postalCode = line.substring(12).trim();
          } else if (line.startsWith("Country:")) {
            currentCustomer.billingAddress.country = line.substring(8).trim();
          }
        } else if (line.trim() && !line.startsWith("<!--") && !line.startsWith("###") && !inAddress) {
          currentCustomer.notes = (currentCustomer.notes || "") + line.trim() + "\n";
        }
      }
    }

    if (currentCustomer?.name) customers.push(currentCustomer as Customer);
    return customers;
  }

  async saveCustomers(customers: Customer[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Customers -->") || lines[i].startsWith("# Customers"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# Customers")) {
        endIndex = i;
        break;
      }
    }

    let customersContent = "<!-- Customers -->\n# Customers\n\n";
    for (const customer of customers) {
      customersContent += `## ${customer.name}\n`;
      customersContent += `<!-- id: ${customer.id} -->\n`;
      if (customer.email) customersContent += `Email: ${customer.email}\n`;
      if (customer.phone) customersContent += `Phone: ${customer.phone}\n`;
      if (customer.company) customersContent += `Company: ${customer.company}\n`;
      customersContent += `Created: ${customer.created}\n`;
      if (customer.billingAddress) {
        customersContent += `\n### Billing Address\n`;
        if (customer.billingAddress.street) customersContent += `Street: ${customer.billingAddress.street}\n`;
        if (customer.billingAddress.city) customersContent += `City: ${customer.billingAddress.city}\n`;
        if (customer.billingAddress.state) customersContent += `State: ${customer.billingAddress.state}\n`;
        if (customer.billingAddress.postalCode) customersContent += `Postal Code: ${customer.billingAddress.postalCode}\n`;
        if (customer.billingAddress.country) customersContent += `Country: ${customer.billingAddress.country}\n`;
      }
      if (customer.notes) {
        customersContent += `\n### Notes\n${customer.notes.trim()}\n`;
      }
      customersContent += "\n";
    }

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
    const rates: BillingRate[] = [];

    let inRatesSection = false;
    let currentRate: Partial<BillingRate> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!inRatesSection && (line.startsWith("# Billing Rates") || line.includes("<!-- Billing Rates -->"))) {
        inRatesSection = true;
        continue;
      }
      if (inRatesSection && line.startsWith("# Billing Rates")) {
        continue;
      }

      if (inRatesSection && line.startsWith("# ") && !line.startsWith("# Billing Rates")) {
        if (currentRate?.name) rates.push(currentRate as BillingRate);
        currentRate = null;
        break;
      }

      if (!inRatesSection) continue;

      if (line.startsWith("## ")) {
        if (currentRate?.name) rates.push(currentRate as BillingRate);
        const name = line.substring(3).trim();
        currentRate = {
          id: crypto.randomUUID().substring(0, 8),
          name,
          hourlyRate: 0,
        };
      } else if (currentRate) {
        if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentRate.id = match[1];
        } else if (line.startsWith("Hourly Rate:")) {
          currentRate.hourlyRate = parseFloat(line.substring(12).trim()) || 0;
        } else if (line.startsWith("Assignee:")) {
          currentRate.assignee = line.substring(9).trim();
        } else if (line.startsWith("Default:")) {
          currentRate.isDefault = line.substring(8).trim().toLowerCase() === "true";
        }
      }
    }

    if (currentRate?.name) rates.push(currentRate as BillingRate);
    return rates;
  }

  async saveBillingRates(rates: BillingRate[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Billing Rates -->") || lines[i].startsWith("# Billing Rates"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# Billing Rates")) {
        endIndex = i;
        break;
      }
    }

    let ratesContent = "<!-- Billing Rates -->\n# Billing Rates\n\n";
    for (const rate of rates) {
      ratesContent += `## ${rate.name}\n`;
      ratesContent += `<!-- id: ${rate.id} -->\n`;
      ratesContent += `Hourly Rate: ${rate.hourlyRate}\n`;
      if (rate.assignee) ratesContent += `Assignee: ${rate.assignee}\n`;
      if (rate.isDefault) ratesContent += `Default: true\n`;
      ratesContent += "\n";
    }

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
    const quotes: Quote[] = [];

    let inQuotesSection = false;
    let currentQuote: Partial<Quote> | null = null;
    let inLineItems = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!inQuotesSection && (line.startsWith("# Quotes") || line.includes("<!-- Quotes -->"))) {
        inQuotesSection = true;
        continue;
      }
      if (inQuotesSection && line.startsWith("# Quotes")) {
        continue;
      }

      if (inQuotesSection && line.startsWith("# ") && !line.startsWith("# Quotes")) {
        if (currentQuote?.title) quotes.push(currentQuote as Quote);
        currentQuote = null;
        break;
      }

      if (!inQuotesSection) continue;

      if (line.startsWith("## ")) {
        if (currentQuote?.title) quotes.push(currentQuote as Quote);
        const title = line.substring(3).trim();
        currentQuote = {
          id: crypto.randomUUID().substring(0, 8),
          number: "",
          customerId: "",
          title,
          status: "draft",
          lineItems: [],
          subtotal: 0,
          total: 0,
          created: new Date().toISOString().split("T")[0],
        };
        inLineItems = false;
      } else if (currentQuote) {
        if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentQuote.id = match[1];
        } else if (line.startsWith("Number:")) {
          currentQuote.number = line.substring(7).trim();
        } else if (line.startsWith("Customer:")) {
          currentQuote.customerId = line.substring(9).trim();
        } else if (line.startsWith("Status:")) {
          const s = line.substring(7).trim().toLowerCase();
          if (["draft", "sent", "accepted", "rejected"].includes(s)) {
            currentQuote.status = s as Quote["status"];
          }
        } else if (line.startsWith("Valid Until:")) {
          currentQuote.validUntil = line.substring(12).trim();
        } else if (line.startsWith("Tax Rate:")) {
          currentQuote.taxRate = parseFloat(line.substring(9).trim()) || 0;
        } else if (line.startsWith("Created:")) {
          currentQuote.created = line.substring(8).trim();
        } else if (line.startsWith("Sent At:")) {
          currentQuote.sentAt = line.substring(8).trim();
        } else if (line.startsWith("Accepted At:")) {
          currentQuote.acceptedAt = line.substring(12).trim();
        } else if (line.startsWith("### Line Items")) {
          inLineItems = true;
        } else if (line.startsWith("### Notes")) {
          inLineItems = false;
        } else if (inLineItems && line.startsWith("- ")) {
          // Format: - [item_id] Description | Qty: X | Rate: Y | Amount: Z
          const match = line.match(/- \[([^\]]+)\] (.+) \| Qty: ([\d.]+) \| Rate: ([\d.]+) \| Amount: ([\d.]+)/);
          if (match) {
            currentQuote.lineItems!.push({
              id: match[1],
              description: match[2].trim(),
              quantity: parseFloat(match[3]),
              rate: parseFloat(match[4]),
              amount: parseFloat(match[5]),
            });
          }
        } else if (!inLineItems && line.trim() && !line.startsWith("<!--") && !line.startsWith("###")) {
          currentQuote.notes = (currentQuote.notes || "") + line.trim() + "\n";
        }
      }
    }

    if (currentQuote?.title) quotes.push(currentQuote as Quote);

    // Recalculate totals
    for (const quote of quotes) {
      quote.subtotal = quote.lineItems.reduce((sum, item) => sum + item.amount, 0);
      quote.tax = quote.taxRate ? quote.subtotal * (quote.taxRate / 100) : 0;
      quote.total = quote.subtotal + (quote.tax || 0);
    }

    return quotes;
  }

  async saveQuotes(quotes: Quote[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Quotes -->") || lines[i].startsWith("# Quotes"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# Quotes")) {
        endIndex = i;
        break;
      }
    }

    let quotesContent = "<!-- Quotes -->\n# Quotes\n\n";
    for (const quote of quotes) {
      quotesContent += `## ${quote.title}\n`;
      quotesContent += `<!-- id: ${quote.id} -->\n`;
      quotesContent += `Number: ${quote.number}\n`;
      quotesContent += `Customer: ${quote.customerId}\n`;
      quotesContent += `Status: ${quote.status}\n`;
      if (quote.validUntil) quotesContent += `Valid Until: ${quote.validUntil}\n`;
      if (quote.taxRate) quotesContent += `Tax Rate: ${quote.taxRate}\n`;
      quotesContent += `Created: ${quote.created}\n`;
      if (quote.sentAt) quotesContent += `Sent At: ${quote.sentAt}\n`;
      if (quote.acceptedAt) quotesContent += `Accepted At: ${quote.acceptedAt}\n`;

      if (quote.lineItems.length > 0) {
        quotesContent += `\n### Line Items\n`;
        for (const item of quote.lineItems) {
          quotesContent += `- [${item.id}] ${item.description} | Qty: ${item.quantity} | Rate: ${item.rate} | Amount: ${item.amount}\n`;
        }
      }

      if (quote.notes) {
        quotesContent += `\n### Notes\n${quote.notes.trim()}\n`;
      }
      quotesContent += "\n";
    }

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
    const invoices: Invoice[] = [];

    let inInvoicesSection = false;
    let currentInvoice: Partial<Invoice> | null = null;
    let inLineItems = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!inInvoicesSection && (line.startsWith("# Invoices") || line.includes("<!-- Invoices -->"))) {
        inInvoicesSection = true;
        continue;
      }
      if (inInvoicesSection && line.startsWith("# Invoices")) {
        continue;
      }

      if (inInvoicesSection && line.startsWith("# ") && !line.startsWith("# Invoices")) {
        if (currentInvoice?.title) invoices.push(currentInvoice as Invoice);
        currentInvoice = null;
        break;
      }

      if (!inInvoicesSection) continue;

      if (line.startsWith("## ")) {
        if (currentInvoice?.title) invoices.push(currentInvoice as Invoice);
        const title = line.substring(3).trim();
        currentInvoice = {
          id: crypto.randomUUID().substring(0, 8),
          number: "",
          customerId: "",
          title,
          status: "draft",
          lineItems: [],
          subtotal: 0,
          total: 0,
          paidAmount: 0,
          created: new Date().toISOString().split("T")[0],
        };
        inLineItems = false;
      } else if (currentInvoice) {
        if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentInvoice.id = match[1];
        } else if (line.startsWith("<!-- quoteId:")) {
          const match = line.match(/<!-- quoteId: ([^ ]+)/);
          if (match) currentInvoice.quoteId = match[1];
        } else if (line.startsWith("Number:")) {
          currentInvoice.number = line.substring(7).trim();
        } else if (line.startsWith("Customer:")) {
          currentInvoice.customerId = line.substring(9).trim();
        } else if (line.startsWith("Status:")) {
          const s = line.substring(7).trim().toLowerCase();
          if (["draft", "sent", "paid", "overdue", "cancelled"].includes(s)) {
            currentInvoice.status = s as Invoice["status"];
          }
        } else if (line.startsWith("Due Date:")) {
          currentInvoice.dueDate = line.substring(9).trim();
        } else if (line.startsWith("Tax Rate:")) {
          currentInvoice.taxRate = parseFloat(line.substring(9).trim()) || 0;
        } else if (line.startsWith("Paid Amount:")) {
          currentInvoice.paidAmount = parseFloat(line.substring(12).trim()) || 0;
        } else if (line.startsWith("Created:")) {
          currentInvoice.created = line.substring(8).trim();
        } else if (line.startsWith("Sent At:")) {
          currentInvoice.sentAt = line.substring(8).trim();
        } else if (line.startsWith("Paid At:")) {
          currentInvoice.paidAt = line.substring(8).trim();
        } else if (line.startsWith("### Line Items")) {
          inLineItems = true;
        } else if (line.startsWith("### Notes")) {
          inLineItems = false;
        } else if (inLineItems && line.startsWith("- ")) {
          // Format: - [item_id] Description | Qty: X | Rate: Y | Amount: Z | Task: taskId | TimeEntries: id1,id2
          const basicMatch = line.match(/- \[([^\]]+)\] (.+?) \| Qty: ([\d.]+) \| Rate: ([\d.]+) \| Amount: ([\d.]+)/);
          if (basicMatch) {
            const item: InvoiceLineItem = {
              id: basicMatch[1],
              description: basicMatch[2].trim(),
              quantity: parseFloat(basicMatch[3]),
              rate: parseFloat(basicMatch[4]),
              amount: parseFloat(basicMatch[5]),
            };
            const taskMatch = line.match(/Task: ([^\s|]+)/);
            if (taskMatch) item.taskId = taskMatch[1];
            const timeMatch = line.match(/TimeEntries: ([^\s]+)/);
            if (timeMatch) item.timeEntryIds = timeMatch[1].split(",");
            currentInvoice.lineItems!.push(item);
          }
        } else if (!inLineItems && line.trim() && !line.startsWith("<!--") && !line.startsWith("###")) {
          currentInvoice.notes = (currentInvoice.notes || "") + line.trim() + "\n";
        }
      }
    }

    if (currentInvoice?.title) invoices.push(currentInvoice as Invoice);

    // Recalculate totals
    for (const invoice of invoices) {
      invoice.subtotal = invoice.lineItems.reduce((sum, item) => sum + item.amount, 0);
      invoice.tax = invoice.taxRate ? invoice.subtotal * (invoice.taxRate / 100) : 0;
      invoice.total = invoice.subtotal + (invoice.tax || 0);
    }

    return invoices;
  }

  async saveInvoices(invoices: Invoice[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Invoices -->") || lines[i].startsWith("# Invoices"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# Invoices")) {
        endIndex = i;
        break;
      }
    }

    let invoicesContent = "<!-- Invoices -->\n# Invoices\n\n";
    for (const invoice of invoices) {
      invoicesContent += `## ${invoice.title}\n`;
      invoicesContent += `<!-- id: ${invoice.id} -->\n`;
      if (invoice.quoteId) invoicesContent += `<!-- quoteId: ${invoice.quoteId} -->\n`;
      invoicesContent += `Number: ${invoice.number}\n`;
      invoicesContent += `Customer: ${invoice.customerId}\n`;
      invoicesContent += `Status: ${invoice.status}\n`;
      if (invoice.dueDate) invoicesContent += `Due Date: ${invoice.dueDate}\n`;
      if (invoice.taxRate) invoicesContent += `Tax Rate: ${invoice.taxRate}\n`;
      invoicesContent += `Paid Amount: ${invoice.paidAmount}\n`;
      invoicesContent += `Created: ${invoice.created}\n`;
      if (invoice.sentAt) invoicesContent += `Sent At: ${invoice.sentAt}\n`;
      if (invoice.paidAt) invoicesContent += `Paid At: ${invoice.paidAt}\n`;

      if (invoice.lineItems.length > 0) {
        invoicesContent += `\n### Line Items\n`;
        for (const item of invoice.lineItems) {
          let lineStr = `- [${item.id}] ${item.description} | Qty: ${item.quantity} | Rate: ${item.rate} | Amount: ${item.amount}`;
          if (item.taskId) lineStr += ` | Task: ${item.taskId}`;
          if (item.timeEntryIds?.length) lineStr += ` | TimeEntries: ${item.timeEntryIds.join(",")}`;
          invoicesContent += lineStr + "\n";
        }
      }

      if (invoice.notes) {
        invoicesContent += `\n### Notes\n${invoice.notes.trim()}\n`;
      }
      invoicesContent += "\n";
    }

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
    const payments: Payment[] = [];

    let inPaymentsSection = false;
    let currentPayment: Partial<Payment> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!inPaymentsSection && (line.startsWith("# Payments") || line.includes("<!-- Payments -->"))) {
        inPaymentsSection = true;
        continue;
      }
      if (inPaymentsSection && line.startsWith("# Payments")) {
        continue;
      }

      if (inPaymentsSection && line.startsWith("# ") && !line.startsWith("# Payments")) {
        if (currentPayment?.invoiceId) payments.push(currentPayment as Payment);
        currentPayment = null;
        break;
      }

      if (!inPaymentsSection) continue;

      if (line.startsWith("## ")) {
        if (currentPayment?.invoiceId) payments.push(currentPayment as Payment);
        currentPayment = {
          id: crypto.randomUUID().substring(0, 8),
          invoiceId: "",
          amount: 0,
          date: new Date().toISOString().split("T")[0],
        };
      } else if (currentPayment) {
        if (line.startsWith("<!-- id:")) {
          const match = line.match(/<!-- id: ([^ ]+)/);
          if (match) currentPayment.id = match[1];
        } else if (line.startsWith("Invoice:")) {
          currentPayment.invoiceId = line.substring(8).trim();
        } else if (line.startsWith("Amount:")) {
          currentPayment.amount = parseFloat(line.substring(7).trim()) || 0;
        } else if (line.startsWith("Date:")) {
          currentPayment.date = line.substring(5).trim();
        } else if (line.startsWith("Method:")) {
          const m = line.substring(7).trim().toLowerCase();
          if (["bank", "card", "cash", "other"].includes(m)) {
            currentPayment.method = m as Payment["method"];
          }
        } else if (line.startsWith("Reference:")) {
          currentPayment.reference = line.substring(10).trim();
        } else if (line.trim() && !line.startsWith("<!--") && !line.startsWith("##")) {
          currentPayment.notes = (currentPayment.notes || "") + line.trim() + "\n";
        }
      }
    }

    if (currentPayment?.invoiceId) payments.push(currentPayment as Payment);
    return payments;
  }

  async savePayments(payments: Payment[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (startIndex === -1 && (lines[i].includes("<!-- Payments -->") || lines[i].startsWith("# Payments"))) {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].startsWith("# ") && !lines[i].startsWith("# Payments")) {
        endIndex = i;
        break;
      }
    }

    let paymentsContent = "<!-- Payments -->\n# Payments\n\n";
    for (const payment of payments) {
      paymentsContent += `## Payment ${payment.id}\n`;
      paymentsContent += `<!-- id: ${payment.id} -->\n`;
      paymentsContent += `Invoice: ${payment.invoiceId}\n`;
      paymentsContent += `Amount: ${payment.amount}\n`;
      paymentsContent += `Date: ${payment.date}\n`;
      if (payment.method) paymentsContent += `Method: ${payment.method}\n`;
      if (payment.reference) paymentsContent += `Reference: ${payment.reference}\n`;
      if (payment.notes) paymentsContent += `\n${payment.notes.trim()}\n`;
      paymentsContent += "\n";
    }

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
    const year = new Date().getFullYear();
    const existingNumbers = quotes
      .filter(q => q.number.startsWith(`Q-${year}-`))
      .map(q => parseInt(q.number.replace(`Q-${year}-`, "")) || 0);
    const nextNum = Math.max(0, ...existingNumbers) + 1;
    return `Q-${year}-${nextNum.toString().padStart(3, "0")}`;
  }

  // Generate next invoice number
  async getNextInvoiceNumber(): Promise<string> {
    const invoices = await this.readInvoices();
    const year = new Date().getFullYear();
    const existingNumbers = invoices
      .filter(inv => inv.number.startsWith(`INV-${year}-`))
      .map(inv => parseInt(inv.number.replace(`INV-${year}-`, "")) || 0);
    const nextNum = Math.max(0, ...existingNumbers) + 1;
    return `INV-${year}-${nextNum.toString().padStart(3, "0")}`;
  }
}
