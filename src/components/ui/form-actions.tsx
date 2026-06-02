import type { FC } from "hono/jsx";

export const FormActions: FC = () => (
  <div class="settings-page__form-actions">
    <button type="submit" class="btn btn--primary">Save</button>
    <button type="button" class="btn btn--secondary btn--discard" data-discard>
      Discard
    </button>
  </div>
);
