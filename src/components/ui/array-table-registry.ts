// Array-table section registry — maps section keys to their item field definitions.
// Domains register sections at module load time. The /forms/array-row/:section
// endpoint uses this to render new empty row fragments.

import type { ArrayTableItemField } from "./form-builder.tsx";

const registry = new Map<string, ArrayTableItemField[]>();

/** Register an array-table section so the server can render new row fragments. */
export function registerArrayTableSection(
  section: string,
  itemFields: ArrayTableItemField[],
): void {
  registry.set(section, itemFields);
}

/** Look up item fields for a section. Returns undefined if not registered. */
export function getArrayTableSection(
  section: string,
): ArrayTableItemField[] | undefined {
  return registry.get(section);
}
