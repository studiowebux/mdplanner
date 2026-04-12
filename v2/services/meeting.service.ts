// Meeting service — business logic over MeetingRepository.

import type { MeetingRepository } from "../repositories/meeting.repository.ts";
import type {
  CreateMeeting,
  ListMeetingOptions,
  Meeting,
  UpdateMeeting,
} from "../types/meeting.types.ts";
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
