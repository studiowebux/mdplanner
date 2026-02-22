/**
 * Directory-based parser for Capacity Planning.
 * Each capacity plan is stored as a separate markdown file.
 * Team members reference people/ by personId with optional overrides.
 * Allocations are stored as nested structures.
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type {
  CapacityPlan,
  TeamMemberRef,
  WeeklyAllocation,
} from "../../types.ts";

interface CapacityFrontmatter {
  id: string;
  date: string;
  budgetHours?: number;
}

export class CapacityDirectoryParser extends DirectoryParser<CapacityPlan> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "capacity" });
  }

  protected parseFile(content: string, _filePath: string): CapacityPlan | null {
    const { frontmatter, content: body } = parseFrontmatter<
      CapacityFrontmatter
    >(content);

    if (!frontmatter.id) {
      return null;
    }

    const lines = body.split("\n");
    const result: CapacityPlan = {
      id: frontmatter.id,
      title: "Untitled Capacity Plan",
      date: frontmatter.date || new Date().toISOString().split("T")[0],
      budgetHours: frontmatter.budgetHours,
      teamMembers: [],
      allocations: [],
    };

    let currentSection: "none" | "members" | "allocations" = "none";

    for (const line of lines) {
      if (line.startsWith("# ")) {
        result.title = line.slice(2).trim();
        continue;
      }

      const lowerLine = line.toLowerCase();
      if (
        lowerLine.startsWith("## team member") ||
        lowerLine.startsWith("## members")
      ) {
        currentSection = "members";
        continue;
      }
      if (
        lowerLine.startsWith("## allocation") ||
        lowerLine.startsWith("## weekly")
      ) {
        currentSection = "allocations";
        continue;
      }

      // Parse team member refs: - ({id}) {personId} | {hoursPerDay}h/day | {days}
      // hoursPerDay and days are optional overrides
      if (currentSection === "members") {
        // Full format with overrides: - (id) personId | 6h/day | Mon,Tue,Wed
        const fullMatch = line.match(
          /^[-*]\s+\((\w+)\)\s+(\w+)\s*\|\s*(\d+)h\/day\s*\|\s*(.+)$/,
        );
        if (fullMatch) {
          result.teamMembers.push({
            id: fullMatch[1],
            personId: fullMatch[2],
            hoursPerDay: parseInt(fullMatch[3], 10),
            workingDays: fullMatch[4].split(",").map((d) => d.trim()),
          });
          continue;
        }

        // Hours override only: - (id) personId | 6h/day
        const hoursMatch = line.match(
          /^[-*]\s+\((\w+)\)\s+(\w+)\s*\|\s*(\d+)h\/day\s*$/,
        );
        if (hoursMatch) {
          result.teamMembers.push({
            id: hoursMatch[1],
            personId: hoursMatch[2],
            hoursPerDay: parseInt(hoursMatch[3], 10),
          });
          continue;
        }

        // Minimal format (no overrides): - (id) personId
        const minMatch = line.match(
          /^[-*]\s+\((\w+)\)\s+(\w+)\s*$/,
        );
        if (minMatch) {
          result.teamMembers.push({
            id: minMatch[1],
            personId: minMatch[2],
          });
        }
      }

      // Parse allocations: - (alloc_id) member_id | 2026-02-10 | 20h | task | task_123 | Notes
      if (currentSection === "allocations") {
        const allocMatch = line.match(
          /^[-*]\s+\((\w+)\)\s+(\w+)\s*\|\s*(\S+)\s*\|\s*(\d+)h\s*\|\s*(\w+)\s*\|\s*(\S*)\s*(?:\|\s*(.*))?$/,
        );
        if (allocMatch) {
          result.allocations.push({
            id: allocMatch[1],
            memberId: allocMatch[2],
            weekStart: allocMatch[3],
            allocatedHours: parseInt(allocMatch[4], 10),
            targetType: allocMatch[5] as "project" | "task" | "milestone",
            targetId: allocMatch[6] || undefined,
            notes: allocMatch[7]?.trim() || undefined,
          });
        }
      }
    }

    return result;
  }

  protected serializeItem(plan: CapacityPlan): string {
    const frontmatter: CapacityFrontmatter = {
      id: plan.id,
      date: plan.date,
    };

    if (plan.budgetHours !== undefined) {
      frontmatter.budgetHours = plan.budgetHours;
    }

    const sections: string[] = [`# ${plan.title}`];

    // Team Members (references to people/)
    sections.push("");
    sections.push("## Team Members");
    sections.push("");
    for (const member of plan.teamMembers) {
      const parts = [`- (${member.id}) ${member.personId}`];
      if (member.hoursPerDay !== undefined) {
        parts.push(`${member.hoursPerDay}h/day`);
      }
      if (member.workingDays !== undefined && member.workingDays.length > 0) {
        parts.push(member.workingDays.join(","));
      }
      sections.push(parts.join(" | "));
    }

    // Allocations
    sections.push("");
    sections.push("## Allocations");
    sections.push("");
    for (const alloc of plan.allocations) {
      const notes = alloc.notes ? ` | ${alloc.notes}` : "";
      sections.push(
        `- (${alloc.id}) ${alloc.memberId} | ${alloc.weekStart} | ${alloc.allocatedHours}h | ${alloc.targetType} | ${
          alloc.targetId || ""
        }${notes}`,
      );
    }

    return buildFileContent(frontmatter, sections.join("\n"));
  }

  async add(plan: Omit<CapacityPlan, "id">): Promise<CapacityPlan> {
    const newPlan: CapacityPlan = {
      ...plan,
      id: this.generateId("capacity"),
    };
    await this.write(newPlan);
    return newPlan;
  }

  async update(
    id: string,
    updates: Partial<CapacityPlan>,
  ): Promise<CapacityPlan | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: CapacityPlan = {
      ...existing,
      ...updates,
      id: existing.id,
    };
    await this.write(updated);
    return updated;
  }

  async addTeamMember(
    planId: string,
    member: Omit<TeamMemberRef, "id">,
  ): Promise<CapacityPlan | null> {
    const plan = await this.read(planId);
    if (!plan) return null;

    const newMember: TeamMemberRef = {
      ...member,
      id: this.generateId("member"),
    };
    plan.teamMembers.push(newMember);
    await this.write(plan);
    return plan;
  }

  async updateTeamMember(
    planId: string,
    memberId: string,
    updates: Partial<TeamMemberRef>,
  ): Promise<CapacityPlan | null> {
    const plan = await this.read(planId);
    if (!plan) return null;

    const memberIndex = plan.teamMembers.findIndex((m) => m.id === memberId);
    if (memberIndex === -1) return null;

    plan.teamMembers[memberIndex] = {
      ...plan.teamMembers[memberIndex],
      ...updates,
      id: memberId,
    };
    await this.write(plan);
    return plan;
  }

  async removeTeamMember(
    planId: string,
    memberId: string,
  ): Promise<CapacityPlan | null> {
    const plan = await this.read(planId);
    if (!plan) return null;

    plan.teamMembers = plan.teamMembers.filter((m) => m.id !== memberId);
    // Also remove allocations for this member
    plan.allocations = plan.allocations.filter((a) => a.memberId !== memberId);
    await this.write(plan);
    return plan;
  }

  async addAllocation(
    planId: string,
    allocation: Omit<WeeklyAllocation, "id">,
  ): Promise<CapacityPlan | null> {
    const plan = await this.read(planId);
    if (!plan) return null;

    const newAllocation: WeeklyAllocation = {
      ...allocation,
      id: this.generateId("alloc"),
    };
    plan.allocations.push(newAllocation);
    await this.write(plan);
    return plan;
  }

  async updateAllocation(
    planId: string,
    allocationId: string,
    updates: Partial<WeeklyAllocation>,
  ): Promise<CapacityPlan | null> {
    const plan = await this.read(planId);
    if (!plan) return null;

    const allocIndex = plan.allocations.findIndex((a) => a.id === allocationId);
    if (allocIndex === -1) return null;

    plan.allocations[allocIndex] = {
      ...plan.allocations[allocIndex],
      ...updates,
      id: allocationId,
    };
    await this.write(plan);
    return plan;
  }

  async removeAllocation(
    planId: string,
    allocationId: string,
  ): Promise<CapacityPlan | null> {
    const plan = await this.read(planId);
    if (!plan) return null;

    plan.allocations = plan.allocations.filter((a) => a.id !== allocationId);
    await this.write(plan);
    return plan;
  }
}
