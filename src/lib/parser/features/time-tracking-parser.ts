/**
 * Time tracking parser class for parsing and serializing time entry markdown.
 * Handles time entries per task with date, hours, person, and description.
 */
import { TimeEntry } from "../../types.ts";
import { BaseParser } from "../core.ts";

export class TimeTrackingParser extends BaseParser {
  constructor(filePath: string) {
    super(filePath);
  }

  /**
   * Parses time entries from the Time Tracking section in markdown.
   * Returns a Map of taskId to array of TimeEntry.
   */
  parseTimeTrackingSection(lines: string[]): Map<string, TimeEntry[]> {
    const timeEntries = new Map<string, TimeEntry[]>();

    let inTimeTrackingSection = false;
    let currentTaskId: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (
        line.startsWith("# Time Tracking") ||
        line.includes("<!-- Time Tracking -->")
      ) {
        inTimeTrackingSection = true;
        continue;
      }

      if (
        inTimeTrackingSection &&
        line.startsWith("# ") &&
        !line.startsWith("# Time Tracking")
      ) {
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
        const entryMatch = line
          .trim()
          .match(
            /^- (\d{4}-\d{2}-\d{2}): ([\d.]+)h(?: by ([^-]+))?(?: - (.+))?$/,
          );
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

  /**
   * Generates a unique time entry ID.
   */
  generateTimeEntryId(): string {
    return `te_${Date.now()}`;
  }

  /**
   * Converts a time entry to markdown format.
   */
  timeEntryToMarkdown(entry: TimeEntry): string {
    let line = `- ${entry.date}: ${entry.hours}h`;
    if (entry.person) line += ` by ${entry.person}`;
    if (entry.description) line += ` - ${entry.description}`;
    return line + "\n";
  }

  /**
   * Serializes all time entries to markdown format.
   */
  timeEntriesToMarkdown(timeEntries: Map<string, TimeEntry[]>): string {
    let content = "<!-- Time Tracking -->\n# Time Tracking\n\n";
    for (const [taskId, entries] of timeEntries) {
      if (entries.length === 0) continue;
      content += `## ${taskId}\n`;
      for (const entry of entries) {
        content += this.timeEntryToMarkdown(entry);
      }
      content += "\n";
    }
    return content;
  }

  /**
   * Finds the Time Tracking section boundaries in the file lines.
   */
  findTimeTrackingSection(
    lines: string[],
  ): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (
        startIndex === -1 &&
        (lines[i].includes("<!-- Time Tracking -->") ||
          lines[i].startsWith("# Time Tracking"))
      ) {
        startIndex = i;
      } else if (
        startIndex !== -1 &&
        lines[i].startsWith("# ") &&
        !lines[i].startsWith("# Time Tracking")
      ) {
        endIndex = i;
        break;
      }
    }

    return { startIndex, endIndex };
  }

  /**
   * Adds a time entry to the entries map.
   */
  addTimeEntryToMap(
    timeEntries: Map<string, TimeEntry[]>,
    taskId: string,
    entry: Omit<TimeEntry, "id">,
  ): { timeEntries: Map<string, TimeEntry[]>; newEntry: TimeEntry } {
    const entries = timeEntries.get(taskId) || [];
    const newEntry: TimeEntry = {
      ...entry,
      id: this.generateTimeEntryId(),
    };
    entries.push(newEntry);
    timeEntries.set(taskId, entries);
    return { timeEntries, newEntry };
  }

  /**
   * Deletes a time entry from the entries map.
   */
  deleteTimeEntryFromMap(
    timeEntries: Map<string, TimeEntry[]>,
    taskId: string,
    entryId: string,
  ): { timeEntries: Map<string, TimeEntry[]>; success: boolean } {
    const entries = timeEntries.get(taskId);
    if (!entries) return { timeEntries, success: false };

    const index = entries.findIndex((e) => e.id === entryId);
    if (index === -1) return { timeEntries, success: false };

    entries.splice(index, 1);
    if (entries.length === 0) {
      timeEntries.delete(taskId);
    }

    return { timeEntries, success: true };
  }

  /**
   * Gets time entries for a specific task.
   */
  getEntriesForTask(
    timeEntries: Map<string, TimeEntry[]>,
    taskId: string,
  ): TimeEntry[] {
    return timeEntries.get(taskId) || [];
  }
}
