/**
 * Directory-based parser for Meetings.
 * Each meeting is stored as a separate markdown file under meetings/.
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type { Meeting, MeetingAction } from "../../types.ts";

interface MeetingFrontmatter {
  id: string;
  date: string;
  attendees?: string[];
  agenda?: string;
  actions?: MeetingAction[];
  created: string;
}

export class MeetingsDirectoryParser extends DirectoryParser<Meeting> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "meetings" });
  }

  protected parseFile(content: string, _filePath: string): Meeting | null {
    const { frontmatter, content: body } =
      parseFrontmatter<MeetingFrontmatter>(content);

    if (!frontmatter.id) {
      return null;
    }

    // Extract title from first heading; remainder is notes
    const lines = body.split("\n");
    let title = "Untitled Meeting";
    let notesStartIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("# ")) {
        title = lines[i].slice(2).trim();
        notesStartIndex = i + 1;
        break;
      }
    }

    const notes = lines.slice(notesStartIndex).join("\n").trim() || undefined;

    return {
      id: frontmatter.id,
      title,
      date: frontmatter.date || new Date().toISOString().split("T")[0],
      attendees: frontmatter.attendees,
      agenda: frontmatter.agenda,
      notes,
      actions: frontmatter.actions ?? [],
      created: frontmatter.created || new Date().toISOString(),
    };
  }

  protected serializeItem(meeting: Meeting): string {
    const frontmatter: MeetingFrontmatter = {
      id: meeting.id,
      date: meeting.date,
      created: meeting.created,
    };

    if (meeting.attendees && meeting.attendees.length > 0) {
      frontmatter.attendees = meeting.attendees;
    }
    if (meeting.agenda) frontmatter.agenda = meeting.agenda;
    if (meeting.actions && meeting.actions.length > 0) {
      frontmatter.actions = meeting.actions;
    }

    const body = `# ${meeting.title}\n\n${meeting.notes ?? ""}`;

    return buildFileContent(frontmatter, body);
  }

  async add(meeting: Omit<Meeting, "id" | "created">): Promise<Meeting> {
    const newMeeting: Meeting = {
      ...meeting,
      actions: meeting.actions ?? [],
      id: this.generateId("meeting"),
      created: new Date().toISOString(),
    };
    await this.write(newMeeting);
    return newMeeting;
  }

  async update(id: string, updates: Partial<Meeting>): Promise<Meeting | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: Meeting = {
      ...existing,
      ...updates,
      id: existing.id,
      created: existing.created,
    };
    await this.write(updated);
    return updated;
  }
}
