// C4 Architecture repository — markdown file CRUD under c4/.
// Name stored as `# Heading` in body. Connections stored as array on source component.

import { serializeFrontmatter } from "../utils/frontmatter.ts";
import { generateId } from "../utils/id.ts";
import type {
  C4Component,
  C4Connection,
  CreateC4Component,
  UpdateC4Component,
} from "../types/c4.types.ts";
import { C4_TABLE, rowToC4 } from "../domains/c4/cache.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";

import {
  fmStr,
  fmStrArr,
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";

/** Extract the component name (first `# heading`) and trailing description body. */
function parseC4Body(body: string): { name: string; description?: string } {
  let name = "";
  const descLines: string[] = [];
  let pastHeading = false;
  for (const line of body.split("\n")) {
    if (!pastHeading && line.startsWith("# ")) {
      name = line.slice(2).trim();
      pastHeading = true;
      continue;
    }
    if (pastHeading) descLines.push(line);
  }
  return { name, description: descLines.join("\n").trim() || undefined };
}

/** Map the frontmatter connections array into typed C4Connection edges. */
function parseC4Connections(raw: unknown): C4Connection[] {
  const rawConns = (raw ?? []) as Array<Record<string, unknown>>;
  return rawConns.map((c) => ({
    id: c.id ? String(c.id) : generateId("c4conn"),
    target: String(c.target ?? ""),
    label: String(c.label ?? ""),
    technology: c.technology != null ? String(c.technology) : undefined,
  }));
}

/** Persists C4 components as markdown with a SQLite cache mirror; adds level queries (findByLevel), position patching, and connection edges (add/remove/getConnectionsFor). */
export class C4Repository extends CachedMarkdownRepository<
  C4Component,
  CreateC4Component,
  UpdateC4Component
> {
  protected readonly tableName = C4_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "c4",
      idPrefix: "c4",
      nameField: "name",
    });
  }

  protected rowToEntity(
    row: Record<string, string | number | null>,
  ): C4Component {
    return rowToC4(row);
  }

  protected fromCreateInput(
    data: CreateC4Component,
    id: string,
    now: string,
  ): C4Component {
    return {
      ...data,
      id,
      diagram: data.diagram ?? "default",
      position: data.position ?? { x: 0, y: 0 },
      connections: [],
      children: [],
      ...stampAuditFields(now),
    };
  }

  // ---------------------------------------------------------------------------
  // Parse — frontmatter + body heading
  // ---------------------------------------------------------------------------

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): C4Component | null {
    if (!fm.id && !filename) return null;
    const id = resolveEntityId(filename, fm);

    const { name, description } = parseC4Body(body);

    const rawPos = fm.position as { x?: number; y?: number } | undefined;
    const position = { x: rawPos?.x ?? 0, y: rawPos?.y ?? 0 };

    return {
      id,
      name: name || "Untitled Component",
      level: (fm.level as C4Component["level"]) ?? "context",
      type: fmStr(fm, "type") ?? "",
      description,
      technology: fmStr(fm, "technology"),
      position,
      diagram: fmStr(fm, "diagram") ?? "default",
      parent: fmStr(fm, "parent"),
      children: fmStrArr(fm, "children") ?? [],
      connections: parseC4Connections(fm.connections),
      createdAt: fmStr(fm, "createdAt") ?? new Date().toISOString(),
      updatedAt: fmStr(fm, "updatedAt") ?? new Date().toISOString(),
      createdBy: fmStr(fm, "createdBy"),
      updatedBy: fmStr(fm, "updatedBy"),
    };
  }

  // ---------------------------------------------------------------------------
  // Serialize — frontmatter + body heading
  // ---------------------------------------------------------------------------

  protected serialize(item: C4Component): string {
    const fm: Record<string, unknown> = {
      id: item.id,
      level: item.level,
      type: item.type,
      position: {
        x: Math.round(item.position.x),
        y: Math.round(item.position.y),
      },
    };
    if (item.technology) fm.technology = item.technology;
    fm.diagram = item.diagram ?? "default";
    if (item.parent) fm.parent = item.parent;
    if (item.children?.length) fm.children = item.children;
    if (item.connections?.length) {
      fm.connections = item.connections.map((c) => {
        const entry: Record<string, unknown> = {
          id: c.id,
          target: c.target,
          label: c.label,
        };
        if (c.technology) entry.technology = c.technology;
        return entry;
      });
    }
    fm.created_at = item.createdAt;
    fm.updated_at = item.updatedAt;
    if (item.createdBy) fm.created_by = item.createdBy;
    if (item.updatedBy) fm.updated_by = item.updatedBy;
    // Preserve archive fields — custom serializers must round-trip these.
    if (item.archived) fm.archived = item.archived;
    if (item.archivedAt) fm.archived_at = item.archivedAt;
    if (item.archivedBy) fm.archived_by = item.archivedBy;

    const body = `# ${item.name}${
      item.description ? `\n\n${item.description}` : ""
    }`;
    return serializeFrontmatter(fm, body);
  }

  // ---------------------------------------------------------------------------
  // C4-specific methods
  // ---------------------------------------------------------------------------

  async findByLevel(
    level: C4Component["level"],
    parentId?: string,
  ): Promise<C4Component[]> {
    const all = await this.findAll();
    return all.filter(
      (c) =>
        c.level === level &&
        (parentId === undefined || c.parent === parentId),
    );
  }

  async patchPosition(
    id: string,
    x: number,
    y: number,
  ): Promise<C4Component | null> {
    const item = await this.findById(id);
    if (!item) return null;
    return this.update(id, { position: { x, y } });
  }

  async addConnection(
    sourceId: string,
    targetId: string,
    label: string,
    technology?: string,
  ): Promise<{ component: C4Component; connectionId: string } | null> {
    const source = await this.findById(sourceId);
    if (!source) return null;
    const connectionId = generateId("c4conn");
    const conn: C4Connection = { id: connectionId, target: targetId, label };
    if (technology) conn.technology = technology;
    const connections = [...(source.connections ?? []), conn];
    const updated = await this.update(
      sourceId,
      { connections } as UpdateC4Component,
    );
    if (!updated) return null;
    return { component: updated, connectionId };
  }

  async removeConnection(connId: string): Promise<boolean> {
    const all = await this.findAll();
    const source = all.find((c) =>
      c.connections?.some((conn) => conn.id === connId)
    );
    if (!source) return false;
    const connections = (source.connections ?? []).filter((c) =>
      c.id !== connId
    );
    await this.update(source.id, { connections } as UpdateC4Component);
    return true;
  }

  async getConnectionsFor(componentId: string): Promise<C4Connection[]> {
    const item = await this.findById(componentId);
    return item?.connections ?? [];
  }
}
