/**
 * Directory-based parser for Reflection Templates.
 * Each template is stored as a separate markdown file.
 * Questions are H2 headers (no answers — templates define the question set only).
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type { ReflectionTemplate } from "../../types.ts";

interface ReflectionTemplateFrontmatter {
  id: string;
  created: string;
  updated?: string;
  tags?: string[];
}

export class ReflectionTemplatesDirectoryParser
  extends DirectoryParser<ReflectionTemplate> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "reflection-templates" });
  }

  protected parseFile(
    content: string,
    _filePath: string,
  ): ReflectionTemplate | null {
    const { frontmatter, content: body } = parseFrontmatter<
      ReflectionTemplateFrontmatter
    >(content);

    if (!frontmatter.id) {
      return null;
    }

    const lines = body.split("\n");
    let title = "Untitled Template";
    let description: string | undefined;
    let bodyStartIndex = 0;

    // Extract title from H1
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("# ")) {
        title = line.slice(2).trim();
        bodyStartIndex = i + 1;
        break;
      }
    }

    // Extract optional description (text before first H2)
    const descLines: string[] = [];
    let questionsStartIndex = bodyStartIndex;
    for (let i = bodyStartIndex; i < lines.length; i++) {
      if (lines[i].startsWith("## ")) {
        questionsStartIndex = i;
        break;
      }
      descLines.push(lines[i]);
    }
    const descText = descLines.join("\n").trim();
    if (descText) description = descText;

    // Parse H2 sections as questions (no answers in templates)
    const questions: string[] = [];
    for (let i = questionsStartIndex; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("## ")) {
        questions.push(line.slice(3).trim());
      }
    }

    return {
      id: frontmatter.id,
      title,
      description,
      tags: frontmatter.tags,
      questions,
      created: frontmatter.created || new Date().toISOString(),
      updated: frontmatter.updated,
    };
  }

  protected serializeItem(template: ReflectionTemplate): string {
    const frontmatter: ReflectionTemplateFrontmatter = {
      id: template.id,
      created: template.created,
    };

    if (template.updated) frontmatter.updated = template.updated;
    if (template.tags && template.tags.length > 0) {
      frontmatter.tags = template.tags;
    }

    const questionSections = (template.questions || [])
      .map((q) => `## ${q}`)
      .join("\n\n");

    const descPart = template.description ? `\n\n${template.description}` : "";
    const body = `# ${template.title}${descPart}\n\n${questionSections}`;

    return buildFileContent(frontmatter, body);
  }

  async readByName(name: string): Promise<ReflectionTemplate | null> {
    const all = await this.readAll();
    return (
      all.find((t) => t.title.toLowerCase() === name.toLowerCase()) ?? null
    );
  }

  async add(
    template: Omit<ReflectionTemplate, "id" | "created">,
  ): Promise<ReflectionTemplate> {
    const newTemplate: ReflectionTemplate = {
      ...template,
      id: this.generateId("reflection_template"),
      created: new Date().toISOString(),
    };
    await this.write(newTemplate);
    return newTemplate;
  }

  async update(
    id: string,
    updates: Partial<ReflectionTemplate>,
  ): Promise<ReflectionTemplate | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: ReflectionTemplate = {
      ...existing,
      ...updates,
      id: existing.id,
      updated: new Date().toISOString(),
    };
    await this.write(updated);
    return updated;
  }
}
