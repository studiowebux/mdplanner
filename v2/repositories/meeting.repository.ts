// Meeting repository — markdown file CRUD under meetings/.
// Body format: # Title\n\n{notes}. Actions stored in frontmatter as array.

import type {
  CreateMeeting,
  Meeting,
  MeetingAction,
  UpdateMeeting,
} from "../types/meeting.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { MEETING_TABLE, rowToMeeting } from "../domains/meeting/cache.ts";

/** Frontmatter keys whose values live in the markdown body, not frontmatter. */
const MEETING_BODY_KEYS = ["title", "notes"] as const;

export class MeetingRepository extends CachedMarkdownRepository<
  Meeting,
  CreateMeeting,
  UpdateMeeting
> {
  protected readonly tableName = MEETING_TABLE;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "meetings",
      idPrefix: "meeting",
      nameField: "title",
    });
  }

  protected rowToEntity(row: Record<string, unknown>): Meeting {
    return rowToMeeting(row);
  }

  protected fromCreateInput(
    data: CreateMeeting,
    id: string,
    now: string,
  ): Meeting {
    return {
      ...data,
      id,
      title: data.title ?? "Untitled Meeting",
      date: data.date ?? new Date().toISOString().split("T")[0],
      attendees: data.attendees ?? [],
      actions: data.actions ?? [],
      relatedMeetings: data.relatedMeetings ?? [],
      createdAt: now,
      updatedAt: now,
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Meeting | null {
    if (!fm.id && !fm.title) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

    // Extract title from first H1; remainder is notes
    const lines = body.trim().split("\n");
    let title = fm.title ? String(fm.title) : "Untitled Meeting";
    let notesStartIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("# ")) {
        title = lines[i].slice(2).trim();
        notesStartIndex = i + 1;
        break;
      }
    }

    const notes = lines.slice(notesStartIndex).join("\n").trim() || undefined;

    const rawActions = Array.isArray(fm.actions) ? fm.actions : [];
    const actions: MeetingAction[] = rawActions.map((a, i) => ({
      id: a.id ? String(a.id) : `action_${Date.now()}_${i}`,
      description: String(a.description ?? ""),
      owner: a.owner != null ? String(a.owner) : undefined,
      due: a.due != null ? String(a.due) : undefined,
      status: a.status === "done" ? "done" : "open",
    }));

    return {
      id,
      title,
      date: fm.date != null
        ? String(fm.date)
        : new Date().toISOString().split("T")[0],
      attendees: Array.isArray(fm.attendees)
        ? fm.attendees.map(String).filter(Boolean)
        : [],
      agenda: fm.agenda != null ? String(fm.agenda) : undefined,
      notes,
      actions,
      createdAt: fm.created_at
        ? String(fm.created_at)
        : new Date().toISOString(),
      updatedAt: fm.updated_at
        ? String(fm.updated_at)
        : new Date().toISOString(),
      project: fm.project != null ? String(fm.project) : undefined,
      relatedMeetings: Array.isArray(fm.related_meetings)
        ? [...new Set(fm.related_meetings.map(String).filter(Boolean))]
        : [],
      createdBy: fm.created_by != null ? String(fm.created_by) : undefined,
      updatedBy: fm.updated_by != null ? String(fm.updated_by) : undefined,
    };
  }

  protected serialize(item: Meeting): string {
    return this.serializeStandard(
      item,
      MEETING_BODY_KEYS,
      this.buildBody(item),
    );
  }

  private buildBody(item: Meeting): string {
    const parts: string[] = [`# ${item.title}`];
    if (item.notes) {
      parts.push("", item.notes);
    }
    return parts.join("\n");
  }

  async readByName(name: string): Promise<Meeting | null> {
    const all = await this.findAll();
    return all.find((m) => m.title.toLowerCase() === name.toLowerCase()) ??
      null;
  }
}
