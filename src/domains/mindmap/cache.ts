// Mindmap entity registration for SQLite cache.
// Called by initServices() after repos are created.

import {
  ARCHIVE_COLS_DDL,
  archiveCols,
  archiveFieldsFromRow,
  archiveMigrations,
  archiveVals,
  auditCols,
  auditVals,
  ENTITIES,
  json,
  parseJson,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { MindmapRepository } from "../../repositories/mindmap.repository.ts";
import type { Mindmap, MindmapNode } from "../../types/mindmap.types.ts";

export const MINDMAP_TABLE = "mindmaps";

/** Deserialize a SQLite row to a Mindmap. */
export function rowToMindmap(
  row: Record<string, string | number | null>,
): Mindmap {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    nodes: parseJson<MindmapNode[]>(row.nodes) ?? [],
    project: (row.project as string) ?? "",
    notes: row.notes as string | undefined,
    ...archiveFieldsFromRow(row),
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

/** Flatten the node tree to searchable text for FTS. */
export function flattenNodes(nodes: MindmapNode[]): string {
  const parts: string[] = [];
  const walk = (list: MindmapNode[]): void => {
    for (const node of list) {
      parts.push(node.text);
      if (node.children.length > 0) walk(node.children);
    }
  };
  walk(nodes);
  return parts.join(" ");
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS ${MINDMAP_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  nodes TEXT,
  flat_nodes TEXT,
  project TEXT,
  notes TEXT,
  ${ARCHIVE_COLS_DDL},
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertRow(
  db: CacheDatabase,
  m: Mindmap,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${MINDMAP_TABLE} (id, title, nodes, flat_nodes,
       project, notes, ${archiveCols()}, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(m.id),
      val(m.title),
      json(m.nodes),
      flattenNodes(m.nodes),
      val(m.project),
      val(m.notes),
      ...archiveVals(m),
      ...auditVals(m),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the Mindmap cache entity. Call from initServices(). */
export function registerMindmapEntity(repo: MindmapRepository): void {
  const entity: EntityDef = {
    table: MINDMAP_TABLE,
    schema: SCHEMA,
    migrations: [
      ...archiveMigrations(MINDMAP_TABLE),
    ],
    fts: {
      type: "mindmap",
      columns: ["id", "title", "flat_nodes", "notes"],
      titleCol: "title",
      contentCol: "flat_nodes",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAllFromDisk();
      for (const m of items) insertRow(db, m, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
