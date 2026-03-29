// Idea repository — markdown file CRUD under ideas/.

import { join } from "@std/path";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../utils/frontmatter.ts";
import { generateId } from "../utils/id.ts";
import { atomicWrite, SafeWriter } from "../utils/safe-io.ts";
import {
  buildFrontmatter,
  mergeFields,
  readMarkdownDir,
} from "../utils/repo-helpers.ts";
import { mapKeysToFm } from "../utils/frontmatter-mapper.ts";
import type {
  CreateIdea,
  Idea,
  IdeaWithBacklinks,
  UpdateIdea,
} from "../types/idea.types.ts";

const BODY_KEYS = ["id", "description"] as const;

export class IdeaRepository {
  private dir: string;
  private writer = new SafeWriter();

  constructor(projectDir: string) {
    this.dir = join(projectDir, "ideas");
  }

  async findAll(): Promise<Idea[]> {
    const items = await readMarkdownDir(
      this.dir,
      (filename, fm, body) => this.parse(filename, fm, body),
    );
    return items.sort((a, b) => a.title.localeCompare(b.title));
  }

  async findById(id: string): Promise<Idea | null> {
    // Try direct file lookup first (filename = id)
    try {
      const content = await Deno.readTextFile(join(this.dir, `${id}.md`));
      const { frontmatter, body } = parseFrontmatter(content);
      return this.parse(`${id}.md`, frontmatter, body);
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    // Fallback: v1 files use slug filenames (e.g. ai-assistant.md) with a
    // different id in frontmatter (e.g. idea_ai). Scan all files.
    const all = await this.findAll();
    return all.find((i) => i.id === id) ?? null;
  }

  async findByName(name: string): Promise<Idea | null> {
    const all = await this.findAll();
    const lower = name.toLowerCase();
    return all.find((i) => i.title.toLowerCase() === lower) ?? null;
  }

  async findAllWithBacklinks(): Promise<IdeaWithBacklinks[]> {
    const all = await this.findAll();
    return all.map((idea) => ({
      ...idea,
      backlinks: all
        .filter((other) => other.links?.includes(idea.id))
        .map((other) => other.id),
    }));
  }

  async create(data: CreateIdea): Promise<Idea> {
    await Deno.mkdir(this.dir, { recursive: true });
    const now = new Date().toISOString();
    const id = generateId("idea");

    const item: Idea = {
      ...data,
      id,
      status: data.status ?? "new",
      createdAt: now,
      updatedAt: now,
    };

    const filePath = join(this.dir, `${id}.md`);
    await this.writer.write(
      id,
      () => atomicWrite(filePath, this.serialize(item)),
    );
    return item;
  }

  async update(id: string, data: UpdateIdea): Promise<Idea | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = mergeFields(
      { ...existing },
      data as Record<string, unknown>,
    );
    updated.updatedAt = new Date().toISOString();

    // Auto-set lifecycle timestamps on status transitions
    if (data.status && data.status !== existing.status) {
      if (data.status === "implemented" && !updated.implementedAt) {
        updated.implementedAt = updated.updatedAt;
      }
      if (data.status === "cancelled" && !updated.cancelledAt) {
        updated.cancelledAt = updated.updatedAt;
      }
    }

    await this.writer.write(
      id,
      () => atomicWrite(join(this.dir, `${id}.md`), this.serialize(updated)),
    );
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    try {
      await Deno.remove(join(this.dir, `${id}.md`));
      return true;
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) return false;
      throw err;
    }
  }

  async linkIdeas(id1: string, id2: string): Promise<boolean> {
    const idea1 = await this.findById(id1);
    const idea2 = await this.findById(id2);
    if (!idea1 || !idea2) return false;

    const links1 = idea1.links ?? [];
    const links2 = idea2.links ?? [];

    const writes: Promise<Idea | null>[] = [];
    if (!links1.includes(id2)) {
      writes.push(this.update(id1, { links: [...links1, id2] }));
    }
    if (!links2.includes(id1)) {
      writes.push(this.update(id2, { links: [...links2, id1] }));
    }
    await Promise.all(writes);
    return true;
  }

  async unlinkIdeas(id1: string, id2: string): Promise<boolean> {
    const idea1 = await this.findById(id1);
    const idea2 = await this.findById(id2);
    if (!idea1 || !idea2) return false;

    const writes: Promise<Idea | null>[] = [];
    if (idea1.links?.includes(id2)) {
      writes.push(
        this.update(id1, { links: idea1.links.filter((l) => l !== id2) }),
      );
    }
    if (idea2.links?.includes(id1)) {
      writes.push(
        this.update(id2, { links: idea2.links.filter((l) => l !== id1) }),
      );
    }
    await Promise.all(writes);
    return true;
  }

  // -------------------------------------------------------------------------
  // Parse / Serialize
  // -------------------------------------------------------------------------

  private parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Idea | null {
    if (!fm.id && !fm.title) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

    // v1: title may be in frontmatter or first # heading in body
    const bodyText = body.trim();
    const headingMatch = bodyText.match(/^#\s+(.+)$/m);
    const title = fm.title
      ? String(fm.title)
      : headingMatch
      ? headingMatch[1]
      : "";
    const description = headingMatch
      ? bodyText.replace(/^#\s+.+\n?/, "").trim()
      : bodyText;

    return {
      id,
      title,
      status: (fm.status as Idea["status"]) ?? "new",
      category: fm.category != null ? String(fm.category) : undefined,
      priority: fm.priority != null
        ? String(fm.priority) as Idea["priority"]
        : undefined,
      project: fm.project != null ? String(fm.project) : undefined,
      startDate: fm.start_date != null ? String(fm.start_date) : undefined,
      endDate: fm.end_date != null ? String(fm.end_date) : undefined,
      resources: fm.resources != null ? String(fm.resources) : undefined,
      subtasks: Array.isArray(fm.subtasks)
        ? (fm.subtasks as unknown[]).map(String)
        : undefined,
      description: description || undefined,
      links: Array.isArray(fm.links)
        ? (fm.links as unknown[]).map(String)
        : undefined,
      implementedAt: fm.implemented_at != null
        ? String(fm.implemented_at)
        : undefined,
      cancelledAt: fm.cancelled_at != null
        ? String(fm.cancelled_at)
        : undefined,
      createdAt: fm.created_at
        ? String(fm.created_at)
        : new Date().toISOString(),
      updatedAt: fm.updated_at
        ? String(fm.updated_at)
        : new Date().toISOString(),
      createdBy: fm.created_by != null ? String(fm.created_by) : undefined,
      updatedBy: fm.updated_by != null ? String(fm.updated_by) : undefined,
    };
  }

  private serialize(item: Idea): string {
    const fm = mapKeysToFm(
      buildFrontmatter(item as unknown as Record<string, unknown>, BODY_KEYS),
    );
    fm.title = item.title;
    return serializeFrontmatter(fm, item.description ?? "");
  }
}
