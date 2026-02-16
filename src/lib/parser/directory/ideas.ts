/**
 * Directory-based parser for Ideas.
 * Each idea is stored as a separate markdown file.
 */
import { DirectoryParser, parseFrontmatter, buildFileContent } from "./base.ts";
import type { Idea } from "../../types.ts";

interface IdeaFrontmatter {
  id: string;
  status: "new" | "considering" | "planned" | "approved" | "rejected";
  category?: string;
  created: string;
  links?: string[];
}

export class IdeasDirectoryParser extends DirectoryParser<Idea> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "ideas" });
  }

  protected parseFile(content: string, _filePath: string): Idea | null {
    const { frontmatter, content: body } = parseFrontmatter<IdeaFrontmatter>(content);

    if (!frontmatter.id) {
      return null;
    }

    // Extract title from first heading
    const lines = body.split("\n");
    let title = "Untitled Idea";
    let descriptionStartIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("# ")) {
        title = line.slice(2).trim();
        descriptionStartIndex = i + 1;
        break;
      }
    }

    const description = lines.slice(descriptionStartIndex).join("\n").trim();

    return {
      id: frontmatter.id,
      title,
      status: frontmatter.status || "new",
      category: frontmatter.category,
      created: frontmatter.created || new Date().toISOString(),
      description: description || undefined,
      links: frontmatter.links,
    };
  }

  protected serializeItem(idea: Idea): string {
    const frontmatter: IdeaFrontmatter = {
      id: idea.id,
      status: idea.status,
      created: idea.created,
    };

    if (idea.category) {
      frontmatter.category = idea.category;
    }
    if (idea.links && idea.links.length > 0) {
      frontmatter.links = idea.links;
    }

    const body = `# ${idea.title}\n\n${idea.description || ""}`;

    return buildFileContent(frontmatter, body);
  }

  /**
   * Add a new idea.
   */
  async add(idea: Omit<Idea, "id" | "created">): Promise<Idea> {
    const newIdea: Idea = {
      ...idea,
      id: this.generateId("idea"),
      created: new Date().toISOString(),
    };
    await this.write(newIdea);
    return newIdea;
  }

  /**
   * Update an existing idea.
   */
  async update(id: string, updates: Partial<Idea>): Promise<Idea | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: Idea = {
      ...existing,
      ...updates,
      id: existing.id,
    };
    await this.write(updated);
    return updated;
  }

  /**
   * Link two ideas together (bidirectional).
   */
  async linkIdeas(ideaId1: string, ideaId2: string): Promise<boolean> {
    const idea1 = await this.read(ideaId1);
    const idea2 = await this.read(ideaId2);

    if (!idea1 || !idea2) return false;

    // Add links if not already present
    const links1 = idea1.links || [];
    const links2 = idea2.links || [];

    if (!links1.includes(ideaId2)) {
      links1.push(ideaId2);
      await this.update(ideaId1, { links: links1 });
    }

    if (!links2.includes(ideaId1)) {
      links2.push(ideaId1);
      await this.update(ideaId2, { links: links2 });
    }

    return true;
  }

  /**
   * Unlink two ideas.
   */
  async unlinkIdeas(ideaId1: string, ideaId2: string): Promise<boolean> {
    const idea1 = await this.read(ideaId1);
    const idea2 = await this.read(ideaId2);

    if (!idea1 || !idea2) return false;

    if (idea1.links) {
      await this.update(ideaId1, { links: idea1.links.filter(id => id !== ideaId2) });
    }

    if (idea2.links) {
      await this.update(ideaId2, { links: idea2.links.filter(id => id !== ideaId1) });
    }

    return true;
  }
}
