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
   */
  parseNotesSection(
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
              if (lines[lookAhead].trim().match(/<!-- id: note_[\w]+ /)) {
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
}
