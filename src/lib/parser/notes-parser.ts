/**
 * Notes parser class for parsing and serializing note-related markdown.
 * Handles note CRUD operations and markdown conversion.
 */
import { Note } from "../types.ts";
import { BaseParser } from "./core.ts";

export class NotesParser extends BaseParser {
  constructor(filePath: string) {
    super(filePath);
  }

  /**
   * Parses the notes section from markdown lines starting at the given index.
   * Returns the parsed notes and the next line index to process.
   *
   * Handles enhanced mode notes with custom sections that may contain ## headers.
   * Custom sections are delimited by:
   *   <!-- Custom Section: ... -->  (start)
   *   <!-- End Custom Section -->   (end)
   */
  parseNotesSection(
    lines: string[],
    startIndex: number,
  ): { notes: Note[]; nextIndex: number } {
    const notes: Note[] = [];
    let i = startIndex;

    while (i < lines.length) {
      const line = lines[i].trim();

      // Stop at next major section (# header or section boundary comment)
      if (line.startsWith("# ") && !line.startsWith("## ")) {
        break;
      }

      // Stop at section boundary comments (excluding custom section markers)
      if (line.match(/^<!-- (Board|Goals|Configurations|Canvas|Mindmap|C4 Architecture|Milestones|Ideas|Retrospectives|SWOT|Risk|Lean|Business|Brief|Time|Capacity|Strategic|Billing|Companies|Contacts|Deals|Interactions) -->$/)) {
        break;
      }

      // Parse note tab (## Note Title)
      if (line.startsWith("## ")) {
        const title = line.substring(3).trim();
        const noteContent: string[] = [];
        let customSectionDepth = 0;
        i++;

        // Collect note content until next note or major section
        while (i < lines.length) {
          const contentLine = lines[i];
          const trimmedLine = contentLine.trim();

          // Track custom section depth
          if (trimmedLine.match(/^<!-- Custom Section:/)) {
            customSectionDepth++;
          } else if (trimmedLine === "<!-- End Custom Section -->") {
            customSectionDepth = Math.max(0, customSectionDepth - 1);
          }

          // Break on section boundary comments (but not custom section markers)
          if (
            trimmedLine.match(/^<!-- (Board|Goals|Configurations|Canvas|Mindmap|C4 Architecture|Milestones|Ideas|Retrospectives|SWOT|Risk|Lean|Business|Brief|Time|Capacity|Strategic|Billing|Companies|Contacts|Deals|Interactions) -->$/)
          ) {
            break;
          }

          // Check if this is a new note ONLY if we're not inside a custom section
          if (customSectionDepth === 0 && trimmedLine.startsWith("## ")) {
            // Look ahead to see if there's an ID comment coming up
            let hasIdComment = false;
            for (
              let lookAhead = i + 1;
              lookAhead < Math.min(i + 5, lines.length);
              lookAhead++
            ) {
              const lookAheadLine = lines[lookAhead].trim();
              if (lookAheadLine.match(/<!-- id: note_[\w]+ /)) {
                hasIdComment = true;
                break;
              }
              // If we hit another ## or section boundary, stop looking
              if (
                lookAheadLine.startsWith("## ") ||
                lookAheadLine.match(/^<!-- (Board|Goals|Configurations|Canvas|Mindmap) -->$/)
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
          /<!-- id: (note_[\w]+) \| created: ([^|]+) \| updated: ([^|]+) \| rev: (\d+) -->/,
        );
        if (metadataMatch) {
          noteId = metadataMatch[1];
          createdAt = metadataMatch[2].trim();
          updatedAt = metadataMatch[3].trim();
          revision = parseInt(metadataMatch[4], 10);
          actualContent = actualContent
            .replace(
              /<!-- id: note_[\w]+ \| created: [^|]+ \| updated: [^|]+ \| rev: \d+ -->\s*/,
              "",
            )
            .trim();
        } else {
          // Fall back to old format (id only)
          const idMatch = actualContent.match(/<!-- id: (note_[\w]+) -->/);
          if (idMatch) {
            noteId = idMatch[1];
            actualContent = actualContent
              .replace(/<!-- id: note_[\w]+ -->\s*/, "")
              .trim();
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

  /**
   * Generates the next note ID based on existing notes in the file.
   */
  generateNoteId(): string {
    try {
      const content = Deno.readTextFileSync(this.filePath);
      const noteIdMatches = content.match(/<!-- id: note_(\d+)/g) || [];
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

  /**
   * Converts a note to markdown format.
   */
  noteToMarkdown(note: Note): string {
    let result = `## ${note.title}\n\n`;
    result += `<!-- id: ${note.id} | created: ${note.createdAt} | updated: ${note.updatedAt} | rev: ${note.revision || 1} -->\n`;
    if (note.content && note.content.trim()) {
      result += `${note.content}\n\n`;
    } else {
      result += `\n`;
    }
    return result;
  }

  /**
   * Serializes all notes to markdown format.
   */
  notesToMarkdown(notes: Note[]): string {
    let content = "<!-- Notes -->\n# Notes\n\n";
    for (const note of notes) {
      content += this.noteToMarkdown(note);
    }
    return content;
  }

  /**
   * Updates a note in the notes array.
   * Returns the updated array and success status.
   */
  updateNoteInList(
    notes: Note[],
    noteId: string,
    updates: Partial<Omit<Note, "id" | "createdAt" | "revision">>,
  ): { notes: Note[]; success: boolean } {
    const noteIndex = notes.findIndex((note) => note.id === noteId);

    if (noteIndex === -1) {
      return { notes, success: false };
    }

    const currentNote = notes[noteIndex];
    notes[noteIndex] = {
      ...currentNote,
      ...updates,
      updatedAt: new Date().toISOString(),
      revision: (currentNote.revision || 1) + 1,
    };

    return { notes, success: true };
  }

  /**
   * Deletes a note from the notes array.
   * Returns the filtered array and success status.
   */
  deleteNoteFromList(
    notes: Note[],
    noteId: string,
  ): { notes: Note[]; success: boolean } {
    const originalLength = notes.length;
    const filtered = notes.filter((note) => note.id !== noteId);
    return {
      notes: filtered,
      success: filtered.length !== originalLength,
    };
  }

  /**
   * Creates a new note with generated ID and timestamps.
   */
  createNote(
    note: Omit<Note, "id" | "createdAt" | "updatedAt" | "revision">,
  ): Note {
    return {
      ...note,
      id: this.generateNoteId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revision: 1,
    };
  }

  /**
   * Finds the Notes section boundaries in the file.
   * Returns startIndex (line with marker) and endIndex (line of next section).
   *
   * Section boundaries are marked by:
   *   <!-- SectionName --> where SectionName is a known section like Goals, Canvas, Board, etc.
   *   # SectionName
   *
   * Does NOT treat custom section markers as section boundaries:
   *   <!-- Custom Section: ... --> and <!-- End Custom Section --> are part of note content.
   */
  findNotesSection(lines: string[]): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    // Known section boundary patterns
    const sectionBoundaryPattern = /^<!-- (Goals|Canvas|Mindmap|C4 Architecture|Board|Configurations|Milestones|Ideas|Retrospectives|SWOT Analysis|Risk Analysis|Lean Canvas|Business Model|Project Value Board|Brief|Time Tracking|Capacity Planning|Strategic Levels|Billing|Customers|Billing Rates|Quotes|Invoices|Companies|Contacts|Deals|Interactions) -->$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (startIndex === -1) {
        if (line === "<!-- Notes -->" || line === "# Notes") {
          startIndex = line === "<!-- Notes -->" ? i : i;
          // If we found "# Notes", check if there's a comment before it
          if (line === "# Notes" && i > 0 && lines[i - 1].trim() === "<!-- Notes -->") {
            startIndex = i - 1;
          }
        }
      } else {
        // Look for the next section - must be a known section boundary
        if (sectionBoundaryPattern.test(line)) {
          endIndex = i;
          break;
        }
        // Also check for # headers that are sections (not ## which are notes/content)
        if (line.startsWith("# ") && !line.startsWith("## ") && line !== "# Notes") {
          endIndex = i;
          break;
        }
      }
    }

    return { startIndex, endIndex };
  }

  /**
   * Reads all notes from the file using section-specific parsing.
   */
  async readNotes(): Promise<Note[]> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");
    const { startIndex } = this.findNotesSection(lines);

    if (startIndex === -1) {
      return [];
    }

    // Find the first ## header after the section start
    let parseStart = startIndex;
    for (let i = startIndex; i < lines.length; i++) {
      if (lines[i].trim().startsWith("## ")) {
        parseStart = i;
        break;
      }
    }

    const result = this.parseNotesSection(lines, parseStart);
    return result.notes;
  }

  /**
   * Saves notes by replacing only the Notes section in the file.
   * This preserves all other sections.
   */
  async saveNotes(notes: Note[]): Promise<void> {
    const content = await Deno.readTextFile(this.filePath);
    const lines = content.split("\n");

    const { startIndex, endIndex } = this.findNotesSection(lines);
    const notesContent = this.notesToMarkdown(notes);

    if (startIndex === -1) {
      // No Notes section exists, find where to insert it
      // Insert before Goals, Canvas, or Board
      let insertIndex = lines.length;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (
          line === "<!-- Goals -->" ||
          line === "# Goals" ||
          line === "<!-- Canvas -->" ||
          line === "# Canvas" ||
          line === "<!-- Board -->" ||
          line === "# Board"
        ) {
          insertIndex = i;
          break;
        }
      }
      lines.splice(insertIndex, 0, notesContent);
    } else {
      // Replace existing Notes section
      const before = lines.slice(0, startIndex);
      const after = endIndex !== -1 ? lines.slice(endIndex) : [];
      lines.length = 0;
      lines.push(...before, notesContent.trimEnd(), ...after);
    }

    await this.safeWriteFile(lines.join("\n"));
  }
}
