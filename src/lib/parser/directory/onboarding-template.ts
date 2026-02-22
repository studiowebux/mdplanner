/**
 * Directory-based parser for Onboarding Templates.
 * Each template is stored as a markdown file under onboarding-templates/.
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type {
  OnboardingStepDefinition,
  OnboardingTemplate,
} from "../../types.ts";

interface OnboardingTemplateFrontmatter {
  id: string;
  name: string;
  description?: string;
  steps?: OnboardingStepDefinition[];
  created: string;
}

export class OnboardingTemplateDirectoryParser
  extends DirectoryParser<OnboardingTemplate> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "onboarding-templates" });
  }

  protected parseFile(
    content: string,
    _filePath: string,
  ): OnboardingTemplate | null {
    const { frontmatter } = parseFrontmatter<OnboardingTemplateFrontmatter>(
      content,
    );

    if (!frontmatter.id || !frontmatter.name) {
      return null;
    }

    return {
      id: frontmatter.id,
      name: frontmatter.name,
      description: frontmatter.description,
      steps: frontmatter.steps ?? [],
      created: frontmatter.created || new Date().toISOString(),
    };
  }

  protected serializeItem(template: OnboardingTemplate): string {
    const frontmatter: OnboardingTemplateFrontmatter = {
      id: template.id,
      name: template.name,
      created: template.created,
    };

    if (template.description) frontmatter.description = template.description;
    if (template.steps && template.steps.length > 0) {
      frontmatter.steps = template.steps;
    }

    return buildFileContent(frontmatter, "");
  }

  async add(
    template: Omit<OnboardingTemplate, "id" | "created">,
  ): Promise<OnboardingTemplate> {
    const newTemplate: OnboardingTemplate = {
      ...template,
      steps: template.steps ?? [],
      id: this.generateId("tmpl"),
      created: new Date().toISOString(),
    };
    await this.write(newTemplate);
    return newTemplate;
  }

  async update(
    id: string,
    updates: Partial<OnboardingTemplate>,
  ): Promise<OnboardingTemplate | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: OnboardingTemplate = {
      ...existing,
      ...updates,
      id: existing.id,
      created: existing.created,
    };
    await this.write(updated);
    return updated;
  }
}
