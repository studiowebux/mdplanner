/**
 * Directory-based parser for Fishbone (Ishikawa) Diagrams.
 * Each diagram is stored as a separate markdown file under fishbone/.
 * Causes and sub-causes are stored in the markdown body as ## sections and - lists.
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type { Fishbone, FishboneCause } from "../../types.ts";

interface FishboneFrontmatter {
  id: string;
  title: string;
  description?: string;
  created: string;
  updated: string;
}

const DEFAULT_CATEGORIES = [
  "People",
  "Process",
  "Machine",
  "Material",
  "Method",
  "Measurement",
];

export class FishboneDirectoryParser extends DirectoryParser<Fishbone> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "fishbone" });
  }

  protected parseFile(content: string, _filePath: string): Fishbone | null {
    const { frontmatter, content: body } = parseFrontmatter<
      FishboneFrontmatter
    >(content);

    if (!frontmatter.id) return null;

    const causes: FishboneCause[] = [];
    let currentCause: FishboneCause | null = null;

    for (const line of body.split("\n")) {
      if (line.startsWith("## ")) {
        if (currentCause) causes.push(currentCause);
        currentCause = { category: line.slice(3).trim(), subcauses: [] };
        continue;
      }
      const listMatch = line.match(/^[-*]\s+(.+)$/);
      if (listMatch && currentCause) {
        currentCause.subcauses.push(listMatch[1].trim());
      }
    }
    if (currentCause) causes.push(currentCause);

    return {
      id: frontmatter.id,
      title: frontmatter.title || "Untitled Diagram",
      description: frontmatter.description,
      causes,
      created: frontmatter.created || new Date().toISOString(),
      updated: frontmatter.updated || new Date().toISOString(),
    };
  }

  protected serializeItem(fishbone: Fishbone): string {
    const frontmatter: FishboneFrontmatter = {
      id: fishbone.id,
      title: fishbone.title,
      created: fishbone.created,
      updated: fishbone.updated,
    };
    if (fishbone.description) frontmatter.description = fishbone.description;

    const sections: string[] = [];
    for (const cause of fishbone.causes) {
      sections.push(`## ${cause.category}`);
      sections.push("");
      for (const sub of cause.subcauses) {
        sections.push(`- ${sub}`);
      }
      sections.push("");
    }

    return buildFileContent(frontmatter, sections.join("\n").trim());
  }

  async add(
    data: Omit<Fishbone, "id" | "created" | "updated">,
  ): Promise<Fishbone> {
    const now = new Date().toISOString();
    const causes = data.causes && data.causes.length > 0
      ? data.causes
      : DEFAULT_CATEGORIES.map((c) => ({ category: c, subcauses: [] }));

    const fishbone: Fishbone = {
      ...data,
      id: this.generateId("fishbone"),
      causes,
      created: now,
      updated: now,
    };
    await this.write(fishbone);
    return fishbone;
  }

  async update(
    id: string,
    updates: Partial<Fishbone>,
  ): Promise<Fishbone | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: Fishbone = {
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
