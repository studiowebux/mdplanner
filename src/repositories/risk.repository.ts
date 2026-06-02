// Risk repository — markdown file CRUD under risks/.
// Body: description markdown in the main body, mitigation under ## Mitigation.

import { serializeFrontmatter } from "../utils/frontmatter.ts";
import type { CreateRisk, Risk, UpdateRisk } from "../types/risk.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { RISK_TABLE, rowToRisk } from "../domains/risk/cache.ts";

export class RiskRepository extends CachedMarkdownRepository<
  Risk,
  CreateRisk,
  UpdateRisk
> {
  protected readonly tableName = RISK_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "risks",
      idPrefix: "risk",
      nameField: "title",
    });
  }

  protected rowToEntity(row: Record<string, string | number | null>): Risk {
    return rowToRisk(row);
  }

  protected fromCreateInput(data: CreateRisk, id: string, now: string): Risk {
    return {
      ...data,
      id,
      category: data.category ?? "other",
      likelihood: data.likelihood ?? 3,
      impact: data.impact ?? 3,
      status: data.status ?? "open",
      tags: data.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
  }

  // ---------------------------------------------------------------------------
  // Parse — frontmatter + body (description + optional ## Mitigation section)
  // ---------------------------------------------------------------------------

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Risk | null {
    if (!fm.id && !fm.title) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

    const lines = body.split("\n");
    let title = fm.title ? String(fm.title) : "";
    const descLines: string[] = [];
    const mitigationLines: string[] = [];
    let currentSection: "desc" | "mitigation" = "desc";

    for (const line of lines) {
      if (line.startsWith("# ")) {
        if (!title) title = line.slice(2).trim();
        continue;
      }
      if (line.match(/^##\s+mitigation/i)) {
        currentSection = "mitigation";
        continue;
      }
      if (currentSection === "mitigation") {
        mitigationLines.push(line);
      } else {
        descLines.push(line);
      }
    }

    const description = descLines.join("\n").trim() || undefined;
    const bodyMitigation = mitigationLines.join("\n").trim() || undefined;
    const mitigation = bodyMitigation ??
      (fm.mitigation != null ? String(fm.mitigation) : undefined);

    return {
      id,
      title: title || "Untitled Risk",
      description,
      category: (fm.category as Risk["category"]) ?? "other",
      likelihood: fm.likelihood != null ? Number(fm.likelihood) : 3,
      impact: fm.impact != null ? Number(fm.impact) : 3,
      status: (fm.status as Risk["status"]) ?? "open",
      mitigation,
      owner: fm.owner != null ? String(fm.owner) : undefined,
      project: fm.project != null ? String(fm.project) : undefined,
      tags: Array.isArray(fm.tags)
        ? fm.tags.map(String)
        : fm.tags != null
        ? [String(fm.tags)]
        : [],
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // Serialize — frontmatter + body
  // ---------------------------------------------------------------------------

  protected serialize(item: Risk): string {
    const fm: Record<string, unknown> = {};
    fm.id = item.id;
    fm.title = item.title;
    fm.category = item.category;
    fm.likelihood = item.likelihood;
    fm.impact = item.impact;
    fm.status = item.status;
    if (item.owner) fm.owner = item.owner;
    if (item.project) fm.project = item.project;
    if (item.tags && item.tags.length > 0) fm.tags = item.tags;
    fm.created_at = item.createdAt;
    fm.updated_at = item.updatedAt;
    if (item.createdBy) fm.created_by = item.createdBy;
    if (item.updatedBy) fm.updated_by = item.updatedBy;
    if (item.archived) fm.archived = item.archived;
    if (item.archivedAt) fm.archived_at = item.archivedAt;
    if (item.archivedBy) fm.archived_by = item.archivedBy;

    const sections: string[] = [];

    if (item.description) {
      sections.push(item.description);
      sections.push("");
    }

    if (item.mitigation) {
      sections.push("## Mitigation");
      sections.push("");
      sections.push(item.mitigation);
      sections.push("");
    }

    return serializeFrontmatter(fm, sections.join("\n").trimEnd());
  }
}
