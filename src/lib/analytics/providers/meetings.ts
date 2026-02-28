/**
 * Meeting and action item statistics provider.
 */

import { DirectoryMarkdownParser } from "../../parser/directory/parser.ts";

export interface MeetingStats {
  total: number;
  last30Days: number;
  openActionItems: number;
  doneActionItems: number;
  overdueActionItems: number; // open + due_date < today
}

export async function collectMeetingStats(
  parser: DirectoryMarkdownParser,
): Promise<MeetingStats> {
  const meetings = await parser.readMeetings();

  const now = new Date();
  const cutoff30 = new Date(now);
  cutoff30.setDate(now.getDate() - 30);
  const cutoff30Str = cutoff30.toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  let last30Days = 0;
  let openActionItems = 0;
  let doneActionItems = 0;
  let overdueActionItems = 0;

  for (const meeting of meetings) {
    if (meeting.date >= cutoff30Str) last30Days++;

    for (const action of meeting.actions ?? []) {
      if (action.status === "done") {
        doneActionItems++;
      } else {
        openActionItems++;
        if (action.due && action.due < todayStr) {
          overdueActionItems++;
        }
      }
    }
  }

  return {
    total: meetings.length,
    last30Days,
    openActionItems,
    doneActionItems,
    overdueActionItems,
  };
}
