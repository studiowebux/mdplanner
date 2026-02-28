/**
 * Notes statistics provider.
 */

import { DirectoryMarkdownParser } from "../../parser/directory/parser.ts";

export interface NotesStats {
  total: number;
  last30Days: number;
  last7Days: number;
}

export async function collectNotesStats(
  parser: DirectoryMarkdownParser,
): Promise<NotesStats> {
  const notes = await parser.readNotes();

  const now = new Date();
  const cutoff30 = new Date(now);
  cutoff30.setDate(now.getDate() - 30);
  const cutoff7 = new Date(now);
  cutoff7.setDate(now.getDate() - 7);

  let last30Days = 0;
  let last7Days = 0;

  for (const note of notes) {
    const created = new Date(note.createdAt);
    if (created >= cutoff30) last30Days++;
    if (created >= cutoff7) last7Days++;
  }

  return { total: notes.length, last30Days, last7Days };
}
