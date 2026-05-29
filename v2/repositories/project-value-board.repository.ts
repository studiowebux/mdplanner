// Project Value Board repository — markdown file CRUD under projectvalue/.
// Body uses ## Section headings with bullet lists for each of the 4 sections.

import { serializeFrontmatter } from "../utils/frontmatter.ts";
import type {
  CreateProjectValueBoard,
  ProjectValueBoard,
  ProjectValueBoardSectionKey,
  UpdateProjectValueBoard,
} from "../types/project-value-board.types.ts";
import { PROJECT_VALUE_BOARD_SECTION_KEYS } from "../types/project-value-board.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import {
  PROJECT_VALUE_BOARD_TABLE,
  rowToProjectValueBoard,
} from "../domains/project-value-board/cache.ts";

const SECTION_HEADER_MAP: Array<{
  prefixes: string[];
  key: ProjectValueBoardSectionKey;
}> = [
  {
    prefixes: ["customer segment", "target customer", "who"],
    key: "customerSegments",
  },
  { prefixes: ["problem", "pain point"], key: "problem" },
  { prefixes: ["solution", "how we solve"], key: "solution" },
  { prefixes: ["benefit", "value", "outcome"], key: "benefit" },
];

const SECTION_HEADERS: Record<ProjectValueBoardSectionKey, string> = {
  customerSegments: "Customer Segments",
  problem: "Problem",
  solution: "Solution",
  benefit: "Benefit",
};

function matchSection(heading: string): ProjectValueBoardSectionKey | null {
  const lower = heading.toLowerCase();
  for (const { prefixes, key } of SECTION_HEADER_MAP) {
    if (prefixes.some((p) => lower.startsWith(p))) return key;
  }
  return null;
}

export class ProjectValueBoardRepository extends CachedMarkdownRepository<
  ProjectValueBoard,
  CreateProjectValueBoard,
  UpdateProjectValueBoard
> {
  protected readonly tableName = PROJECT_VALUE_BOARD_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "projectvalue",
      idPrefix: "value",
      nameField: "title",
    });
  }

  protected rowToEntity(
    row: Record<string, string | number | null>,
  ): ProjectValueBoard {
    return rowToProjectValueBoard(row);
  }

  protected fromCreateInput(
    data: CreateProjectValueBoard,
    id: string,
    now: string,
  ): ProjectValueBoard {
    return {
      ...data,
      id,
      date: data.date ?? new Date().toISOString().split("T")[0],
      customerSegments: data.customerSegments ?? [],
      problem: data.problem ?? [],
      solution: data.solution ?? [],
      benefit: data.benefit ?? [],
      createdAt: now,
      updatedAt: now,
    };
  }

  // ---------------------------------------------------------------------------
  // Parse — frontmatter + body sections
  // ---------------------------------------------------------------------------

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): ProjectValueBoard | null {
    if (!fm.id && !fm.title) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

    const lines = body.split("\n");
    let title = fm.title ? String(fm.title) : "";
    const sections: Record<ProjectValueBoardSectionKey, string[]> = {
      customerSegments: [],
      problem: [],
      solution: [],
      benefit: [],
    };
    let currentSection: ProjectValueBoardSectionKey | null = null;

    for (const line of lines) {
      if (line.startsWith("# ")) {
        if (!title) title = line.slice(2).trim();
        continue;
      }

      const h2Match = line.match(/^##\s+(.+)$/);
      if (h2Match) {
        currentSection = matchSection(h2Match[1]);
        continue;
      }

      const listMatch = line.match(/^[-*]\s+(.+)$/);
      if (listMatch && currentSection) {
        sections[currentSection].push(listMatch[1].trim());
      }
    }

    return {
      id,
      title: title || "Untitled Value Board",
      date: fm.date ? String(fm.date) : new Date().toISOString().split("T")[0],
      ...sections,
      project: fm.project != null ? String(fm.project) : undefined,
      notes: fm.notes != null ? String(fm.notes) : undefined,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // Serialize — frontmatter + body sections
  // ---------------------------------------------------------------------------

  protected serialize(item: ProjectValueBoard): string {
    const fm: Record<string, unknown> = {};
    fm.id = item.id;
    fm.title = item.title;
    fm.date = item.date;
    if (item.project) fm.project = item.project;
    if (item.notes) fm.notes = item.notes;
    fm.created_at = item.createdAt;
    fm.updated_at = item.updatedAt;
    if (item.createdBy) fm.created_by = item.createdBy;
    if (item.updatedBy) fm.updated_by = item.updatedBy;
    if (item.archived) fm.archived = item.archived;
    if (item.archivedAt) fm.archived_at = item.archivedAt;
    if (item.archivedBy) fm.archived_by = item.archivedBy;

    const bodyLines: string[] = [`# ${item.title}`];

    for (const key of PROJECT_VALUE_BOARD_SECTION_KEYS) {
      bodyLines.push("");
      bodyLines.push(`## ${SECTION_HEADERS[key]}`);
      bodyLines.push("");
      for (const entry of item[key]) {
        bodyLines.push(`- ${entry}`);
      }
    }

    return serializeFrontmatter(fm, bodyLines.join("\n").trimEnd());
  }
}
