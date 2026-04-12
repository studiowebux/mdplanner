// Meeting service — business logic over MeetingRepository.

import type { MeetingRepository } from "../repositories/meeting.repository.ts";
import type {
  CreateMeeting,
  ListMeetingOptions,
  Meeting,
  MeetingAction,
  OpenActionEntry,
  UpdateMeeting,
} from "../types/meeting.types.ts";
import { generateId } from "../utils/id.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class MeetingService extends BaseService<
  Meeting,
  CreateMeeting,
  UpdateMeeting,
  ListMeetingOptions
> {
  constructor(meetingRepo: MeetingRepository) {
    super(meetingRepo);
  }

  findByName(name: string): Promise<Meeting | null> {
    return (this.repo as MeetingRepository).readByName(name);
  }

  // -------------------------------------------------------------------------
  // Action item mutations
  // -------------------------------------------------------------------------

  async addAction(
    id: string,
    data: { description: string; owner?: string; due?: string },
  ): Promise<Meeting | null> {
    const meeting = await this.repo.findById(id);
    if (!meeting) return null;
    const action: MeetingAction = {
      id: generateId("action"),
      description: data.description,
      owner: data.owner,
      due: data.due,
      status: "open",
    };
    return this.repo.update(id, {
      actions: [...meeting.actions, action],
    });
  }

  async toggleAction(
    id: string,
    actionId: string,
  ): Promise<Meeting | null> {
    const meeting = await this.repo.findById(id);
    if (!meeting) return null;
    const actions = meeting.actions.map((a) =>
      a.id === actionId
        ? {
          ...a,
          status:
            (a.status === "open" ? "done" : "open") as MeetingAction["status"],
        }
        : a
    );
    return this.repo.update(id, { actions });
  }

  async deleteAction(
    id: string,
    actionId: string,
  ): Promise<Meeting | null> {
    const meeting = await this.repo.findById(id);
    if (!meeting) return null;
    const actions = meeting.actions.filter((a) => a.id !== actionId);
    return this.repo.update(id, { actions });
  }

  // -------------------------------------------------------------------------
  // Cross-meeting open actions
  // -------------------------------------------------------------------------

  async getOpenActions(beforeDate?: string): Promise<OpenActionEntry[]> {
    const all = await this.repo.findAll();
    const results: Array<{
      meetingId: string;
      meetingTitle: string;
      meetingDate: string;
      action: MeetingAction;
    }> = [];
    for (const m of all) {
      if (beforeDate && m.date >= beforeDate) continue;
      for (const a of m.actions) {
        if (a.status === "open") {
          results.push({
            meetingId: m.id,
            meetingTitle: m.title,
            meetingDate: m.date,
            action: a,
          });
        }
      }
    }
    return results.sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));
  }

  protected applyFilters(
    items: Meeting[],
    options: ListMeetingOptions,
  ): Meeting[] {
    if (options.date_from) {
      items = items.filter((m) => m.date >= options.date_from!);
    }
    if (options.date_to) {
      items = items.filter((m) => m.date <= options.date_to!);
    }
    if (options.open_actions_only === "true") {
      items = items.filter((m) => m.actions.some((a) => a.status === "open"));
    }
    if (options.project) {
      items = items.filter((m) => m.project === options.project);
    }
    if (options.q) {
      items = items.filter((m) =>
        ciIncludes(m.title, options.q!) ||
        ciIncludes(m.agenda ?? "", options.q!) ||
        ciIncludes(m.notes ?? "", options.q!) ||
        (m.attendees ?? []).some((a) => ciIncludes(a, options.q!))
      );
    }
    return items;
  }
}
