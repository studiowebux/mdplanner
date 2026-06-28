// Risk repository — markdown file CRUD under risks/.
// Body: description markdown in the main body, mitigation under ## Mitigation.

import { serializeFrontmatter } from "../utils/frontmatter.ts";
import type { CreateRisk, Risk, UpdateRisk } from "../types/risk.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { RISK_TABLE, rowToRisk } from "../domains/risk/cache.ts";

import {
  fmNum,
  fmStr,
  resolveEntityId,
  serializeAuditFields,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";

/** Split a risk body into its title, description and ## Mitigation section. */
function parseRiskBody(body: string): {
  bodyTitle: string;
  description?: string;
  mitigation?: string;
} {
  const descLines: string[] = [];
  const mitigationLines: string[] = [];
  let bodyTitle = "";
  let currentSection: "desc" | "mitigation" = "desc";

  for (const line of body.split("\n")) {
    if (line.startsWith("# ")) {
      if (!bodyTitle) bodyTitle = line.slice(2).trim();
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

  return {
    bodyTitle,
    description: descLines.join("\n").trim() || undefined,
    mitigation: mitigationLines.join("\n").trim() || undefined,
  };
}
/** Persists Risk entities as markdown with a SQLite cache mirror. */
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
      ...stampAuditFields(now),
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
    const id = resolveEntityId(filename, fm);

    const { bodyTitle, description, mitigation: bodyMitigation } =
      parseRiskBody(
        body,
      );
    const title = fm.title ? String(fm.title) : bodyTitle;
    const mitigation = bodyMitigation ?? fmStr(fm, "mitigation");

    return {
      id,
      title: title || "Untitled Risk",
      description,
      category: (fm.category as Risk["category"]) ?? "other",
      likelihood: fmNum(fm, "likelihood") ?? 3,
      impact: fmNum(fm, "impact") ?? 3,
      status: (fm.status as Risk["status"]) ?? "open",
      mitigation,
      owner: fmStr(fm, "owner"),
      project: fmStr(fm, "project"),
      tags: Array.isArray(fm.tags)
        ? fm.tags.map(String)
        : fm.tags != null
        ? [String(fm.tags)]
        : [],
      createdAt: fmStr(fm, "createdAt") ?? new Date().toISOString(),
      updatedAt: fmStr(fm, "updatedAt") ?? new Date().toISOString(),
      createdBy: fmStr(fm, "createdBy"),
      updatedBy: fmStr(fm, "updatedBy"),
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
    serializeAuditFields(fm, item);

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
