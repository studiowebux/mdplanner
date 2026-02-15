/**
 * Canvas parser class for parsing and serializing canvas-related markdown.
 * Handles sticky notes and mindmaps parsing, serialization, and CRUD helpers.
 */
import { Mindmap, MindmapNode, StickyNote } from "../types.ts";
import { BaseParser } from "./core.ts";

export class CanvasParser extends BaseParser {
  constructor(filePath: string) {
    super(filePath);
  }

  /**
   * Parses the canvas section from markdown lines starting at the given index.
   * Returns the parsed sticky notes and the next line index to process.
   */
  parseCanvasSection(
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
            const [, title] = configMatch;
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

            // Check for ID comment (supports both sticky_1 and sticky_note_1 formats)
            const idMatch = currentLine.match(
              /<!-- id: (sticky_?\d+|sticky_note_\d+) -->/,
            );
            if (idMatch) {
              stickyNoteId = idMatch[1];
              i++; // Move past the ID comment
              break;
            }

            // Stop if we hit another sticky note or section (but not ID comments)
            if (
              currentLine.startsWith("## ") ||
              currentLine.startsWith("# ") ||
              (currentLine.startsWith("<!--") && !currentLine.includes("id:"))
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
              currentLine.startsWith("## ") ||
              currentLine.startsWith("# ") ||
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
                bodyContent += (bodyContent ? "\n" : "") + cleanContent.trim();
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

  /**
   * Parses the mindmap section from markdown lines starting at the given index.
   * Returns the parsed mindmaps and the next line index to process.
   */
  parseMindmapSection(
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
                    // Don't add to children array here - the flat nodes array is the source of truth
                    // The children array will be populated by the frontend when rendering
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

  /**
   * Generates the next sticky note ID based on existing sticky notes in the file.
   * Supports both sticky_X and sticky_note_X formats.
   */
  generateStickyNoteId(): string {
    try {
      const content = Deno.readTextFileSync(this.filePath);
      // Match both sticky_X and sticky_note_X formats
      const stickyNoteIdMatches =
        content.match(/<!-- id: sticky_?(?:note_)?(\d+) -->/g) || [];
      const maxId = Math.max(
        0,
        ...stickyNoteIdMatches.map((match) => {
          const idMatch = match.match(/sticky_?(?:note_)?(\d+)/);
          return idMatch ? parseInt(idMatch[1]) : 0;
        }),
      );
      return `sticky_${maxId + 1}`;
    } catch {
      return "sticky_1";
    }
  }

  /**
   * Generates the next mindmap ID based on existing mindmaps in the file.
   */
  generateMindmapId(): string {
    try {
      const content = Deno.readTextFileSync(this.filePath);
      const mindmapIdMatches =
        content.match(/<!-- id: mindmap_(\d+) -->/g) || [];
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

  /**
   * Converts a sticky note to markdown format.
   */
  stickyNoteToMarkdown(stickyNote: StickyNote): string {
    const sizeStr = stickyNote.size
      ? `; size: {width: ${stickyNote.size.width}, height: ${stickyNote.size.height}}`
      : "";

    return [
      `## Sticky note {color: ${stickyNote.color}; position: {x: ${stickyNote.position.x}, y: ${stickyNote.position.y}}${sizeStr}}`,
      "",
      `<!-- id: ${stickyNote.id} -->`,
      stickyNote.content,
      "",
    ].join("\n");
  }

  /**
   * Serializes all sticky notes to markdown format.
   */
  stickyNotesToMarkdown(stickyNotes: StickyNote[]): string {
    let content = "<!-- Canvas -->\n# Canvas\n\n";
    for (const stickyNote of stickyNotes) {
      content += this.stickyNoteToMarkdown(stickyNote);
    }
    return content;
  }

  /**
   * Converts a mindmap node to markdown format (recursive).
   */
  mindmapNodeToMarkdown(
    node: MindmapNode,
    allNodes: MindmapNode[],
    level: number,
  ): string {
    const indent = "  ".repeat(level);
    let result = `${indent}- ${node.text}\n`;

    // Find children from flat array using parent field
    const children = allNodes.filter((n) => n.parent === node.id);
    for (const child of children) {
      result += this.mindmapNodeToMarkdown(child, allNodes, level + 1);
    }

    return result;
  }

  /**
   * Converts a mindmap to markdown format.
   */
  mindmapToMarkdown(mindmap: Mindmap): string {
    let content = `## ${mindmap.title}\n\n`;
    content += `<!-- id: ${mindmap.id} -->\n\n`;

    // Write mindmap nodes as nested list
    const rootNodes = mindmap.nodes.filter((node) => node.level === 0);
    for (const rootNode of rootNodes) {
      content += this.mindmapNodeToMarkdown(rootNode, mindmap.nodes, 0);
    }
    content += "\n";

    return content;
  }

  /**
   * Serializes all mindmaps to markdown format.
   */
  mindmapsToMarkdown(mindmaps: Mindmap[]): string {
    let content = "<!-- Mindmap -->\n# Mindmap\n\n";
    for (const mindmap of mindmaps) {
      content += this.mindmapToMarkdown(mindmap);
    }
    return content;
  }

  /**
   * Updates a sticky note in the sticky notes array.
   * Returns the updated array and success status.
   */
  updateStickyNoteInList(
    stickyNotes: StickyNote[],
    stickyNoteId: string,
    updates: Partial<Omit<StickyNote, "id">>,
  ): { stickyNotes: StickyNote[]; success: boolean } {
    const index = stickyNotes.findIndex((s) => s.id === stickyNoteId);

    if (index === -1) {
      return { stickyNotes, success: false };
    }

    stickyNotes[index] = {
      ...stickyNotes[index],
      ...updates,
    };

    return { stickyNotes, success: true };
  }

  /**
   * Deletes a sticky note from the sticky notes array.
   * Returns the filtered array and success status.
   */
  deleteStickyNoteFromList(
    stickyNotes: StickyNote[],
    stickyNoteId: string,
  ): { stickyNotes: StickyNote[]; success: boolean } {
    const originalLength = stickyNotes.length;
    const filtered = stickyNotes.filter((s) => s.id !== stickyNoteId);
    return {
      stickyNotes: filtered,
      success: filtered.length !== originalLength,
    };
  }

  /**
   * Creates a new sticky note with generated ID.
   */
  createStickyNote(stickyNote: Omit<StickyNote, "id">): StickyNote {
    return {
      ...stickyNote,
      id: this.generateStickyNoteId(),
    };
  }

  /**
   * Updates a mindmap in the mindmaps array.
   * Returns the updated array and success status.
   */
  updateMindmapInList(
    mindmaps: Mindmap[],
    mindmapId: string,
    updates: Partial<Omit<Mindmap, "id">>,
  ): { mindmaps: Mindmap[]; success: boolean } {
    const index = mindmaps.findIndex((m) => m.id === mindmapId);

    if (index === -1) {
      return { mindmaps, success: false };
    }

    mindmaps[index] = {
      ...mindmaps[index],
      ...updates,
    };

    return { mindmaps, success: true };
  }

  /**
   * Deletes a mindmap from the mindmaps array.
   * Returns the filtered array and success status.
   */
  deleteMindmapFromList(
    mindmaps: Mindmap[],
    mindmapId: string,
  ): { mindmaps: Mindmap[]; success: boolean } {
    const originalLength = mindmaps.length;
    const filtered = mindmaps.filter((m) => m.id !== mindmapId);
    return {
      mindmaps: filtered,
      success: filtered.length !== originalLength,
    };
  }

  /**
   * Creates a new mindmap with generated ID.
   */
  createMindmap(mindmap: Omit<Mindmap, "id">): Mindmap {
    return {
      ...mindmap,
      id: this.generateMindmapId(),
    };
  }

  /**
   * Parses a config string with nested braces handling.
   * Returns an array of key-value pairs.
   */
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
      let braceCount = 0;
      const valueStart = i;

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

      const value = configStr.substring(valueStart, i).trim();
      pairs.push([key, value]);

      // Skip the semicolon and whitespace
      i++;
      while (i < configStr.length && configStr[i] === " ") i++;
    }

    return pairs;
  }

  /**
   * Adds a sticky note to the file by finding the Canvas section and inserting.
   */
  async addStickyNoteToFile(stickyNote: StickyNote): Promise<void> {
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

    // Generate sticky note markdown
    const stickyNoteLines = this.stickyNoteToMarkdown(stickyNote).split("\n");

    lines.splice(insertIndex, 0, ...stickyNoteLines);
    await this.safeWriteFile(lines.join("\n"));
  }

  /**
   * Updates a sticky note in the file by finding it by ID and replacing.
   */
  async updateStickyNoteInFile(
    stickyNoteId: string,
    stickyNote: StickyNote,
  ): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    // Find the sticky note by ID (supports both sticky_1 and sticky_note_1 formats)
    let stickyNoteStart = -1;
    let stickyNoteEnd = -1;

    for (let i = 0; i < lines.length; i++) {
      const idMatch = lines[i]
        .trim()
        .match(/<!-- id: (sticky_?\d+|sticky_note_\d+) -->/);
      if (idMatch && idMatch[1] === stickyNoteId) {
        // Found the ID comment, now find the header
        for (let j = i - 1; j >= 0; j--) {
          if (lines[j].trim().startsWith("## ") && lines[j].includes("{")) {
            stickyNoteStart = j;
            break;
          }
        }

        // Find end of this sticky note (next sticky note, section header, or section comment)
        for (let j = i + 1; j < lines.length; j++) {
          const trimmedLine = lines[j].trim();
          if (
            trimmedLine.startsWith("## ") ||
            trimmedLine.startsWith("# ") ||
            (trimmedLine.startsWith("<!--") &&
              !trimmedLine.includes("id:") &&
              trimmedLine.match(
                /<!-- (Mindmap|Board|Notes|Goals|Canvas|C4) -->/,
              ))
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

    // Generate new sticky note markdown (preserving original ID format)
    const newStickyNoteLines = this.stickyNoteToMarkdownWithId(
      stickyNote,
      stickyNoteId,
    ).split("\n");

    // Replace the old sticky note with the new one
    lines.splice(
      stickyNoteStart,
      stickyNoteEnd - stickyNoteStart,
      ...newStickyNoteLines,
    );
    await this.safeWriteFile(lines.join("\n"));
  }

  /**
   * Converts a sticky note to markdown format, preserving the original ID.
   */
  stickyNoteToMarkdownWithId(stickyNote: StickyNote, originalId: string): string {
    const sizeStr = stickyNote.size
      ? `; size: {width: ${stickyNote.size.width}, height: ${stickyNote.size.height}}`
      : "";

    return [
      `## Sticky note {color: ${stickyNote.color}; position: {x: ${Math.round(stickyNote.position.x)}, y: ${Math.round(stickyNote.position.y)}}${sizeStr}}`,
      "",
      `<!-- id: ${originalId} -->`,
      stickyNote.content,
      "",
    ].join("\n");
  }
}
