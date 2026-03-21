// Generic form body parser — uses FieldDef[] to parse form data by field type.
// Eliminates per-domain parseCreate/parseUpdate field-by-field mapping.

import type { FieldDef } from "../components/ui/form-builder.tsx";

/**
 * Parse a form body into a typed object using field definitions.
 * - text, date, select, autocomplete → string or undefined
 * - number → number or undefined
 * - tags → string[] or undefined
 * - textarea → string or undefined (split into string[] if `splitLines` is set)
 * - hidden → string or undefined
 *
 * Empty strings become undefined (field not set).
 * When `clearEmpty` is true, empty strings become null (field cleared) — use for updates.
 */
export function parseFormBody(
  fields: FieldDef[],
  body: Record<string, string | File>,
  options?: { clearEmpty?: boolean; splitTextarea?: boolean },
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const clearEmpty = options?.clearEmpty ?? false;
  const splitTextarea = options?.splitTextarea ?? false;

  for (const field of fields) {
    const raw = body[field.name];
    if (raw === undefined || raw instanceof File) continue;
    const val = String(raw).trim();

    if (!val) {
      if (clearEmpty) result[field.name] = undefined;
      continue;
    }

    switch (field.type) {
      case "number":
        result[field.name] = Number(val);
        break;
      case "tags":
        result[field.name] = val.split(",").map((s) => s.trim()).filter(
          Boolean,
        );
        break;
      case "textarea":
        result[field.name] = splitTextarea ? val.split("\n") : val;
        break;
      default:
        result[field.name] = val;
        break;
    }
  }

  return result;
}
