// Edit-mode toggle — switches a detail page between read and in-place edit.
// Pairs with DetailActions' "Edit" (sidenav, structured fields). "Edit Mode"
// turns long-form content / array sections into editable surfaces that htmx
// persists only on an explicit Save (no save-on-blur): long text via
// inline-edit.js Save buttons, array items via quadrant-edit.js per-item ✓
// Save. The global dirty-guard.js warns on leave with unsaved changes.
// Mirrors the SWOT "Edit Items" toggle.

import type { FC } from "hono/jsx";

type EditModeToggleProps = {
  /** Detail page path without query, e.g. "/journal/abc123" */
  href: string;
  /** Whether the page is currently in edit mode */
  editing: boolean;
};

export const EditModeToggle: FC<EditModeToggleProps> = ({ href, editing }) => (
  <a
    class="btn btn--secondary btn--sm"
    href={editing ? href : `${href}?editing=true`}
  >
    {editing ? "Done Editing" : "Edit Mode"}
  </a>
);
