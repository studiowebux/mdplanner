/**
 * Capacity Planning parser class for parsing and serializing capacity planning markdown.
 * Handles team members, hours, and weekly allocations.
 */
import { CapacityPlan, TeamMember, WeeklyAllocation } from "../../types.ts";
import { BaseParser } from "../core.ts";

export class CapacityParser extends BaseParser {
  constructor(filePath: string) {
    super(filePath);
  }

  /**
   * Parses Capacity Plans from the Capacity Planning section in markdown.
   */
  parseCapacitySection(lines: string[]): CapacityPlan[] {
    const plans: CapacityPlan[] = [];

    let inSection = false;
    let currentPlan: Partial<CapacityPlan> | null = null;
    let currentMember: Partial<TeamMember> | null = null;
    let inMembersSection = false;
    let inAllocationsSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.includes("<!-- Capacity Planning -->") || trimmed === "# Capacity Planning") {
        inSection = true;
        continue;
      }

      if (inSection && trimmed.startsWith("# ") && !trimmed.startsWith("# Capacity Planning")) {
        if (currentMember?.name && currentPlan) {
          currentPlan.teamMembers?.push(currentMember as TeamMember);
        }
        if (currentPlan?.title) plans.push(currentPlan as CapacityPlan);
        break;
      }

      if (!inSection) continue;

      if (trimmed.startsWith("## ")) {
        if (currentMember?.name && currentPlan) {
          currentPlan.teamMembers?.push(currentMember as TeamMember);
          currentMember = null;
        }
        if (currentPlan?.title) plans.push(currentPlan as CapacityPlan);

        currentPlan = {
          id: this.generateCapacityId(),
          title: trimmed.substring(3).trim(),
          date: new Date().toISOString().split("T")[0],
          teamMembers: [],
          allocations: [],
        };
        inMembersSection = false;
        inAllocationsSection = false;
        continue;
      }

      if (!currentPlan) continue;

      const idMatch = trimmed.match(/<!--\s*id:\s*([^\s]+)\s*-->/);
      if (idMatch) {
        currentPlan.id = idMatch[1];
        continue;
      }

      if (trimmed.startsWith("Date:")) {
        currentPlan.date = trimmed.substring(5).trim();
        continue;
      }

      if (trimmed.startsWith("Budget Hours:")) {
        currentPlan.budgetHours = parseInt(trimmed.substring(13).trim(), 10) || undefined;
        continue;
      }

      if (trimmed === "### Team Members") {
        if (currentMember?.name) {
          currentPlan.teamMembers?.push(currentMember as TeamMember);
          currentMember = null;
        }
        inMembersSection = true;
        inAllocationsSection = false;
        continue;
      }

      if (trimmed === "### Allocations") {
        if (currentMember?.name) {
          currentPlan.teamMembers?.push(currentMember as TeamMember);
          currentMember = null;
        }
        inMembersSection = false;
        inAllocationsSection = true;
        continue;
      }

      if (inMembersSection && trimmed.startsWith("#### ")) {
        if (currentMember?.name) {
          currentPlan.teamMembers?.push(currentMember as TeamMember);
        }
        currentMember = {
          id: this.generateMemberId(),
          name: trimmed.substring(5).trim(),
          hoursPerDay: 8,
          workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        };
        continue;
      }

      if (inMembersSection && currentMember) {
        const memberIdMatch = trimmed.match(/<!--\s*member-id:\s*([^\s]+)\s*-->/);
        if (memberIdMatch) {
          currentMember.id = memberIdMatch[1];
          continue;
        }

        if (trimmed.startsWith("Role:")) {
          currentMember.role = trimmed.substring(5).trim();
          continue;
        }

        if (trimmed.startsWith("Hours Per Day:")) {
          currentMember.hoursPerDay = parseInt(trimmed.substring(14).trim(), 10) || 8;
          continue;
        }

        if (trimmed.startsWith("Working Days:")) {
          currentMember.workingDays = trimmed.substring(13).trim().split(",").map(d => d.trim());
          continue;
        }
      }

