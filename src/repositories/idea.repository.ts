// Idea repository — markdown file CRUD under ideas/.

import type {
  CreateIdea,
  Idea,
  IdeaWithBacklinks,
  UpdateIdea,
} from "../types/idea.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { IDEA_TABLE, rowToIdea } from "../domains/idea/cache.ts";
import { IDEA_BODY_KEYS } from "../domains/idea/constants.ts";

import {
  fmStr,
  fmStrArr,
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
/** Persists Idea entities as markdown with a SQLite cache mirror; resolves cross-idea backlinks (findAllWithBacklinks) and link mutations (link/unlinkIdeas). */
export class IdeaRepository extends CachedMarkdownRepository<
  Idea,
  CreateIdea,
  UpdateIdea
> {
  protected readonly tableName = IDEA_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "ideas",
      idPrefix: "idea",
      nameField: "title",
    });
  }

  protected rowToEntity(row: Record<string, string | number | null>): Idea {
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
      ...stampAuditFields(now),
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Idea | null {
    if (!fm.id && !fm.title) return null;
    const id = resolveEntityId(filename, fm);

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
      category: fmStr(fm, "category"),
      priority: fmStr(fm, "priority") as Idea["priority"] | undefined,
      project: fmStr(fm, "project"),
      submittedBy: fmStr(fm, "submittedBy"),
      startDate: fmStr(fm, "startDate"),
      endDate: fmStr(fm, "endDate"),
      resources: fmStr(fm, "resources"),
      subtasks: fmStrArr(fm, "subtasks"),
      description: description || undefined,
      links: fmStrArr(fm, "links"),
      implementedAt: fmStr(fm, "implementedAt"),
      cancelledAt: fmStr(fm, "cancelledAt"),
      // archived / archivedAt / archivedBy are injected by the base
      // `parseWithArchive` wrapper — no per-domain handling required.
      createdAt: fmStr(fm, "createdAt") ?? new Date().toISOString(),
      updatedAt: fmStr(fm, "updatedAt") ?? new Date().toISOString(),
      createdBy: fmStr(fm, "createdBy"),
      updatedBy: fmStr(fm, "updatedBy"),
    };
  }

  protected serialize(item: Idea): string {
    return this.serializeStandard(item, IDEA_BODY_KEYS, item.description ?? "");
  }
}
