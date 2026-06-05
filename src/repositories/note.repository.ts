// Note repository — reads and writes note markdown files from disk.
// Parses enhanced content (paragraphs + custom sections) from markdown.
// Pattern: Repository (same as milestone.repository.ts, task.repository.ts)

import { join } from "@std/path";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../utils/frontmatter.ts";
import { generateId } from "../utils/id.ts";
import { findFileById, mergeFields } from "../utils/repo-helpers.ts";
import { atomicWrite, SafeWriter } from "../utils/safe-io.ts";
import { mapKeysToFm, parseAuditFields } from "../utils/frontmatter-mapper.ts";
import { ciEquals } from "../utils/string.ts";
import {
  parseEnhancedContent,
  serializeEnhancedContent,
} from "../utils/note-content.ts";
import type { CacheDatabase } from "../database/sqlite/mod.ts";
import type { CreateNote, Note, UpdateNote } from "../types/note.types.ts";

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class NoteRepository {
  private notesDir: string;
  private writer = new SafeWriter();
  private cacheDb: CacheDatabase | null = null;

  constructor(projectDir: string) {
    this.notesDir = join(projectDir, "notes");
  }

  /**
   * Cache wiring — accepted to satisfy the `runSoftDeleteSuite` contract and
   * the canonical setCacheDb pattern. NoteRepository's read paths are
   * intentionally disk-only (parse is too custom to share with a generic
   * row mapper), but the cache row is still required for global-search
   * archive filtering (see `SearchEngine`).
   */
  setCacheDb(db: CacheDatabase): void {
    this.cacheDb = db;
  }

  async findAll(): Promise<Note[]> {
    const notes: Note[] = [];
    try {
      for await (const entry of Deno.readDir(this.notesDir)) {
        if (!entry.isFile || !entry.name.endsWith(".md")) continue;
        const content = await Deno.readTextFile(
          join(this.notesDir, entry.name),
        );
        const note = this.parse(content);
        if (note && note.archived !== true) notes.push(note);
      }
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    return notes;
  }

  /** Disk-only list of archived notes. Mirror of `findAll` for the
   * archived-view route. */
  async findArchived(): Promise<Note[]> {
    const notes: Note[] = [];
    try {
      for await (const entry of Deno.readDir(this.notesDir)) {
        if (!entry.isFile || !entry.name.endsWith(".md")) continue;
        const content = await Deno.readTextFile(
          join(this.notesDir, entry.name),
        );
        const note = this.parse(content);
        if (note && note.archived === true) notes.push(note);
      }
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    return notes;
  }

  async findById(id: string): Promise<Note | null> {
    const { entity } = await findFileById(
      this.notesDir,
      (c) => this.parse(c),
      id,
    );
    return entity;
  }

  async findByName(name: string): Promise<Note | null> {
    const all = await this.findAll();
    return all.find((n) => ciEquals(n.title, name)) ?? null;
  }

  async create(data: CreateNote): Promise<Note> {
    await Deno.mkdir(this.notesDir, { recursive: true });
    const id = generateId("note");
    const now = new Date().toISOString();

    const note: Note = {
      ...data,
      id,
      content: data.content ?? "",
      createdAt: now,
      updatedAt: now,
      revision: 1,
    };

    const filePath = join(this.notesDir, `${id}.md`);
    await this.writer.write(
      id,
      () => atomicWrite(filePath, this.serialize(note)),
    );

    return note;
  }

  async update(id: string, data: UpdateNote): Promise<Note | null> {
    const { file, entity: note } = await findFileById(
      this.notesDir,
      (c) => this.parse(c),
      id,
    );
    if (!file || !note) return null;

    const now = new Date().toISOString();
    const updated: Note = mergeFields(
      { ...note, updatedAt: now, revision: (note.revision ?? 1) + 1 },
      data as Record<string, unknown>,
    );

    await this.writer.write(
      id,
      () => atomicWrite(file, this.serialize(updated)),
    );

    return updated;
  }

  /** Default delete = soft delete (archive). Hard removal requires an
   * explicit `hardDelete(id)` call. See
   * `[architecture] MD Planner — Soft-delete (archive) pattern`. */
  async delete(id: string): Promise<boolean> {
    return this.archive(id);
  }

  /**
   * Soft-delete: flip `archived` to true and stamp `archived_at` /
   * `archived_by` directly into the file's frontmatter. Bypasses
   * `serialize()` on purpose — the enhanced-content parse/serialize cycle
   * regenerates paragraph IDs (`p_${Date.now()}_n`), which would mutate
   * unrelated state. Mirrors `BaseMarkdownRepository.archive`. Idempotent.
   */
  async archive(id: string, by?: string): Promise<boolean> {
    return this.writer.write(id, async () => {
      const found = await this.findRawFile(id);
      if (!found) return false;
      const now = new Date().toISOString();
      const fm = { ...found.frontmatter };
      fm.archived = true;
      fm.archived_at = now;
      if (by !== undefined) fm.archived_by = by;
      fm.updated_at = now;
      await atomicWrite(
        found.filePath,
        serializeFrontmatter(fm, found.body),
      );
      return true;
    });
  }

  /** Restore an archived note: drop the three archive frontmatter fields. */
  async restore(id: string): Promise<boolean> {
    return this.writer.write(id, async () => {
      const found = await this.findRawFile(id);
      if (!found) return false;
      const fm = { ...found.frontmatter };
      delete fm.archived;
      delete fm.archived_at;
      delete fm.archived_by;
      fm.updated_at = new Date().toISOString();
      await atomicWrite(
        found.filePath,
        serializeFrontmatter(fm, found.body),
      );
      return true;
    });
  }

  /** Permanent delete — removes the file from disk. No recovery. */
  async hardDelete(id: string): Promise<boolean> {
    return this.writer.write(id, async () => {
      const { file } = await findFileById(
        this.notesDir,
        (c) => this.parse(c),
        id,
      );
      if (!file) return false;
      try {
        await Deno.remove(file);
        return true;
      } catch (err) {
        if (err instanceof Deno.errors.NotFound) return false;
        throw err;
      }
    });
  }

  /**
   * Locate a file by id and return its raw frontmatter + body. Used by
   * `archive`/`restore` so they can mutate frontmatter without going
   * through the enhanced-content serializer.
   */
  private async findRawFile(
    id: string,
  ): Promise<
    {
      frontmatter: Record<string, unknown>;
      body: string;
      filePath: string;
    } | null
  > {
    try {
      for await (const entry of Deno.readDir(this.notesDir)) {
        if (!entry.isFile || !entry.name.endsWith(".md")) continue;
        const filePath = join(this.notesDir, entry.name);
        const content = await Deno.readTextFile(filePath);
        const parsed = parseFrontmatter(content);
        if ((parsed.frontmatter as { id?: unknown })?.id === id) {
          return { ...parsed, filePath };
        }
      }
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Parse — markdown → Note
  // -------------------------------------------------------------------------

  private parse(content: string): Note | null {
    const { frontmatter: fm, body } = parseFrontmatter(content);
    if (!fm.id) return null;

    // Title from first # heading
    const lines = body.split("\n");
    let title = "Untitled";
    let contentStartIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("# ")) {
        title = lines[i].slice(2).trim();
        contentStartIndex = i + 1;
        break;
      }
    }

    const bodyContent = lines.slice(contentStartIndex).join("\n").trim();
    const { paragraphs, customSections } = parseEnhancedContent(bodyContent);

    const audit = parseAuditFields(fm);
    return {
      id: String(fm.id),
      title,
      content: bodyContent,
      paragraphs,
      customSections,
      revision: Number(fm.revision ?? 1),
      project: fm.project != null ? String(fm.project) : undefined,
      createdAt: audit.createdAt ?? "",
      updatedAt: audit.updatedAt ?? "",
      createdBy: audit.createdBy,
      updatedBy: audit.updatedBy,
      archived: fm.archived === true ? true : undefined,
      archivedAt: fm.archived_at != null ? String(fm.archived_at) : undefined,
      archivedBy: fm.archived_by != null ? String(fm.archived_by) : undefined,
    };
  }

  // -------------------------------------------------------------------------
  // Serialize — Note → markdown
  // -------------------------------------------------------------------------

  async upsertEntity(note: Note): Promise<Note> {
    await Deno.mkdir(this.notesDir, { recursive: true });
    const filePath = join(this.notesDir, `${note.id}.md`);
    await this.writer.write(
      note.id,
      () => atomicWrite(filePath, this.serialize(note)),
    );
    return note;
  }

  protected serialize(note: Note): string {
    const fm: Record<string, unknown> = mapKeysToFm({
      id: note.id,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      revision: note.revision,
      mode: "enhanced",
      ...(note.project ? { project: note.project } : {}),
      ...(note.createdBy ? { createdBy: note.createdBy } : {}),
      ...(note.updatedBy ? { updatedBy: note.updatedBy } : {}),
      ...(note.archived ? { archived: note.archived } : {}),
      ...(note.archivedAt ? { archivedAt: note.archivedAt } : {}),
      ...(note.archivedBy ? { archivedBy: note.archivedBy } : {}),
    });

    let body = `# ${note.title}\n\n`;

    if (note.paragraphs?.length || note.customSections?.length) {
      body += serializeEnhancedContent(
        note.paragraphs ?? [],
        note.customSections ?? [],
      );
    } else if (note.content) {
      body += note.content;
    }

    return serializeFrontmatter(fm, body.trimEnd());
  }
}
