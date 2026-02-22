/**
 * Directory-based parser for SAFE Agreements.
 * Each agreement is stored as a separate markdown file in safe/.
 * Pattern: DirectoryParser subclass
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type { SAFEAgreement } from "../../types.ts";

interface SafeFrontmatter {
  id: string;
  investor: string;
  amount: number;
  valuation_cap: number;
  discount: number;
  type: "pre-money" | "post-money" | "mfn";
  date: string;
  status: "draft" | "signed" | "converted";
  notes: string;
}

export class SafeDirectoryParser extends DirectoryParser<SAFEAgreement> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "safe" });
  }

  protected parseFile(
    content: string,
    _filePath: string,
  ): SAFEAgreement | null {
    const { frontmatter } = parseFrontmatter<SafeFrontmatter>(content);

    if (!frontmatter.id) {
      return null;
    }

    return {
      id: frontmatter.id,
      investor: frontmatter.investor || "",
      amount: Number(frontmatter.amount) || 0,
      valuation_cap: Number(frontmatter.valuation_cap) || 0,
      discount: Number(frontmatter.discount) || 0,
      type: frontmatter.type || "post-money",
      date: frontmatter.date || new Date().toISOString().split("T")[0],
      status: frontmatter.status || "draft",
      notes: frontmatter.notes || "",
    };
  }

  protected serializeItem(agreement: SAFEAgreement): string {
    const frontmatter: SafeFrontmatter = {
      id: agreement.id,
      investor: agreement.investor,
      amount: agreement.amount,
      valuation_cap: agreement.valuation_cap,
      discount: agreement.discount,
      type: agreement.type,
      date: agreement.date,
      status: agreement.status,
      notes: agreement.notes,
    };

    const body =
      `# ${agreement.investor} — $${agreement.amount.toLocaleString()} SAFE`;

    return buildFileContent(frontmatter, body);
  }

  async add(
    agreement: Omit<SAFEAgreement, "id">,
  ): Promise<SAFEAgreement> {
    const newAgreement: SAFEAgreement = {
      ...agreement,
      id: this.generateId("safe"),
    };
    await this.write(newAgreement);
    return newAgreement;
  }

  async update(
    id: string,
    updates: Partial<SAFEAgreement>,
  ): Promise<SAFEAgreement | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: SAFEAgreement = {
      ...existing,
      ...updates,
      id: existing.id,
    };
    await this.write(updated);
    return updated;
  }
}
