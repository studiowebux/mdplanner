import type { ViewMode } from "../types/app.ts";

// Parse a raw query param into a validated ViewMode. Defaults to "grid".
export function parseViewMode(raw: string | undefined): ViewMode {
  return raw === "table" ? "table" : "grid";
}
