// Base markdown repository — shared CRUD for flat-directory markdown entities.
// Subclasses implement parse/serialize/fromCreateInput for domain-specific logic.
// Cache-aware repos use CachedMarkdownRepository mixin on top of this.

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
import { mapKeysFromFm, mapKeysToFm } from "../utils/frontmatter-mapper.ts";
import { ciEquals } from "../utils/string.ts";

/** Per-domain wiring for a markdown repository: storage subdir, ID prefix, and name field. */
export interface RepositoryConfig {
  /** Subdirectory name under projectDir (e.g. "goals", "dns"). */
  directory: string;
  /** ID prefix for generateId (e.g. "goal", "dns"). */
  idPrefix: string;
  /** Entity field used for findByName and default sort (e.g. "title", "name"). */
  nameField: string;
}

export abstract class BaseMarkdownRepository<
  T extends { id: string },
  C,
  U,
> {
  protected dir: string;
  protected writer = new SafeWriter();
  protected readonly config: RepositoryConfig;

  constructor(projectDir: string, config: RepositoryConfig) {
    this.config = config;
    this.dir = join(projectDir, config.directory);
  }

  // ---------------------------------------------------------------------------
  // Abstract — subclasses must implement
  // ---------------------------------------------------------------------------

  /** Parse frontmatter + body into a domain entity. Return null to skip. */
  protected abstract parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): T | null;

  /** Serialize entity to markdown string (frontmatter + body). */
  protected abstract serialize(item: T): string;

  /** Construct a full entity from create input, generated id, and ISO timestamp. */
  protected abstract fromCreateInput(data: C, id: string, now: string): T;

  // ---------------------------------------------------------------------------
  // Virtual — overridable by subclasses
  // ---------------------------------------------------------------------------

  /** Sort comparator. Default: alphabetical by nameField. */
  protected compare(a: T, b: T): number {
    const field = this.config.nameField as keyof T;
    return String(a[field]).localeCompare(String(b[field]));
  }

  // ---------------------------------------------------------------------------
  // CRUD — standard implementations
  // ---------------------------------------------------------------------------

  /**
   * Parse + decorate-with-archive-fields wrapper. Per-domain `parse()`
   * methods don't know about `archived`/`archivedAt`/`archivedBy` (those
   * fields live in the base contract, not the entity-specific schema), so
   * the base injects them post-parse from the raw mapped frontmatter. This
   * lets `isArchivedItem` / `findAll` filtering work uniformly across every
   * domain without per-domain parse edits.
   */
  protected parseWithArchive(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): T | null {
    const item = this.parse(filename, fm, body);
    if (!item) return null;
    if (fm.archived === true) {
      (item as Record<string, unknown>).archived = true;
    }
    if (fm.archivedAt !== undefined && fm.archivedAt !== null) {
      (item as Record<string, unknown>).archivedAt = String(fm.archivedAt);
    }
    if (fm.archivedBy !== undefined && fm.archivedBy !== null) {
      (item as Record<string, unknown>).archivedBy = String(fm.archivedBy);
    }
    return item;
  }

  async findAll(): Promise<T[]> {
    const items = await readMarkdownDir(
      this.dir,
      (filename, fm, body) =>
        this.parseWithArchive(filename, mapKeysFromFm(fm), body),
    );
    return items
      .filter((item) => !this.isArchivedItem(item))
      .sort((a, b) => this.compare(a, b));
  }

  /**
   * Disk-only list of archived items. Domains that don't store an `archived`
   * field always return [] (no entity is ever flagged archived).
   */
  async findArchived(): Promise<T[]> {
    const items = await readMarkdownDir(
      this.dir,
      (filename, fm, body) =>
        this.parseWithArchive(filename, mapKeysFromFm(fm), body),
    );
    return items
      .filter((item) => this.isArchivedItem(item))
      .sort((a, b) => this.compare(a, b));
  }

  /**
   * Generic archived check. Items without an `archived` field always return
   * false, so adding archive methods to the base is a no-op for domains that
   * haven't opted in yet.
   */
  protected isArchivedItem(item: T): boolean {
    return (item as Record<string, unknown>).archived === true;
  }

  /**
   * Locate a file for the given id: try `{id}.md` directly first, then scan
   * all files in the directory for a frontmatter id match (handles v1 slug
   * filenames like `dev-agency.md` whose frontmatter id is `customer_agency`).
   * Returns the parsed entity and the actual file path, or null if not found.
   */
  protected async resolveFile(
    id: string,
  ): Promise<{ item: T; filePath: string } | null> {
    const directPath = join(this.dir, `${id}.md`);
    try {
      const content = await Deno.readTextFile(directPath);
      const { frontmatter, body } = parseFrontmatter(content);
      const item = this.parseWithArchive(
        `${id}.md`,
        mapKeysFromFm(frontmatter),
        body,
      );
      if (item) return { item, filePath: directPath };
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    // Filename doesn't match id — scan for the file with matching frontmatter id.
    try {
      for await (const entry of Deno.readDir(this.dir)) {
        if (!entry.isFile || !entry.name.endsWith(".md")) continue;
        if (entry.name === `${id}.md`) continue; // already tried above
        const filePath = join(this.dir, entry.name);
        const content = await Deno.readTextFile(filePath);
        const { frontmatter, body } = parseFrontmatter(content);
        const item = this.parseWithArchive(
          entry.name,
          mapKeysFromFm(frontmatter),
          body,
        );
        if (item && item.id === id) return { item, filePath };
      }
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    return null;
  }

  async findById(id: string): Promise<T | null> {
    const resolved = await this.resolveFile(id);
    return resolved?.item ?? null;
  }

  async findByName(name: string): Promise<T | null> {
    const all = await this.findAll();
    const field = this.config.nameField as keyof T;
    return all.find((item) => ciEquals(String(item[field]), name)) ?? null;
  }

  async create(data: C): Promise<T> {
    await Deno.mkdir(this.dir, { recursive: true });
    const id = generateId(this.config.idPrefix);
    const now = new Date().toISOString();
    const item = this.fromCreateInput(data, id, now);

    const filePath = join(this.dir, `${id}.md`);
    await this.writer.write(
      id,
      () => atomicWrite(filePath, this.serialize(item)),
    );
    return item;
  }

  async update(id: string, data: U): Promise<T | null> {
    const resolved = await this.resolveFile(id);
    if (!resolved) return null;

    const updated = mergeFields(
      { ...resolved.item },
      data as Record<string, unknown>,
    );
    (updated as Record<string, unknown>).updatedAt = new Date().toISOString();

    // Write back to the file's existing path — never force-rename to <id>.md.
    // v1 slug-named files (e.g. `dev-agency.md` with fm id `customer_agency`)
    // must keep their filename so external references stay valid.
    await this.writer.write(
      id,
      () => atomicWrite(resolved.filePath, this.serialize(updated)),
    );

    return updated;
  }

  /**
   * Default delete = soft delete (archive). Subclasses or callers needing the
   * file-removal path must call `hardDelete` explicitly. See
   * `[architecture] MD Planner — Soft-delete (archive) pattern`.
   */
  async delete(id: string): Promise<boolean> {
    return this.archive(id);
  }

  /**
   * Soft-delete: flip `archived` to true and stamp `archivedAt`/`archivedBy`.
   * Mutates the file's frontmatter directly — does NOT round-trip through
   * `serialize()` so domains with a custom serializer that hardcodes
   * specific fields (journal, business-model, fishbone, risk, etc.) still
   * pick up the archive state. The item stays on disk; `findAll` filters it
   * out, `findArchived` returns it. Idempotent.
   */
  async archive(id: string, by?: string): Promise<boolean> {
    return this.writer.write(id, async () => {
      const found = await this.findFile(id);
      if (!found) return false;
      const now = new Date().toISOString();
      const fm = { ...found.frontmatter };
      fm.archived = true;
      fm.archived_at = now;
      if (by !== undefined) fm.archived_by = by;
      fm.updated_at = now;
      await atomicWrite(found.filePath, serializeFrontmatter(fm, found.body));
      return true;
    });
  }

  /**
   * Restore an archived item: clear `archived`/`archived_at`/`archived_by`.
   * Same frontmatter-mutation path as `archive` so custom serializers don't
   * lose the unset.
   */
  async restore(id: string): Promise<boolean> {
    return this.writer.write(id, async () => {
      const found = await this.findFile(id);
      if (!found) return false;
      const fm = { ...found.frontmatter };
      delete fm.archived;
      delete fm.archived_at;
      delete fm.archived_by;
      fm.updated_at = new Date().toISOString();
      await atomicWrite(found.filePath, serializeFrontmatter(fm, found.body));
      return true;
    });
  }

  /**
   * Locate a file by id and return the raw frontmatter + body. Mirrors
   * `resolveFile` but without parse-to-entity — used by `archive`/`restore`
   * to mutate frontmatter without losing fields through a per-domain
   * `serialize()` that hardcodes its frontmatter shape.
   */
  protected async findFile(
    id: string,
  ): Promise<
    {
      frontmatter: Record<string, unknown>;
      body: string;
      filePath: string;
    } | null
  > {
    const directPath = join(this.dir, `${id}.md`);
    try {
      const content = await Deno.readTextFile(directPath);
      const parsed = parseFrontmatter(content);
      return { ...parsed, filePath: directPath };
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    try {
      for await (const entry of Deno.readDir(this.dir)) {
        if (!entry.isFile || !entry.name.endsWith(".md")) continue;
        if (entry.name === `${id}.md`) continue;
        const filePath = join(this.dir, entry.name);
        const content = await Deno.readTextFile(filePath);
        const parsed = parseFrontmatter(content);
        if (
          parsed.frontmatter &&
          (parsed.frontmatter as { id?: unknown }).id === id
        ) {
          return { ...parsed, filePath };
        }
      }
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    return null;
  }

  /**
   * Permanent delete — removes the file from disk. Intended for archived
   * items; not gated here because some flows (cascade cleanup, hard tooling)
   * must always be able to delete the file regardless of archive state.
   */
  async hardDelete(id: string): Promise<boolean> {
    return this.writer.write(id, async () => {
      const resolved = await this.resolveFile(id);
      if (!resolved) return false;
      try {
        await Deno.remove(resolved.filePath);
        return true;
      } catch (err) {
        if (err instanceof Deno.errors.NotFound) return false;
        throw err;
      }
    });
  }

  async upsertEntity(item: T): Promise<T> {
    await Deno.mkdir(this.dir, { recursive: true });
    const filePath = join(this.dir, `${item.id}.md`);
    await this.writer.write(
      item.id,
      () => atomicWrite(filePath, this.serialize(item)),
    );
    return item;
  }

  // ---------------------------------------------------------------------------
  // Protected helpers — available to subclasses
  // ---------------------------------------------------------------------------

  /** Standard serialize: buildFrontmatter excluding bodyKeys, mapKeysToFm, body text. */
  protected serializeStandard(
    item: T,
    bodyKeys: readonly string[],
    body: string,
  ): string {
    const fm = mapKeysToFm(
      buildFrontmatter(item as unknown as Record<string, unknown>, bodyKeys),
    );
    return serializeFrontmatter(fm, body);
  }
}
