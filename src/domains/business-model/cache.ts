// Business Model Canvas entity registration for SQLite cache.

import {
  ARCHIVE_COLS_DDL,
  archiveCols,
  archiveFieldsFromRow,
  archiveMigrations,
  archiveVals,
  AUDIT_COLS_DDL,
  auditCols,
  auditFieldsFromRow,
  auditVals,
  json,
  parseJson,
  registerEntityCache,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase } from "../../database/sqlite/mod.ts";
import type { BusinessModelRepository } from "../../repositories/business-model.repository.ts";
import type { BusinessModel } from "../../types/business-model.types.ts";

export const BUSINESS_MODEL_TABLE = "business_model";

export function rowToBusinessModel(
  row: Record<string, string | number | null>,
): BusinessModel {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    date: (row.date as string) ?? "",
    keyPartners: parseJson<string[]>(row.key_partners) ?? [],
    keyActivities: parseJson<string[]>(row.key_activities) ?? [],
    keyResources: parseJson<string[]>(row.key_resources) ?? [],
    valueProposition: parseJson<string[]>(row.value_proposition) ?? [],
    customerRelationships: parseJson<string[]>(row.customer_relationships) ??
      [],
    channels: parseJson<string[]>(row.channels) ?? [],
    customerSegments: parseJson<string[]>(row.customer_segments) ?? [],
    costStructure: parseJson<string[]>(row.cost_structure) ?? [],
    revenueStreams: parseJson<string[]>(row.revenue_streams) ?? [],
    project: row.project as string | undefined,
    notes: row.notes as string | undefined,
    ...archiveFieldsFromRow(row),
    ...auditFieldsFromRow(row),
  };
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS ${BUSINESS_MODEL_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  key_partners TEXT,
  key_activities TEXT,
  key_resources TEXT,
  value_proposition TEXT,
  customer_relationships TEXT,
  channels TEXT,
  customer_segments TEXT,
  cost_structure TEXT,
  revenue_streams TEXT,
  project TEXT,
  notes TEXT,
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

function insertRow(
  db: CacheDatabase,
  b: BusinessModel,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${BUSINESS_MODEL_TABLE} (id, title, date,
       key_partners, key_activities, key_resources, value_proposition,
       customer_relationships, channels, customer_segments,
       cost_structure, revenue_streams, project, notes,
       ${archiveCols()},
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(b.id),
      val(b.title),
      val(b.date),
      json(b.keyPartners),
      json(b.keyActivities),
      json(b.keyResources),
      json(b.valueProposition),
      json(b.customerRelationships),
      json(b.channels),
      json(b.customerSegments),
      json(b.costStructure),
      json(b.revenueStreams),
      val(b.project),
      val(b.notes),
      ...archiveVals(b),
      ...auditVals(b),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

export function registerBusinessModelEntity(
  repo: BusinessModelRepository,
): void {
  registerEntityCache({
    table: BUSINESS_MODEL_TABLE,
    schema: SCHEMA,
    fts: {
      type: "business_model",
      columns: [
        "id",
        "title",
        "key_partners",
        "key_activities",
        "key_resources",
        "value_proposition",
        "customer_relationships",
        "channels",
        "customer_segments",
        "cost_structure",
        "revenue_streams",
        "notes",
      ],
      titleCol: "title",
      contentCol: "notes",
    },
    migrations: [
      ...archiveMigrations(BUSINESS_MODEL_TABLE),
    ],
    source: () => repo.findAllFromDisk(),
    insert: insertRow,
  });
}
