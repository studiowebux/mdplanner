// Business Model Canvas repository — markdown file CRUD under business-models/.
// Body uses ## Section headings with bullet lists for each of the 9 BMC sections.

import { serializeFrontmatter } from "../utils/frontmatter.ts";
import type {
  BusinessModel,
  BusinessModelSectionKey,
  CreateBusinessModel,
  UpdateBusinessModel,
} from "../types/business-model.types.ts";
import { BUSINESS_MODEL_SECTION_KEYS } from "../types/business-model.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import {
  BUSINESS_MODEL_TABLE,
  rowToBusinessModel,
} from "../domains/business-model/cache.ts";

import {
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
// Maps ## heading prefixes (lowercase) to section keys
const SECTION_HEADER_MAP: Array<{
  prefixes: string[];
  key: BusinessModelSectionKey;
}> = [
  { prefixes: ["key partner", "partners"], key: "keyPartners" },
  { prefixes: ["key activit", "activities"], key: "keyActivities" },
  { prefixes: ["key resource", "resources"], key: "keyResources" },
  { prefixes: ["value proposition"], key: "valueProposition" },
  { prefixes: ["customer relationship"], key: "customerRelationships" },
  { prefixes: ["channel"], key: "channels" },
  { prefixes: ["customer segment"], key: "customerSegments" },
  { prefixes: ["cost structure", "cost"], key: "costStructure" },
  { prefixes: ["revenue stream", "revenue"], key: "revenueStreams" },
];

const SECTION_HEADERS: Record<BusinessModelSectionKey, string> = {
  keyPartners: "Key Partners",
  keyActivities: "Key Activities",
  keyResources: "Key Resources",
  valueProposition: "Value Proposition",
  customerRelationships: "Customer Relationships",
  channels: "Channels",
  customerSegments: "Customer Segments",
  costStructure: "Cost Structure",
  revenueStreams: "Revenue Streams",
};

function matchSection(heading: string): BusinessModelSectionKey | null {
  const lower = heading.toLowerCase();
  for (const { prefixes, key } of SECTION_HEADER_MAP) {
    if (prefixes.some((p) => lower.startsWith(p))) return key;
  }
  return null;
}

export class BusinessModelRepository extends CachedMarkdownRepository<
  BusinessModel,
  CreateBusinessModel,
  UpdateBusinessModel
> {
  protected readonly tableName = BUSINESS_MODEL_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "businessmodel",
      idPrefix: "bmc",
      nameField: "title",
    });
  }

  protected rowToEntity(
    row: Record<string, string | number | null>,
  ): BusinessModel {
    return rowToBusinessModel(row);
  }

  protected fromCreateInput(
    data: CreateBusinessModel,
    id: string,
    now: string,
  ): BusinessModel {
    return {
      ...data,
      id,
      date: data.date ?? new Date().toISOString().split("T")[0],
      keyPartners: data.keyPartners ?? [],
      keyActivities: data.keyActivities ?? [],
      keyResources: data.keyResources ?? [],
      valueProposition: data.valueProposition ?? [],
      customerRelationships: data.customerRelationships ?? [],
      channels: data.channels ?? [],
      customerSegments: data.customerSegments ?? [],
      costStructure: data.costStructure ?? [],
      revenueStreams: data.revenueStreams ?? [],
      ...stampAuditFields(now),
    };
  }

  // ---------------------------------------------------------------------------
  // Parse — frontmatter + body sections
  // ---------------------------------------------------------------------------

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): BusinessModel | null {
    if (!fm.id && !fm.title) return null;
    const id = resolveEntityId(filename, fm);

    const lines = body.split("\n");
    let title = fm.title ? String(fm.title) : "";
    const sections: Record<BusinessModelSectionKey, string[]> = {
      keyPartners: [],
      keyActivities: [],
      keyResources: [],
      valueProposition: [],
      customerRelationships: [],
      channels: [],
      customerSegments: [],
      costStructure: [],
      revenueStreams: [],
    };
    let currentSection: BusinessModelSectionKey | null = null;
    const extraLines: string[] = [];
    let pastSections = false;

    for (const line of lines) {
      if (line.startsWith("# ")) {
        if (!title) title = line.slice(2).trim();
        continue;
      }

      const h2Match = line.match(/^##\s+(.+)$/);
      if (h2Match) {
        const key = matchSection(h2Match[1]);
        if (key) {
          currentSection = key;
          pastSections = false;
        } else {
          currentSection = null;
          pastSections = true;
          extraLines.push(line);
        }
        continue;
      }

      const listMatch = line.match(/^[-*]\s+(.+)$/);
      if (listMatch && currentSection && !pastSections) {
        sections[currentSection].push(listMatch[1].trim());
        continue;
      }

      if (pastSections) {
        extraLines.push(line);
      }
    }

    const bodyNotes = extraLines.join("\n").trim();
    const fmNotes = fm.notes != null ? String(fm.notes) : "";
    const notes = bodyNotes || fmNotes || undefined;

    return {
      id,
      title: title || "Untitled Business Model",
      date: fm.date ? String(fm.date) : new Date().toISOString().split("T")[0],
      ...sections,
      project: fm.project != null ? String(fm.project) : undefined,
      notes,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // Serialize — frontmatter + body sections
  // ---------------------------------------------------------------------------

  protected serialize(item: BusinessModel): string {
    const fm: Record<string, unknown> = {};
    fm.id = item.id;
    fm.title = item.title;
    fm.date = item.date;
    if (item.project) fm.project = item.project;
    fm.created_at = item.createdAt;
    fm.updated_at = item.updatedAt;
    if (item.createdBy) fm.created_by = item.createdBy;
    if (item.updatedBy) fm.updated_by = item.updatedBy;
    // Preserve archive fields — custom serializers must round-trip these or
    // update() drops them. See soft-delete architecture note.
    if (item.archived) fm.archived = item.archived;
    if (item.archivedAt) fm.archived_at = item.archivedAt;
    if (item.archivedBy) fm.archived_by = item.archivedBy;

    const bodyLines: string[] = [];

    for (const key of BUSINESS_MODEL_SECTION_KEYS) {
      bodyLines.push(`## ${SECTION_HEADERS[key]}`);
      bodyLines.push("");
      for (const entry of item[key]) {
        bodyLines.push(`- ${entry}`);
      }
      bodyLines.push("");
    }

    if (item.notes) {
      bodyLines.push(item.notes);
      bodyLines.push("");
    }

    return serializeFrontmatter(fm, bodyLines.join("\n").trimEnd());
  }
}
