/**
 * Directory-based parser for Org Chart.
 * Uses orgchart/ directory with member_xxx.md files.
 * Pattern: DirectoryParser with hierarchical reportsTo references.
 */
import { DirectoryParser, parseFrontmatter, buildFileContent } from "./base.ts";
import type { OrgChartMember } from "../../types.ts";

interface OrgChartMemberFrontmatter {
  id: string;
  title: string;
  department: string;
  reportsTo?: string;
  email?: string;
  phone?: string;
  startDate?: string;
}

export class OrgChartDirectoryParser extends DirectoryParser<OrgChartMember> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "orgchart" });
  }

  protected parseFile(content: string, _filePath: string): OrgChartMember | null {
    const { frontmatter, content: body } = parseFrontmatter<OrgChartMemberFrontmatter>(content);
    if (!frontmatter.id) return null;

    const lines = body.split("\n");
    let name = "Unnamed Member";
    let notes = "";

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("# ")) {
        name = lines[i].slice(2).trim();
        notes = lines.slice(i + 1).join("\n").trim();
        break;
      }
    }

    return {
      id: frontmatter.id,
      name,
      title: frontmatter.title || "",
      department: frontmatter.department || "",
      reportsTo: frontmatter.reportsTo,
      email: frontmatter.email,
      phone: frontmatter.phone,
      startDate: frontmatter.startDate,
      notes: notes || undefined,
    };
  }

  protected serializeItem(member: OrgChartMember): string {
    const frontmatter: Record<string, unknown> = {
      id: member.id,
      title: member.title,
      department: member.department,
    };

    if (member.reportsTo) frontmatter.reportsTo = member.reportsTo;
    if (member.email) frontmatter.email = member.email;
    if (member.phone) frontmatter.phone = member.phone;
    if (member.startDate) frontmatter.startDate = member.startDate;

    const body = `# ${member.name}\n\n${member.notes || ""}`;
    return buildFileContent(frontmatter, body);
  }

  /**
   * Add a new org chart member.
   */
  async add(member: Omit<OrgChartMember, "id">): Promise<OrgChartMember> {
    const newMember: OrgChartMember = {
      ...member,
      id: this.generateId("member"),
    };
    await this.write(newMember);
    return newMember;
  }

  /**
   * Update an existing org chart member.
   */
  async update(id: string, updates: Partial<OrgChartMember>): Promise<OrgChartMember | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: OrgChartMember = { ...existing, ...updates, id: existing.id };
    await this.write(updated);
    return updated;
  }

  /**
   * Get members by department.
   */
  async getByDepartment(department: string): Promise<OrgChartMember[]> {
    const members = await this.readAll();
    return members.filter((m) => m.department === department);
  }

  /**
   * Get direct reports for a member.
   */
  async getDirectReports(memberId: string): Promise<OrgChartMember[]> {
    const members = await this.readAll();
    return members.filter((m) => m.reportsTo === memberId);
  }

  /**
   * Get all departments.
   */
  async getDepartments(): Promise<string[]> {
    const members = await this.readAll();
    const departments = new Set<string>();
    for (const member of members) {
      if (member.department) {
        departments.add(member.department);
      }
    }
    return Array.from(departments).sort();
  }

  /**
   * Get org chart as a tree structure for rendering.
   */
  async getTree(): Promise<OrgChartMemberWithChildren[]> {
    const members = await this.readAll();
    return this.buildTree(members);
  }

  /**
   * Build tree structure from flat list.
   */
  private buildTree(members: OrgChartMember[]): OrgChartMemberWithChildren[] {
    const memberMap = new Map<string, OrgChartMemberWithChildren>();

    // Create nodes with empty children arrays
    for (const member of members) {
      memberMap.set(member.id, { ...member, children: [] });
    }

    // Build parent-child relationships
    const roots: OrgChartMemberWithChildren[] = [];
    for (const member of memberMap.values()) {
      if (member.reportsTo && memberMap.has(member.reportsTo)) {
        memberMap.get(member.reportsTo)!.children.push(member);
      } else {
        roots.push(member);
      }
    }

    return roots;
  }

  /**
   * Get org chart summary.
   */
  async getSummary(): Promise<OrgChartSummary> {
    const members = await this.readAll();
    const departments = new Set<string>();

    for (const member of members) {
      if (member.department) {
        departments.add(member.department);
      }
    }

    return {
      totalMembers: members.length,
      totalDepartments: departments.size,
      departments: Array.from(departments).sort(),
    };
  }
}

export interface OrgChartMemberWithChildren extends OrgChartMember {
  children: OrgChartMemberWithChildren[];
}

export interface OrgChartSummary {
  totalMembers: number;
  totalDepartments: number;
  departments: string[];
}
