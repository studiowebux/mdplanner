/**
 * Directory-based parser for People Registry.
 * Uses people/ directory with one .md file per person.
 * Pattern: DirectoryParser with hierarchical reportsTo references.
 * Unifies OrgChartMember + TeamMember into a single Person entity.
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type { Person } from "../../types.ts";

interface PersonFrontmatter {
  id: string;
  title?: string;
  role?: string;
  departments?: string[];
  reportsTo?: string;
  email?: string;
  phone?: string;
  startDate?: string;
  hoursPerDay?: number;
  workingDays?: string[];
}

export interface PersonWithChildren extends Person {
  children: PersonWithChildren[];
}

export interface PeopleSummary {
  totalPeople: number;
  totalDepartments: number;
  departments: string[];
}

export class PeopleDirectoryParser extends DirectoryParser<Person> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "people" });
  }

  protected parseFile(
    content: string,
    _filePath: string,
  ): Person | null {
    const { frontmatter, content: body } = parseFrontmatter<
      PersonFrontmatter
    >(content);
    if (!frontmatter.id) return null;

    const lines = body.split("\n");
    let name = "Unnamed Person";
    let notes = "";

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("# ")) {
        name = lines[i].slice(2).trim();
        notes = lines.slice(i + 1).join("\n").trim();
        break;
      }
    }

    // Handle departments as array or scalar
    let departments: string[] = [];
    if (Array.isArray(frontmatter.departments)) {
      departments = frontmatter.departments;
    } else if (typeof frontmatter.departments === "string") {
      departments = [frontmatter.departments];
    }

    // Handle workingDays as array or scalar
    let workingDays: string[] | undefined;
    if (Array.isArray(frontmatter.workingDays)) {
      workingDays = frontmatter.workingDays;
    } else if (typeof frontmatter.workingDays === "string") {
      workingDays = [frontmatter.workingDays];
    }

    return {
      id: frontmatter.id,
      name,
      title: frontmatter.title,
      role: frontmatter.role,
      departments: departments.length > 0 ? departments : undefined,
      reportsTo: frontmatter.reportsTo,
      email: frontmatter.email,
      phone: frontmatter.phone,
      startDate: frontmatter.startDate,
      hoursPerDay: frontmatter.hoursPerDay,
      workingDays,
      notes: notes || undefined,
    };
  }

  protected serializeItem(person: Person): string {
    const frontmatter: Record<string, unknown> = {
      id: person.id,
    };

    if (person.title) frontmatter.title = person.title;
    if (person.role) frontmatter.role = person.role;
    if (person.departments?.length) {
      frontmatter.departments = person.departments;
    }
    if (person.reportsTo) frontmatter.reportsTo = person.reportsTo;
    if (person.email) frontmatter.email = person.email;
    if (person.phone) frontmatter.phone = person.phone;
    if (person.startDate) frontmatter.startDate = person.startDate;
    if (person.hoursPerDay != null) {
      frontmatter.hoursPerDay = person.hoursPerDay;
    }
    if (person.workingDays?.length) {
      frontmatter.workingDays = person.workingDays;
    }

    const body = `# ${person.name}\n\n${person.notes || ""}`;
    return buildFileContent(frontmatter, body);
  }

  /**
   * Add a new person.
   */
  async add(person: Omit<Person, "id">): Promise<Person> {
    const newPerson: Person = {
      ...person,
      id: this.generateId("person"),
    };
    await this.write(newPerson);
    return newPerson;
  }

  /**
   * Update an existing person.
   */
  async update(
    id: string,
    updates: Partial<Person>,
  ): Promise<Person | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: Person = {
      ...existing,
      ...updates,
      id: existing.id,
    };
    await this.write(updated);
    return updated;
  }

  /**
   * Get people by department.
   */
  async getByDepartment(department: string): Promise<Person[]> {
    const people = await this.readAll();
    return people.filter((p) => p.departments?.includes(department));
  }

  /**
   * Get direct reports for a person.
   */
  async getDirectReports(personId: string): Promise<Person[]> {
    const people = await this.readAll();
    return people.filter((p) => p.reportsTo === personId);
  }

  /**
   * Get all unique departments.
   */
  async getDepartments(): Promise<string[]> {
    const people = await this.readAll();
    const departments = new Set<string>();
    for (const person of people) {
      if (person.departments) {
        for (const dept of person.departments) {
          departments.add(dept);
        }
      }
    }
    return Array.from(departments).sort();
  }

  /**
   * Get people as a tree structure using reportsTo references.
   */
  async getTree(): Promise<PersonWithChildren[]> {
    const people = await this.readAll();
    return this.buildTree(people);
  }

  /**
   * Build tree structure from flat list.
   */
  private buildTree(people: Person[]): PersonWithChildren[] {
    const personMap = new Map<string, PersonWithChildren>();

    for (const person of people) {
      personMap.set(person.id, { ...person, children: [] });
    }

    const roots: PersonWithChildren[] = [];
    for (const person of personMap.values()) {
      if (person.reportsTo && personMap.has(person.reportsTo)) {
        personMap.get(person.reportsTo)!.children.push(person);
      } else {
        roots.push(person);
      }
    }

    return roots;
  }

  /**
   * Get people summary.
   */
  async getSummary(): Promise<PeopleSummary> {
    const people = await this.readAll();
    const departments = new Set<string>();

    for (const person of people) {
      if (person.departments) {
        for (const dept of person.departments) {
          departments.add(dept);
        }
      }
    }

    return {
      totalPeople: people.length,
      totalDepartments: departments.size,
      departments: Array.from(departments).sort(),
    };
  }
}
