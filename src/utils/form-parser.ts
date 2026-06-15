// Generic form body parser — uses FieldDef[] to parse form data by field type.
// Eliminates per-domain parseCreate/parseUpdate field-by-field mapping.

import type {
  ArrayTableItemField,
  FieldDef,
} from "../components/ui/form-builder.tsx";
import { parseMoney } from "./money.ts";

/**
 * Parse a form body into a typed object using field definitions.
 * - text, date, select, autocomplete → string or undefined
 * - number → number or undefined
 * - tags → string[] or undefined
 * - textarea → string or undefined (split into string[] if `splitLines` is set)
 * - hidden → string or undefined
 * - array-table → Record<string, unknown>[] (structured object arrays)
 *
 * Empty strings become undefined (field not set).
 * When `clearEmpty` is true, empty strings become null (field cleared) — use for updates.
 */
type ArrayTableConfig = { name: string; itemFields: ArrayTableItemField[] };

/** Coerce a trimmed scalar form value according to its field type. */
function coerceScalarField(
  type: string,
  val: string,
  splitTextarea: boolean,
): unknown {
  switch (type) {
    case "number":
      return Number(val);
    case "money":
      return parseMoney(val) ?? 0;
    case "boolean":
      return val === "true";
    case "tags":
      return val.split(",").map((s) => s.trim()).filter(Boolean);
    case "textarea":
      return splitTextarea ? val.split("\n") : val;
    default:
      return val;
  }
}

/** Build one array-table section's items from its grouped indexed rows. */
function buildArrayTableItems(
  itemFields: ArrayTableItemField[],
  sectionMap: Map<number, Record<string, string>> | undefined,
): Record<string, unknown>[] {
  if (!sectionMap) return [];

  // Build a lookup for item field types to apply coercion.
  const fieldTypes = new Map<string, string>();
  for (const f of itemFields) fieldTypes.set(f.name, f.type);

  const items: Record<string, unknown>[] = [];
  // Sort by index to preserve insertion order.
  const sortedIndices = [...sectionMap.keys()].sort((a, b) => a - b);

  for (const idx of sortedIndices) {
    const raw = sectionMap.get(idx)!;
    const obj: Record<string, unknown> = {};
    let hasValue = false;

    for (const [field, val] of Object.entries(raw)) {
      const trimmed = val.trim();
      if (!trimmed) continue;
      hasValue = true;
      const type = fieldTypes.get(field);
      obj[field] = type === "number"
        ? Number(trimmed)
        : type === "money"
        ? (parseMoney(trimmed) ?? 0)
        : trimmed;
    }

    // Skip completely empty rows.
    if (hasValue) items.push(obj);
  }

  return items;
}

/**
 * Parse array-table indexed keys into structured object arrays, keyed by the
 * destination field name. Pattern: "channels[0].name", "channels[1732].budget".
 */
function parseArrayTableSections(
  arrayTableFields: Map<string, ArrayTableConfig>,
  body: Record<string, string | File>,
): Record<string, unknown[]> {
  const indexedPattern = /^([^[]+)\[(\d+)]\.(.+)$/;
  const grouped = new Map<string, Map<number, Record<string, string>>>();

  for (const [key, rawVal] of Object.entries(body)) {
    if (rawVal instanceof File) continue;
    const match = key.match(indexedPattern);
    if (!match) continue;
    const [, section, idxStr, field] = match;
    if (!arrayTableFields.has(section)) continue;

    const idx = Number(idxStr);
    if (!grouped.has(section)) grouped.set(section, new Map());
    const sectionMap = grouped.get(section)!;
    if (!sectionMap.has(idx)) sectionMap.set(idx, {});
    sectionMap.get(idx)![field] = String(rawVal);
  }

  const out: Record<string, unknown[]> = {};
  for (const [section, config] of arrayTableFields) {
    out[config.name] = buildArrayTableItems(
      config.itemFields,
      grouped.get(section),
    );
  }
  return out;
}

export function parseFormBody(
  fields: FieldDef[],
  body: Record<string, string | File>,
  options?: { clearEmpty?: boolean; splitTextarea?: boolean },
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const clearEmpty = options?.clearEmpty ?? false;
  const splitTextarea = options?.splitTextarea ?? false;

  // Collect array-table sections so we can parse indexed keys from the body.
  const arrayTableFields = new Map<string, ArrayTableConfig>();

  for (const field of fields) {
    if (field.type === "array-table") {
      arrayTableFields.set(field.section, {
        name: field.name,
        itemFields: field.itemFields,
      });
      continue;
    }

    const raw = body[field.name];
    if (raw === undefined || raw instanceof File) continue;
    const val = String(raw).trim();

    if (!val) {
      if (clearEmpty) result[field.name] = null;
      continue;
    }

    result[field.name] = coerceScalarField(field.type, val, splitTextarea);
  }

  if (arrayTableFields.size > 0) {
    Object.assign(result, parseArrayTableSections(arrayTableFields, body));
  }

  return result;
}
