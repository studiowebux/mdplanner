// Capacity plan repository — markdown CRUD under capacity-plans/.
// Frontmatter: id, startDate, endDate, budgetHours, createdAt, updatedAt.
// Body: # Title, ## Team Members, ## Allocations (pipe-delimited).
//
// Allocation line format:
//   - (id) personId | targetType | targetId | 50%        (percentage)
//   - (id) personId | targetType | targetId | 20h/week   (fixed hours)
//   - (id) personId | targetType | targetId | 20h/week | optional notes

import type {
  CapacityPlan,
  CreateCapacityPlan,
  ProjectAllocation,
  TeamMemberRef,
  UpdateCapacityPlan,
} from "../types/capacity-plan.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import {
  CAPACITY_PLAN_TABLE,
  rowToCapacityPlan,
} from "../domains/capacity-plan/cache.ts";

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
  protected override readonly supportsArchive = true;

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
      startDate: fm.startDate != null ? String(fm.startDate) : undefined,
      endDate: fm.endDate != null ? String(fm.endDate) : undefined,
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
// Body parsing
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

function parseAllocations(body: string): ProjectAllocation[] {
  const section = extractSection(body, /^##\s+allocation/im, /^##\s+/im);
  if (!section) return [];

  const allocations: ProjectAllocation[] = [];
  for (const line of section.split("\n")) {
    // - (id) personId | targetType | targetId | 50% [| notes]
    // - (id) personId | targetType | targetId | 20h/week [| notes]
    const m = line.match(
      /^[-*]\s+\((\w+)\)\s+(\S+)\s*\|\s*(\w+)\s*\|\s*(\S+)\s*\|\s*([^|]+?)\s*(?:\|\s*(.*))?$/,
    );
    if (!m) continue;

    const [, id, personId, targetType, targetId, quantifier, notes] = m;
    if (targetType !== "project" && targetType !== "milestone") continue;

    const pctMatch = quantifier.match(/^(\d+(?:\.\d+)?)%$/);
    const hpwMatch = quantifier.match(/^(\d+(?:\.\d+)?)h\/week$/);

    allocations.push({
      id,
      personId,
      targetType: targetType as ProjectAllocation["targetType"],
      targetId,
      percentage: pctMatch ? parseFloat(pctMatch[1]) : undefined,
      hoursPerWeek: hpwMatch ? parseFloat(hpwMatch[1]) : undefined,
      notes: notes?.trim() || undefined,
    });
  }
  return allocations;
}

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
// Body serialization
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
    const quantifier = a.percentage != null
      ? `${a.percentage}%`
      : `${a.hoursPerWeek ?? 0}h/week`;
    const notePart = a.notes ? ` | ${a.notes}` : "";
    parts.push(
      `- (${a.id}) ${a.personId} | ${a.targetType} | ${a.targetId} | ${quantifier}${notePart}`,
    );
  }

  return parts.join("\n");
}
