// Save / Discard form action button row.
import type { FC } from "hono/jsx";

/** Save / Discard button row for settings forms (Discard wired via data-discard). */
export const FormActions: FC = () => (
  <div class="settings-page__form-actions">
    <button type="submit" class="btn btn--primary">Save</button>
    <button type="button" class="btn btn--secondary btn--discard" data-discard>
      Discard
    </button>
  </div>
);
