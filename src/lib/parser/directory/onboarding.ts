/**
 * Directory-based parser for Employee Onboarding records.
 * Each onboarding instance is stored as a separate markdown file under onboarding/.
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type { Onboarding, OnboardingStep } from "../../types.ts";

interface OnboardingFrontmatter {
  id: string;
  employeeName: string;
  role: string;
  startDate: string;
  personId?: string;
  steps?: OnboardingStep[];
  created: string;
}

export class OnboardingDirectoryParser extends DirectoryParser<Onboarding> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "onboarding" });
  }

  protected parseFile(content: string, _filePath: string): Onboarding | null {
    const { frontmatter, content: body } = parseFrontmatter<
      OnboardingFrontmatter
    >(content);

    if (!frontmatter.id || !frontmatter.employeeName) {
      return null;
    }

    const notes = body.trim() || undefined;

    return {
      id: frontmatter.id,
      employeeName: frontmatter.employeeName,
      role: frontmatter.role || "",
      startDate: frontmatter.startDate ||
        new Date().toISOString().split("T")[0],
      personId: frontmatter.personId,
      steps: frontmatter.steps ?? [],
      notes,
      created: frontmatter.created || new Date().toISOString(),
    };
  }

  protected serializeItem(record: Onboarding): string {
    const frontmatter: OnboardingFrontmatter = {
      id: record.id,
      employeeName: record.employeeName,
      role: record.role,
      startDate: record.startDate,
      created: record.created,
    };

    if (record.personId) frontmatter.personId = record.personId;
    if (record.steps && record.steps.length > 0) {
      frontmatter.steps = record.steps;
    }

    return buildFileContent(frontmatter, record.notes ?? "");
  }

  async add(
    record: Omit<Onboarding, "id" | "created">,
  ): Promise<Onboarding> {
    const newRecord: Onboarding = {
      ...record,
      steps: record.steps ?? [],
      id: this.generateId("onboarding"),
      created: new Date().toISOString(),
    };
    await this.write(newRecord);
    return newRecord;
  }

  async update(
    id: string,
    updates: Partial<Onboarding>,
  ): Promise<Onboarding | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: Onboarding = {
      ...existing,
      ...updates,
      id: existing.id,
      created: existing.created,
    };
    await this.write(updated);
    return updated;
  }
}
