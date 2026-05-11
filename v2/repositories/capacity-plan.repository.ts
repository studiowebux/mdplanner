// Capacity plan repository — markdown CRUD under capacity-plans/.
// Frontmatter: id, date, budgetHours, createdAt, updatedAt.
// Body: # Title, ## Team Members, ## Allocations (pipe-delimited, v1 format).

import type {
  CapacityPlan,
  CreateCapacityPlan,
  TeamMemberRef,
  UpdateCapacityPlan,
  WeeklyAllocation,
} from "../types/capacity-plan.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import {
  CAPACITY_PLAN_TABLE,
  rowToCapacityPlan,
} from "../domains/capacity-plan/cache.ts";

// Fields that live in the body — excluded from frontmatter block.
const CAPACITY_PLAN_BODY_KEYS = [
  "title",
  "teamMembers",
  "allocations",
] as const;

export class CapacityPlanRepository extends CachedMarkdownRepository<
  CapacityPlan,
  CreateCapacityPlan,
  UpdateCapacityPlan
> {
  protected readonly tableName = CAPACITY_PLAN_TABLE;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "capacity-plans",
      idPrefix: "capacity",
      nameField: "title",
    });
  }

  protected rowToEntity(
    row: Record<string, string | number | null>,
  ): CapacityPlan {
    return rowToCapacityPlan(row);
  }

  protected fromCreateInput(
    data: CreateCapacityPlan,
    id: string,
    now: string,
  ): CapacityPlan {
    return {
      ...data,
      id,
      date: data.date ?? new Date().toISOString().split("T")[0],
      teamMembers: data.teamMembers ?? [],
      allocations: data.allocations ?? [],
      createdAt: now,
      updatedAt: now,
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): CapacityPlan | null {
    if (!fm.id && !fm.title) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

    const bodyText = body.trim();
    const headingMatch = bodyText.match(/^#\s+(.+)$/m);
    const title = fm.title
      ? String(fm.title)
      : headingMatch
      ? headingMatch[1]
      : "";

    return {
      id,
      title,
      date: fm.date != null
        ? String(fm.date)
        : new Date().toISOString().split("T")[0],
      budgetHours: fm.budgetHours != null ? Number(fm.budgetHours) : undefined,
      teamMembers: parseMembers(bodyText),
      allocations: parseAllocations(bodyText),
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  protected serialize(item: CapacityPlan): string {
    return this.serializeStandard(
      item,
      CAPACITY_PLAN_BODY_KEYS,
      buildBody(item),
    );
  }
}

// ---------------------------------------------------------------------------
// Body parsing — mirrors v1 CapacityDirectoryParser logic
// ---------------------------------------------------------------------------

function parseMembers(body: string): TeamMemberRef[] {
  const section = extractSection(body, /^##\s+team\s+member/im, /^##\s+/im);
  if (!section) return [];

  const members: TeamMemberRef[] = [];
  for (const line of section.split("\n")) {
    // Full format: - (id) personId | Nh/day | Mon,Tue,Wed
    const fullMatch = line.match(
      /^[-*]\s+\((\w+)\)\s+(\S+)\s*\|\s*(\d+)h\/day\s*\|\s*(.+)$/,
    );
    if (fullMatch) {
      members.push({
        id: fullMatch[1],
        personId: fullMatch[2],
        hoursPerDay: parseInt(fullMatch[3], 10),
        workingDays: fullMatch[4].split(",").map((d) => d.trim()),
      });
      continue;
    }

    // Hours only: - (id) personId | Nh/day
    const hoursMatch = line.match(
      /^[-*]\s+\((\w+)\)\s+(\S+)\s*\|\s*(\d+)h\/day\s*$/,
    );
    if (hoursMatch) {
      members.push({
        id: hoursMatch[1],
        personId: hoursMatch[2],
        hoursPerDay: parseInt(hoursMatch[3], 10),
      });
      continue;
    }

    // Minimal: - (id) personId
    const minMatch = line.match(/^[-*]\s+\((\w+)\)\s+(\S+)\s*$/);
    if (minMatch) {
      members.push({ id: minMatch[1], personId: minMatch[2] });
    }
  }
  return members;
}

function parseAllocations(body: string): WeeklyAllocation[] {
  const section = extractSection(body, /^##\s+allocation/im, /^##\s+/im);
  if (!section) return [];

  const allocations: WeeklyAllocation[] = [];
  for (const line of section.split("\n")) {
    // - (id) memberId | weekStart | Nh | targetType | targetId | notes
    const m = line.match(
      /^[-*]\s+\((\w+)\)\s+(\S+)\s*\|\s*(\S+)\s*\|\s*(\d+)h\s*\|\s*(\w+)\s*\|\s*(\S*)\s*(?:\|\s*(.*))?$/,
    );
    if (m) {
      allocations.push({
        id: m[1],
        memberId: m[2],
        weekStart: m[3],
        allocatedHours: parseInt(m[4], 10),
        targetType: m[5] as WeeklyAllocation["targetType"],
        targetId: m[6] || undefined,
        notes: m[7]?.trim() || undefined,
      });
    }
  }
  return allocations;
}

/**
 * Extract the text between a section heading and the next H2 (or end of body).
 * Returns the content lines after the heading, or null if the heading is absent.
 */
function extractSection(
  body: string,
  headingPattern: RegExp,
  nextHeadingPattern: RegExp,
): string | null {
  const lines = body.split("\n");
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headingPattern.test(lines[i])) {
      startIdx = i + 1;
      break;
    }
  }
  if (startIdx === -1) return null;

  const sectionLines: string[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    if (i > startIdx && nextHeadingPattern.test(lines[i])) break;
    sectionLines.push(lines[i]);
  }
  return sectionLines.join("\n");
}

// ---------------------------------------------------------------------------
// Body serialization — mirrors v1 CapacityDirectoryParser.serializeItem()
// ---------------------------------------------------------------------------

function buildBody(item: CapacityPlan): string {
  const parts: string[] = [`# ${item.title}`, "", "## Team Members", ""];

  for (const m of item.teamMembers) {
    const segments = [`- (${m.id}) ${m.personId}`];
    if (m.hoursPerDay !== undefined) segments.push(`${m.hoursPerDay}h/day`);
    if (m.workingDays && m.workingDays.length > 0) {
      segments.push(m.workingDays.join(","));
    }
    parts.push(segments.join(" | "));
  }

  parts.push("", "## Allocations", "");

  for (const a of item.allocations) {
    const notes = a.notes ? ` | ${a.notes}` : "";
    parts.push(
      `- (${a.id}) ${a.memberId} | ${a.weekStart} | ${a.allocatedHours}h | ${a.targetType} | ${
        a.targetId ?? ""
      }${notes}`,
    );
  }

  return parts.join("\n");
}
