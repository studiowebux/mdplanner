// People service — orchestrates repository + domain logic.
// Consumed by API routes, MCP tools, and SSR views.

import type { CacheDatabase } from "../database/sqlite/mod.ts";
import type { PeopleRepository } from "../repositories/people.repository.ts";
import type {
  CreatePerson,
  PeopleSummary,
  Person,
  PersonSkillMatch,
  PersonWithChildren,
  PersonWorkload,
  UpdatePerson,
} from "../types/person.types.ts";
import { ciEquals } from "../utils/string.ts";
import { insertPersonRow } from "../domains/people/cache.ts";
import { PEOPLE_TABLE } from "../domains/people/constants.ts";
import { CachedService } from "./cached.service.ts";

interface PeopleListOptions {
  department?: string;
}

export class PeopleService extends CachedService<
  Person,
  CreatePerson,
  UpdatePerson,
  PeopleListOptions
> {
  protected readonly tableName = PEOPLE_TABLE;

  constructor(private peopleRepo: PeopleRepository) {
    super(peopleRepo);
  }

  protected insertRow(db: CacheDatabase, item: Person): void {
    insertPersonRow(db, item);
  }

  protected applyFilters(
    people: Person[],
    options: PeopleListOptions,
  ): Person[] {
    if (options.department) {
      people = people.filter(
        (p) => p.departments?.some((d) => ciEquals(d, options.department)),
      );
    }
    return people;
  }

  /** Update agent heartbeat — sets lastSeen, optionally status and currentTaskId. */
  async heartbeat(
    id: string,
    status?: Person["status"],
    currentTaskId?: string | null,
  ): Promise<boolean> {
    const update: UpdatePerson = {
      lastSeen: new Date().toISOString(),
    };
    if (status !== undefined) update.status = status;
    if (currentTaskId !== undefined) {
      update.currentTaskId = currentTaskId ?? undefined;
    }
    const result = await this.peopleRepo.update(id, update);
    if (result) this.cacheUpsert(result);
    return result !== null;
  }

  /** Build hierarchical org tree from reportsTo references. */
  async getTree(): Promise<PersonWithChildren[]> {
    const all = await this.peopleRepo.findAll();
    return PeopleService.buildTree(all);
  }

  /** Build a tree from a given list of people. */
  static buildTree(people: Person[]): PersonWithChildren[] {
    const map = new Map<string, PersonWithChildren>();
    for (const p of people) {
      map.set(p.id, { ...p, children: [] });
    }

    const roots: PersonWithChildren[] = [];
    for (const node of map.values()) {
      if (node.reportsTo && map.has(node.reportsTo)) {
        const parent = map.get(node.reportsTo);
        if (parent?.children) parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  /** Get direct reports for a person. */
  async getDirectReports(id: string): Promise<Person[]> {
    const all = await this.peopleRepo.findAll();
    return all.filter((p) => p.reportsTo === id);
  }

  /** Get all unique department names across all people. */
  async getDepartments(): Promise<string[]> {
    const all = await this.peopleRepo.findAll();
    const depts = new Set<string>();
    for (const p of all) {
      for (const d of p.departments ?? []) {
        depts.add(d);
      }
    }
    return [...depts].sort();
  }

  /** Get summary statistics. */
  async getSummary(): Promise<PeopleSummary> {
    const all = await this.peopleRepo.findAll();
    const departments = await this.getDepartments();
    return {
      totalPeople: all.length,
      totalDepartments: departments.length,
      departments,
    };
  }

  /** Filter people by skill (case-insensitive). */
  async listBySkill(skill: string): Promise<Person[]> {
    const all = await this.peopleRepo.findAll();
    return all.filter(
      (p) => p.skills?.some((s) => ciEquals(s, skill)),
    );
  }

  /** Get available people — excludes offline agents by default. */
  async getAvailable(excludeOffline = true): Promise<Person[]> {
    const all = await this.peopleRepo.findAll();
    if (!excludeOffline) return all;
    return all.filter((p) => p.status !== "offline");
  }

  /** Find people matching required skills, ranked by match count. Excludes offline. */
  async findForSkills(skills: string[]): Promise<PersonSkillMatch[]> {
    const all = await this.peopleRepo.findAll();
    const required = skills.map((s) => s.toLowerCase());
    const matches: PersonSkillMatch[] = [];

    for (const p of all) {
      if (p.status === "offline") continue;
      const personSkills = (p.skills ?? []).map((s) => s.toLowerCase());
      const matched = required.filter((r) => personSkills.includes(r));
      if (matched.length > 0) {
        matches.push({
          person: p,
          matchedSkills: matched,
          score: matched.length,
        });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    return matches;
  }

  /** Get workload info for a person — capacity and current assignment. */
  async getWorkload(id: string): Promise<PersonWorkload | null> {
    const p = await this.peopleRepo.findById(id);
    if (!p) return null;
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      currentTaskId: p.currentTaskId,
      hoursPerDay: p.hoursPerDay,
      workingDays: p.workingDays,
      agentType: p.agentType,
    };
  }
}
