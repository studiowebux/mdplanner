/**
 * Directory-based parser for Reflections.
 * Each reflection is stored as a separate markdown file.
 * Questions are H2 headers, answers are the body text below each header.
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type { Reflection, ReflectionQuestion } from "../../types.ts";

interface ReflectionFrontmatter {
  id: string;
  created: string;
  updated?: string;
  tags?: string[];
  templateId?: string;
  linkedProjects?: string[];
  linkedTasks?: string[];
  linkedGoals?: string[];
}

export class ReflectionsDirectoryParser extends DirectoryParser<Reflection> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "reflections" });
  }

  protected parseFile(content: string, _filePath: string): Reflection | null {
    const { frontmatter, content: body } = parseFrontmatter<
      ReflectionFrontmatter
    >(content);

    if (!frontmatter.id) {
      return null;
    }

    const lines = body.split("\n");
    let title = "Untitled Reflection";
    let questionsStartIndex = 0;

    // Extract title from H1
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("# ")) {
        title = line.slice(2).trim();
        questionsStartIndex = i + 1;
        break;
      }
    }

    // Parse H2 sections as questions with answers
    const questions: ReflectionQuestion[] = [];
    let currentQuestion: string | null = null;
    let currentAnswer: string[] = [];

    for (let i = questionsStartIndex; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("## ")) {
        if (currentQuestion !== null) {
          questions.push({
            question: currentQuestion,
            answer: currentAnswer.join("\n").trim() || undefined,
          });
        }
        currentQuestion = line.slice(3).trim();
        currentAnswer = [];
      } else if (currentQuestion !== null) {
        currentAnswer.push(line);
      }
    }

    // Push the last question
    if (currentQuestion !== null) {
      questions.push({
        question: currentQuestion,
        answer: currentAnswer.join("\n").trim() || undefined,
      });
    }

    return {
      id: frontmatter.id,
      title,
      created: frontmatter.created || new Date().toISOString(),
      updated: frontmatter.updated,
      tags: frontmatter.tags,
      templateId: frontmatter.templateId,
      linkedProjects: frontmatter.linkedProjects,
      linkedTasks: frontmatter.linkedTasks,
      linkedGoals: frontmatter.linkedGoals,
      questions,
    };
  }

  protected serializeItem(reflection: Reflection): string {
    const frontmatter: ReflectionFrontmatter = {
      id: reflection.id,
      created: reflection.created,
    };

    if (reflection.updated) frontmatter.updated = reflection.updated;
    if (reflection.tags && reflection.tags.length > 0) {
      frontmatter.tags = reflection.tags;
    }
    if (reflection.templateId) frontmatter.templateId = reflection.templateId;
    if (reflection.linkedProjects && reflection.linkedProjects.length > 0) {
      frontmatter.linkedProjects = reflection.linkedProjects;
    }
    if (reflection.linkedTasks && reflection.linkedTasks.length > 0) {
      frontmatter.linkedTasks = reflection.linkedTasks;
    }
    if (reflection.linkedGoals && reflection.linkedGoals.length > 0) {
      frontmatter.linkedGoals = reflection.linkedGoals;
    }

    const questionSections = (reflection.questions || [])
      .map((q) => `## ${q.question}\n\n${q.answer || ""}`)
      .join("\n\n");

    const body = `# ${reflection.title}\n\n${questionSections}`;

    return buildFileContent(frontmatter, body);
  }

  async readByName(name: string): Promise<Reflection | null> {
    const all = await this.readAll();
    return all.find((r) => r.title.toLowerCase() === name.toLowerCase()) ??
      null;
  }

  async add(
    reflection: Omit<Reflection, "id" | "created">,
  ): Promise<Reflection> {
    const newReflection: Reflection = {
      ...reflection,
      id: this.generateId("reflection"),
      created: new Date().toISOString(),
    };
    await this.write(newReflection);
    return newReflection;
  }

  async update(
    id: string,
    updates: Partial<Reflection>,
  ): Promise<Reflection | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: Reflection = {
      ...existing,
      ...updates,
      id: existing.id,
      updated: new Date().toISOString(),
    };
    await this.write(updated);
    return updated;
  }
}