      if (inAllocationsSection && trimmed.startsWith("#### ")) {
        const weekStart = trimmed.substring(5).trim();
        i++;
        while (i < lines.length) {
          const allocLine = lines[i].trim();
          if (allocLine.startsWith("#### ") || allocLine.startsWith("### ") || allocLine.startsWith("## ") || allocLine.startsWith("# ")) {
            i--;
            break;
          }

          const allocMatch = allocLine.match(/^-\s+(\S+):\s+(\d+)h\s+(project|task|milestone)(?::(\S+))?\s*(?:"([^"]*)")?$/);
          if (allocMatch) {
            currentPlan.allocations?.push({
              id: this.generateAllocationId(),
              memberId: allocMatch[1],
              weekStart,
              allocatedHours: parseInt(allocMatch[2], 10),
              targetType: allocMatch[3] as "project" | "task" | "milestone",
              targetId: allocMatch[4] || undefined,
              notes: allocMatch[5] || undefined,
            });
          }
          i++;
        }
        continue;
      }
    }

    if (currentMember?.name && currentPlan) {
      currentPlan.teamMembers?.push(currentMember as TeamMember);
    }
    if (currentPlan?.title) plans.push(currentPlan as CapacityPlan);

    return plans;
  }

  generateCapacityId(): string {
    return crypto.randomUUID().substring(0, 8);
  }

  generateMemberId(): string {
    return crypto.randomUUID().substring(0, 8);
  }

  generateAllocationId(): string {
    return crypto.randomUUID().substring(0, 8);
  }

  /**
   * Converts a Capacity Plan to markdown format.
   */
  capacityPlanToMarkdown(plan: CapacityPlan): string {
    let content = `## ${plan.title}\n`;
    content += `<!-- id: ${plan.id} -->\n`;
    content += `Date: ${plan.date}\n`;
    if (plan.budgetHours) {
      content += `Budget Hours: ${plan.budgetHours}\n`;
    }
    content += `\n`;

    content += `### Team Members\n\n`;
    for (const member of plan.teamMembers) {
      content += `#### ${member.name}\n`;
      content += `<!-- member-id: ${member.id} -->\n`;
      if (member.role) {
        content += `Role: ${member.role}\n`;
      }
      content += `Hours Per Day: ${member.hoursPerDay}\n`;
      content += `Working Days: ${member.workingDays.join(", ")}\n\n`;
    }

    content += `### Allocations\n\n`;
    const weekGroups = new Map<string, WeeklyAllocation[]>();
    for (const alloc of plan.allocations) {
      const group = weekGroups.get(alloc.weekStart) || [];
      group.push(alloc);
      weekGroups.set(alloc.weekStart, group);
    }

    const sortedWeeks = Array.from(weekGroups.keys()).sort();
    for (const week of sortedWeeks) {
      content += `#### ${week}\n`;
      for (const alloc of weekGroups.get(week)!) {
        let line = `- ${alloc.memberId}: ${alloc.allocatedHours}h ${alloc.targetType}`;
        if (alloc.targetId) {
          line += `:${alloc.targetId}`;
        }
        if (alloc.notes) {
          line += ` "${alloc.notes}"`;
        }
        content += line + "\n";
      }
      content += "\n";
    }

    return content;
  }

  /**
   * Serializes all Capacity Plans to markdown format.
   */
  capacityPlansToMarkdown(plans: CapacityPlan[]): string {
    let content = "<!-- Capacity Planning -->\n# Capacity Planning\n\n";
    for (const plan of plans) {
      content += this.capacityPlanToMarkdown(plan);
    }
    return content;
  }

  /**
   * Finds the Capacity Planning section boundaries in the file lines.
   */
  findCapacitySection(lines: string[]): { startIndex: number; endIndex: number } {
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (
        startIndex === -1 &&
        (lines[i].includes("<!-- Capacity Planning -->") ||
          lines[i].trim() === "# Capacity Planning")
      ) {
        startIndex = i;
      } else if (
        startIndex !== -1 &&
        lines[i].trim().startsWith("# ") &&
        !lines[i].trim().startsWith("# Capacity Planning")
      ) {
        endIndex = i;
        break;
      }
    }

    return { startIndex, endIndex };
  }

  updateCapacityInList(
    plans: CapacityPlan[],
    planId: string,
    updates: Partial<Omit<CapacityPlan, "id">>,
  ): { plans: CapacityPlan[]; success: boolean } {
    const index = plans.findIndex((p) => p.id === planId);
    if (index === -1) {
      return { plans, success: false };
    }
    plans[index] = { ...plans[index], ...updates };
    return { plans, success: true };
  }

  deleteCapacityFromList(
    plans: CapacityPlan[],
    planId: string,
  ): { plans: CapacityPlan[]; success: boolean } {
    const originalLength = plans.length;
    const filtered = plans.filter((p) => p.id !== planId);
    return {
      plans: filtered,
      success: filtered.length !== originalLength,
    };
  }

  createCapacityPlan(plan: Omit<CapacityPlan, "id">): CapacityPlan {
    return {
      ...plan,
      id: this.generateCapacityId(),
    };
  }
}
