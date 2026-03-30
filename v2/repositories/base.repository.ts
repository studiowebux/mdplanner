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
import { mapKeysToFm } from "../utils/frontmatter-mapper.ts";
import { ciEquals } from "../utils/string.ts";

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

  async findAll(): Promise<T[]> {
    const items = await readMarkdownDir(
      this.dir,
      (filename, fm, body) => this.parse(filename, fm, body),
    );
    return items.sort((a, b) => this.compare(a, b));
  }

  async findById(id: string): Promise<T | null> {
    try {
      const content = await Deno.readTextFile(join(this.dir, `${id}.md`));
      const { frontmatter, body } = parseFrontmatter(content);
      return this.parse(`${id}.md`, frontmatter, body);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) return null;
      throw err;
    }
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
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = mergeFields(
      { ...existing },
      data as Record<string, unknown>,
    );
    (updated as Record<string, unknown>).updatedAt = new Date().toISOString();

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
