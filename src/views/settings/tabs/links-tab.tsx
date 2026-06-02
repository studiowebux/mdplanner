import type { FC } from "hono/jsx";
import { FormActions } from "../../../components/ui/form-actions.tsx";
import type { ProjectLink } from "../../../types/project.types.ts";

type LinksTabProps = {
  links: ProjectLink[];
};

export const LinksTab: FC<LinksTabProps> = ({ links }) => (
  <div class="settings-tabs__panel settings-tabs__panel--links">
    <form
      id="links-form"
      hx-post="/settings/links"
      hx-trigger="submit"
      hx-swap="none"
    >
      <div id="links-list">
        {links.map((link, i) => (
          <div key={i} class="settings-link-row">
            <input
              type="text"
              name={`link_title_${i}`}
              value={link.title}
              placeholder="Title"
              class="settings-field__input"
            />
            <input
              type="url"
              name={`link_url_${i}`}
              value={link.url}
              placeholder="https://..."
              class="settings-field__input"
            />
            <button
              type="button"
              class="btn btn--danger btn--sm"
              data-remove-link
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div class="settings-page__bulk-actions">
        <button
          type="button"
          class="btn btn--secondary btn--sm"
          data-add-link
        >
          Add link
        </button>
      </div>

      <FormActions />
    </form>
  </div>
);
