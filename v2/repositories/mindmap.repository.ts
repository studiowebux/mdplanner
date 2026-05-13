// Mindmap repository — markdown file CRUD under mindmaps/.
// Body format: # Title, then 2-space-indented bullet tree.

import type {
  CreateMindmap,
  Mindmap,
  MindmapNode,
  UpdateMindmap,
} from "../types/mindmap.types.ts";
import { MindmapSchema } from "../types/mindmap.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { MINDMAP_TABLE, rowToMindmap } from "../domains/mindmap/cache.ts";
import { log } from "../singletons/logger.ts";

const MINDMAP_BODY_KEYS = ["id", "title", "nodes"] as const;

export class MindmapRepository extends CachedMarkdownRepository<
  Mindmap,
  CreateMindmap,
  UpdateMindmap
> {
  protected readonly tableName = MINDMAP_TABLE;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "mindmaps",
      idPrefix: "mindmap",
      nameField: "title",
    });
  }

  protected rowToEntity(
    row: Record<string, string | number | null>,
  ): Mindmap {
    return rowToMindmap(row);
  }

  protected fromCreateInput(
    data: CreateMindmap,
    id: string,
    now: string,
  ): Mindmap {
    return {
      ...data,
      id,
      nodes: data.nodes ?? [],
      createdAt: now,
      updatedAt: now,
    };
  }

  // ---------------------------------------------------------------------------
  // Parse — title from first `# heading`, tree from 2-space indented bullets
  // ---------------------------------------------------------------------------

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Mindmap | null {
    const headingMatch = body.match(/^#\s+(.+)$/m);
    if (!fm.id && !fm.title && !headingMatch) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

    const title = fm.title
      ? String(fm.title)
      : headingMatch
      ? headingMatch[1].trim()
      : "";

    const bulletStart = headingMatch
      ? (headingMatch.index ?? 0) + headingMatch[0].length
      : 0;
    const nodes = parseBulletTree(body.slice(bulletStart));
    if (nodes === null) return null;

    const candidate = {
      id,
      title: title || "Untitled Mindmap",
      nodes,
      project: fm.project != null ? String(fm.project) : undefined,
      notes: fm.notes != null ? String(fm.notes) : undefined,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };

    const result = MindmapSchema.safeParse(candidate);
    if (!result.success) {
      log.warn(
        `[mindmap] skipping ${filename}: ${
          result.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")
        }`,
      );
      return null;
    }
    return result.data;
  }

  // ---------------------------------------------------------------------------
  // Serialize — title heading + recursive bullet tree as body.
  // Body keys excluded from frontmatter; audit fields included automatically.
  // ---------------------------------------------------------------------------

  protected serialize(item: Mindmap): string {
    return this.serializeStandard(
      item,
      MINDMAP_BODY_KEYS,
      this.buildBody(item),
    );
  }

  private buildBody(item: Mindmap): string {
    return `# ${item.title}\n\n${serializeBulletTree(item.nodes)}`;
  }
}

// ---------------------------------------------------------------------------
// Bullet tree parser — strict 2-space indent, rejects tabs and odd counts
// ---------------------------------------------------------------------------

export function parseBulletTree(body: string): MindmapNode[] | null {
  const root: MindmapNode[] = [];
  const stack: { depth: number; nodes: MindmapNode[] }[] = [
    { depth: -1, nodes: root },
  ];

  for (const rawLine of body.split("\n")) {
    if (rawLine.trim() === "") continue;
    if (rawLine.includes("\t")) return null;

    const match = rawLine.match(/^( *)- (.+)$/);
    if (!match) return null;

    const indent = match[1].length;
    if (indent % 2 !== 0) return null;
    const depth = indent / 2;

    const node: MindmapNode = { text: match[2].trim(), children: [] };

    while (stack[stack.length - 1].depth >= depth) stack.pop();
    const parent = stack[stack.length - 1];
    if (depth > parent.depth + 1) return null;
    parent.nodes.push(node);
    stack.push({ depth, nodes: node.children });
  }

  return root;
}

function appendNodes(
  lines: string[],
  nodes: MindmapNode[],
  depth: number,
): void {
  for (const node of nodes) {
    lines.push(`${"  ".repeat(depth)}- ${node.text}`);
    appendNodes(lines, node.children, depth + 1);
  }
}

// ---------------------------------------------------------------------------
// Bullet tree serializer — inverse of parseBulletTree (no `# Title` heading)
// ---------------------------------------------------------------------------

export function serializeBulletTree(nodes: MindmapNode[]): string {
  const lines: string[] = [];
  appendNodes(lines, nodes, 0);
  return lines.join("\n");
}
