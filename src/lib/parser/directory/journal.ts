/**
 * Directory-based parser for Journal entries.
 * Each entry is stored as a separate markdown file under journal/.
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type { JournalEntry, JournalMood } from "../../types.ts";

interface JournalFrontmatter {
  id: string;
  date: string;
  title?: string;
  mood?: JournalMood;
  tags?: string[];
  created: string;
  updated: string;
}

export class JournalDirectoryParser extends DirectoryParser<JournalEntry> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "journal" });
  }

  protected parseFile(content: string, _filePath: string): JournalEntry | null {
    const { frontmatter, content: body } = parseFrontmatter<JournalFrontmatter>(
      content,
    );

    if (!frontmatter.id) {
      return null;
    }

    return {
      id: frontmatter.id,
      date: frontmatter.date || new Date().toISOString().split("T")[0],
      title: frontmatter.title,
      mood: frontmatter.mood,
      tags: frontmatter.tags,
      body: body.trim(),
      created: frontmatter.created || new Date().toISOString(),
      updated: frontmatter.updated || new Date().toISOString(),
    };
  }

  protected serializeItem(entry: JournalEntry): string {
    const frontmatter: JournalFrontmatter = {
      id: entry.id,
      date: entry.date,
      created: entry.created,
      updated: entry.updated,
    };

    if (entry.title) frontmatter.title = entry.title;
    if (entry.mood) frontmatter.mood = entry.mood;
    if (entry.tags && entry.tags.length > 0) frontmatter.tags = entry.tags;

    return buildFileContent(frontmatter, entry.body);
  }

  async add(
    entry: Omit<JournalEntry, "id" | "created" | "updated">,
  ): Promise<JournalEntry> {
    const now = new Date().toISOString();
    const newEntry: JournalEntry = {
      ...entry,
      id: this.generateId("journal"),
      created: now,
      updated: now,
    };
    await this.write(newEntry);
    return newEntry;
  }

  async update(
    id: string,
    updates: Partial<JournalEntry>,
  ): Promise<JournalEntry | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: JournalEntry = {
      ...existing,
      ...updates,
      id: existing.id,
      created: existing.created,
      updated: new Date().toISOString(),
    };
    await this.write(updated);
    return updated;
  }
}
