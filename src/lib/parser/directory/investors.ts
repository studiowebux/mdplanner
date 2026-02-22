/**
 * Directory-based parser for Investor Pipeline entries.
 * Each investor is stored as a separate markdown file in investors/.
 * Pattern: DirectoryParser subclass
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type { InvestorEntry } from "../../types.ts";

interface InvestorFrontmatter {
  id: string;
  name: string;
  type: "vc" | "angel" | "family_office" | "corporate" | "accelerator";
  stage: "lead" | "associate" | "partner" | "passed";
  status:
    | "not_started"
    | "in_progress"
    | "term_sheet"
    | "passed"
    | "invested";
  amount_target: number;
  contact: string;
  intro_date: string;
  last_contact: string;
  notes: string;
}

export class InvestorDirectoryParser extends DirectoryParser<InvestorEntry> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "investors" });
  }

  protected parseFile(
    content: string,
    _filePath: string,
  ): InvestorEntry | null {
    const { frontmatter } = parseFrontmatter<InvestorFrontmatter>(content);

    if (!frontmatter.id) {
      return null;
    }

    return {
      id: frontmatter.id,
      name: frontmatter.name || "",
      type: frontmatter.type || "vc",
      stage: frontmatter.stage || "lead",
      status: frontmatter.status || "not_started",
      amount_target: Number(frontmatter.amount_target) || 0,
      contact: frontmatter.contact || "",
      intro_date: frontmatter.intro_date || "",
      last_contact: frontmatter.last_contact || "",
      notes: frontmatter.notes || "",
    };
  }

  protected serializeItem(investor: InvestorEntry): string {
    const frontmatter: InvestorFrontmatter = {
      id: investor.id,
      name: investor.name,
      type: investor.type,
      stage: investor.stage,
      status: investor.status,
      amount_target: investor.amount_target,
      contact: investor.contact,
      intro_date: investor.intro_date,
      last_contact: investor.last_contact,
      notes: investor.notes,
    };

    const body = `# ${investor.name}`;

    return buildFileContent(frontmatter, body);
  }

  async add(investor: Omit<InvestorEntry, "id">): Promise<InvestorEntry> {
    const newInvestor: InvestorEntry = {
      ...investor,
      id: this.generateId("investor"),
    };
    await this.write(newInvestor);
    return newInvestor;
  }

  async update(
    id: string,
    updates: Partial<InvestorEntry>,
  ): Promise<InvestorEntry | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: InvestorEntry = {
      ...existing,
      ...updates,
      id: existing.id,
    };
    await this.write(updated);
    return updated;
  }
}
