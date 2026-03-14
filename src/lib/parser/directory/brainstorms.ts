/**
 * Directory-based parser for Brainstorms.
 * Each brainstorm is stored as a separate markdown file.
 * Questions are H2 headers, answers are the body text below each header.
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type { Brainstorm, BrainstormQuestion } from "../../types.ts";

interface BrainstormFrontmatter {
  id: string;
  created: string;
  updated?: string;
  tags?: string[];
  linkedProjects?: string[];
  linkedTasks?: string[];
  linkedGoals?: string[];
}

export class BrainstormsDirectoryParser extends DirectoryParser<Brainstorm> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "brainstorms" });
  }

  protected parseFile(content: string, _filePath: string): Brainstorm | null {
    const { frontmatter, content: body } = parseFrontmatter<
      BrainstormFrontmatter
    >(content);

    if (!frontmatter.id) {
      return null;
    }

    const lines = body.split("\n");
    let title = "Untitled Brainstorm";
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

    // Parse H2 sections as questions
    const questions: BrainstormQuestion[] = [];
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
      linkedProjects: frontmatter.linkedProjects,
      linkedTasks: frontmatter.linkedTasks,
      linkedGoals: frontmatter.linkedGoals,
      questions,
    };
  }

  protected serializeItem(brainstorm: Brainstorm): string {
    const frontmatter: BrainstormFrontmatter = {
      id: brainstorm.id,
      created: brainstorm.created,
    };

    if (brainstorm.updated) frontmatter.updated = brainstorm.updated;
    if (brainstorm.tags && brainstorm.tags.length > 0) {
      frontmatter.tags = brainstorm.tags;
    }
    if (brainstorm.linkedProjects && brainstorm.linkedProjects.length > 0) {
      frontmatter.linkedProjects = brainstorm.linkedProjects;
    }
    if (brainstorm.linkedTasks && brainstorm.linkedTasks.length > 0) {
      frontmatter.linkedTasks = brainstorm.linkedTasks;
    }
    if (brainstorm.linkedGoals && brainstorm.linkedGoals.length > 0) {
      frontmatter.linkedGoals = brainstorm.linkedGoals;
    }

    const questionSections = (brainstorm.questions || [])
      .map((q) => `## ${q.question}\n\n${q.answer || ""}`)
      .join("\n\n");

    const body = `# ${brainstorm.title}\n\n${questionSections}`;

    return buildFileContent(frontmatter, body);
  }

  async readByName(name: string): Promise<Brainstorm | null> {
    const all = await this.readAll();
    return all.find((b) => b.title.toLowerCase() === name.toLowerCase()) ??
      null;
  }

  async add(
    brainstorm: Omit<Brainstorm, "id" | "created">,
  ): Promise<Brainstorm> {
    const newBrainstorm: Brainstorm = {
      ...brainstorm,
      id: this.generateId("brainstorm"),
      created: new Date().toISOString(),
    };
    await this.write(newBrainstorm);
    return newBrainstorm;
  }

  async update(
    id: string,
    updates: Partial<Brainstorm>,
  ): Promise<Brainstorm | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: Brainstorm = {
      ...existing,
      ...updates,
      id: existing.id,
      updated: new Date().toISOString(),
    };
    await this.write(updated);
    return updated;
  }
}
