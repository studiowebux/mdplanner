// Idea repository — markdown file CRUD under ideas/.

import type {
  CreateIdea,
  Idea,
  IdeaWithBacklinks,
  UpdateIdea,
} from "../types/idea.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { IDEA_TABLE, rowToIdea } from "../domains/idea/cache.ts";

const BODY_KEYS = ["id", "description"] as const;

export class IdeaRepository extends CachedMarkdownRepository<
  Idea,
  CreateIdea,
  UpdateIdea
> {
  protected readonly tableName = IDEA_TABLE;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "ideas",
      idPrefix: "idea",
      nameField: "title",
    });
  }

  protected rowToEntity(row: Record<string, unknown>): Idea {
    return rowToIdea(row);
  }

  // Auto-set lifecycle timestamps on status transitions.
  // Builds a new data object with extra fields — never mutates the input.
  override async update(id: string, data: UpdateIdea): Promise<Idea | null> {
    if (!data.status) return super.update(id, data);

    const existing = await this.findById(id);
    if (!existing) return null;

    const extra: Record<string, unknown> = {};
    if (data.status !== existing.status) {
      const now = new Date().toISOString();
      if (data.status === "implemented" && !existing.implementedAt) {
        extra.implementedAt = now;
      }
      if (data.status === "cancelled" && !existing.cancelledAt) {
        extra.cancelledAt = now;
      }
    }

    return super.update(id, { ...data, ...extra } as UpdateIdea);
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

  async linkIdeas(id1: string, id2: string): Promise<boolean> {
    const idea1 = await this.findById(id1);
    const idea2 = await this.findById(id2);
    if (!idea1 || !idea2) return false;

    const links1 = idea1.links ?? [];
    const links2 = idea2.links ?? [];

    const writes: Promise<Idea | null>[] = [];
    if (!links1.includes(id2)) {
      writes.push(super.update(id1, { links: [...links1, id2] } as UpdateIdea));
    }
    if (!links2.includes(id1)) {
      writes.push(super.update(id2, { links: [...links2, id1] } as UpdateIdea));
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
        super.update(
          id1,
          { links: idea1.links.filter((l) => l !== id2) } as UpdateIdea,
        ),
      );
    }
    if (idea2.links?.includes(id1)) {
      writes.push(
        super.update(
          id2,
          { links: idea2.links.filter((l) => l !== id1) } as UpdateIdea,
        ),
      );
    }
    await Promise.all(writes);
    return true;
  }

  protected fromCreateInput(data: CreateIdea, id: string, now: string): Idea {
    return {
      ...data,
      id,
      status: data.status ?? "new",
      createdAt: now,
      updatedAt: now,
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Idea | null {
    if (!fm.id && !fm.title) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

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

  protected serialize(item: Idea): string {
    return this.serializeStandard(item, BODY_KEYS, item.description ?? "");
  }
}
