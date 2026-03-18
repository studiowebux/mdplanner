// Milestone repository — reads and writes milestone markdown files from disk.

import { join } from "@std/path";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../utils/frontmatter.ts";
import { generateId } from "../utils/id.ts";
import { atomicWrite, SafeWriter } from "../utils/safe-io.ts";
import type {
  CreateMilestone,
  MilestoneBase,
  UpdateMilestone,
} from "../types/milestone.types.ts";

export class MilestoneRepository {
  private milestonesDir: string;
  private writer = new SafeWriter();

  constructor(projectDir: string) {
    this.milestonesDir = join(projectDir, "milestones");
  }

  async findAll(): Promise<MilestoneBase[]> {
    const milestones: MilestoneBase[] = [];
    try {
      for await (const entry of Deno.readDir(this.milestonesDir)) {
        if (!entry.isFile || !entry.name.endsWith(".md")) continue;
        const content = await Deno.readTextFile(
          join(this.milestonesDir, entry.name),
        );
        const m = this.parse(content);
        if (m) milestones.push(m);
      }
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    return milestones;
  }

  async findById(id: string): Promise<MilestoneBase | null> {
    const { base } = await this.findFileById(id);
    return base;
  }

  async findByName(name: string): Promise<MilestoneBase | null> {
    const all = await this.findAll();
    return all.find((m) => m.name === name) ?? null;
  }

  async create(data: CreateMilestone): Promise<MilestoneBase> {
    await Deno.mkdir(this.milestonesDir, { recursive: true });
    const id = generateId("milestone");
    const createdAt = new Date().toISOString();
    const fm: Record<string, unknown> = {
      id,
      status: data.status ?? "open",
      createdAt,
    };
    if (data.target) fm.target = data.target;
    if (data.project) fm.project = data.project;
    const body = `# ${data.name}\n\n${data.description ?? ""}`.trimEnd();
    const filePath = join(this.milestonesDir, `${id}.md`);
    await this.writer.write(
      id,
      () => atomicWrite(filePath, serializeFrontmatter(fm, body)),
    );
    return {
      id,
      name: data.name,
      status: data.status ?? "open",
      target: data.target,
      description: data.description,
      project: data.project,
      createdAt,
    };
  }

  async update(
    id: string,
    data: UpdateMilestone,
  ): Promise<MilestoneBase | null> {
    const { file, base } = await this.findFileById(id);
    if (!file || !base) return null;
    const updated: MilestoneBase = { ...base };
    if (data.name !== undefined) updated.name = data.name;
    if (data.status !== undefined) {
      updated.status = data.status;
      if (data.status === "completed" && base.status !== "completed") {
        updated.completedAt = new Date().toISOString();
      } else if (data.status === "open") {
        updated.completedAt = undefined;
      }
    }
    if (data.target !== undefined) updated.target = data.target ?? undefined;
    if (data.description !== undefined) {
      updated.description = data.description ?? undefined;
    }
    if (data.project !== undefined) updated.project = data.project ?? undefined;
    const fm: Record<string, unknown> = {
      id: updated.id,
      status: updated.status,
    };
    if (updated.target) fm.target = updated.target;
    if (updated.project) fm.project = updated.project;
    if (updated.completedAt) fm.completedAt = updated.completedAt;
    const body = `# ${updated.name}\n\n${updated.description ?? ""}`.trimEnd();
    await this.writer.write(
      id,
      () => atomicWrite(file, serializeFrontmatter(fm, body)),
    );
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const { file } = await this.findFileById(id);
    if (!file) return false;
    await Deno.remove(file);
    return true;
  }

  private async findFileById(
    id: string,
  ): Promise<{ file: string | null; base: MilestoneBase | null }> {
    try {
      for await (const entry of Deno.readDir(this.milestonesDir)) {
        if (!entry.isFile || !entry.name.endsWith(".md")) continue;
        const filePath = join(this.milestonesDir, entry.name);
        const content = await Deno.readTextFile(filePath);
        const m = this.parse(content);
        if (m?.id === id) return { file: filePath, base: m };
      }
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    return { file: null, base: null };
  }

  private parse(content: string): MilestoneBase | null {
    const { frontmatter: fm, body } = parseFrontmatter(content);
    if (!fm.id) return null;

    // Title from first # heading
    const titleMatch = body.match(/^#\s+(.+)/m);
    const name = titleMatch?.[1]?.trim() ?? String(fm.id);

    // Description: everything after the title line
    const lines = body.split("\n");
    const titleIdx = lines.findIndex((l) => /^#\s+/.test(l));
    const desc = titleIdx >= 0
      ? lines.slice(titleIdx + 1).join("\n").trim()
      : undefined;

    return {
      id: String(fm.id),
      name,
      status: fm.status === "completed" ? "completed" : "open",
      target: fm.target != null ? String(fm.target) : undefined,
      description: desc || undefined,
      project: fm.project != null ? String(fm.project) : undefined,
      completedAt: fm.completedAt != null ? String(fm.completedAt) : undefined,
      createdAt: fm.createdAt != null ? String(fm.createdAt) : undefined,
    };
  }
}
