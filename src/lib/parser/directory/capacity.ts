/**
 * Directory-based parser for Capacity Planning.
 * Each capacity plan is stored as a separate markdown file.
 * Team members and allocations are stored as nested structures.
 */
import { DirectoryParser, parseFrontmatter, buildFileContent } from "./base.ts";
import type { CapacityPlan, TeamMember, WeeklyAllocation } from "../../types.ts";

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
    const { frontmatter, content: body } = parseFrontmatter<CapacityFrontmatter>(content);

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
      if (lowerLine.startsWith("## team member") || lowerLine.startsWith("## members")) {
        currentSection = "members";
        continue;
      }
      if (lowerLine.startsWith("## allocation") || lowerLine.startsWith("## weekly")) {
        currentSection = "allocations";
        continue;
      }

      // Parse team members: - Name | Role | 8h/day | Mon,Tue,Wed,Thu,Fri
      if (currentSection === "members") {
        const memberMatch = line.match(/^[-*]\s+\((\w+)\)\s+(.+?)\s*\|\s*(.+?)\s*\|\s*(\d+)h\/day\s*\|\s*(.+)$/);
        if (memberMatch) {
          result.teamMembers.push({
            id: memberMatch[1],
            name: memberMatch[2].trim(),
            role: memberMatch[3].trim() || undefined,
            hoursPerDay: parseInt(memberMatch[4], 10),
            workingDays: memberMatch[5].split(",").map(d => d.trim()),
          });
        }
      }

      // Parse allocations: - (alloc_id) member_id | 2026-02-10 | 20h | task | task_123 | Notes
      if (currentSection === "allocations") {
        const allocMatch = line.match(/^[-*]\s+\((\w+)\)\s+(\w+)\s*\|\s*(\S+)\s*\|\s*(\d+)h\s*\|\s*(\w+)\s*\|\s*(\S*)\s*(?:\|\s*(.*))?$/);
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

    // Team Members
    sections.push("");
    sections.push("## Team Members");
    sections.push("");
    for (const member of plan.teamMembers) {
      const role = member.role || "";
      const days = member.workingDays.join(",");
      sections.push(`- (${member.id}) ${member.name} | ${role} | ${member.hoursPerDay}h/day | ${days}`);
    }

    // Allocations
    sections.push("");
    sections.push("## Allocations");
    sections.push("");
    for (const alloc of plan.allocations) {
      const notes = alloc.notes ? ` | ${alloc.notes}` : "";
      sections.push(`- (${alloc.id}) ${alloc.memberId} | ${alloc.weekStart} | ${alloc.allocatedHours}h | ${alloc.targetType} | ${alloc.targetId || ""}${notes}`);
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

  async update(id: string, updates: Partial<CapacityPlan>): Promise<CapacityPlan | null> {
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

  async addTeamMember(planId: string, member: Omit<TeamMember, "id">): Promise<CapacityPlan | null> {
    const plan = await this.read(planId);
    if (!plan) return null;

    const newMember: TeamMember = {
      ...member,
      id: this.generateId("member"),
    };
    plan.teamMembers.push(newMember);
    await this.write(plan);
    return plan;
  }

  async updateTeamMember(planId: string, memberId: string, updates: Partial<TeamMember>): Promise<CapacityPlan | null> {
    const plan = await this.read(planId);
    if (!plan) return null;

    const memberIndex = plan.teamMembers.findIndex(m => m.id === memberId);
    if (memberIndex === -1) return null;

    plan.teamMembers[memberIndex] = {
      ...plan.teamMembers[memberIndex],
      ...updates,
      id: memberId,
    };
    await this.write(plan);
    return plan;
  }

  async removeTeamMember(planId: string, memberId: string): Promise<CapacityPlan | null> {
    const plan = await this.read(planId);
    if (!plan) return null;

    plan.teamMembers = plan.teamMembers.filter(m => m.id !== memberId);
    // Also remove allocations for this member
    plan.allocations = plan.allocations.filter(a => a.memberId !== memberId);
    await this.write(plan);
    return plan;
  }

  async addAllocation(planId: string, allocation: Omit<WeeklyAllocation, "id">): Promise<CapacityPlan | null> {
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

  async updateAllocation(planId: string, allocationId: string, updates: Partial<WeeklyAllocation>): Promise<CapacityPlan | null> {
    const plan = await this.read(planId);
    if (!plan) return null;

    const allocIndex = plan.allocations.findIndex(a => a.id === allocationId);
    if (allocIndex === -1) return null;

    plan.allocations[allocIndex] = {
      ...plan.allocations[allocIndex],
      ...updates,
      id: allocationId,
    };
    await this.write(plan);
    return plan;
  }

  async removeAllocation(planId: string, allocationId: string): Promise<CapacityPlan | null> {
    const plan = await this.read(planId);
    if (!plan) return null;

    plan.allocations = plan.allocations.filter(a => a.id !== allocationId);
    await this.write(plan);
    return plan;
  }
}
