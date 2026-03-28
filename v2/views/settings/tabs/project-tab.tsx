import type { FC } from "hono/jsx";
import { FormActions } from "../../../components/ui/form-actions.tsx";
import type { ProjectConfig } from "../../../types/project.types.ts";

type ProjectTabProps = {
  config: ProjectConfig;
};

export const ProjectTab: FC<ProjectTabProps> = ({ config }) => (
  <div class="settings-tabs__panel settings-tabs__panel--project">
    <form
      id="project-form"
      hx-post="/settings/project"
      hx-trigger="submit"
      hx-swap="none"
    >
      <div class="settings-field">
        <label class="settings-field__label" for="cfg-name">
          Project name
        </label>
        <input
          type="text"
          id="cfg-name"
          name="name"
          value={config.name}
          class="settings-field__input"
        />
      </div>

      <div class="settings-field">
        <label class="settings-field__label" for="cfg-description">
          Description (markdown)
        </label>
        <textarea
          id="cfg-description"
          name="description"
          class="settings-field__textarea"
          rows={4}
        >
          {config.description ?? ""}
        </textarea>
      </div>

      <div class="settings-field settings-field--row">
        <div class="settings-field">
          <label class="settings-field__label" for="cfg-locale">
            Locale (BCP 47)
          </label>
          <input
            type="text"
            id="cfg-locale"
            name="locale"
            value={config.locale ?? "en-US"}
            placeholder="en-US"
            class="settings-field__input"
          />
        </div>
        <div class="settings-field">
          <label class="settings-field__label" for="cfg-currency">
            Currency (ISO 4217)
          </label>
          <input
            type="text"
            id="cfg-currency"
            name="currency"
            value={config.currency ?? "USD"}
            placeholder="USD"
            class="settings-field__input"
          />
        </div>
      </div>

      <div class="settings-field">
        <label class="settings-field__label" for="cfg-port">
          Server port
        </label>
        <input
          type="number"
          id="cfg-port"
          name="port"
          value={config.port ?? 8003}
          min={1}
          max={65535}
          class="settings-field__input settings-field__input--narrow"
        />
        <span class="settings-field__hint">
          PORT env var takes precedence. Restart required after change.
        </span>
      </div>

      <div class="settings-field">
        <label class="settings-field__label" for="cfg-github-token">
          GitHub token (PAT)
        </label>
        <div class="settings-field__input-row">
          <input
            type="password"
            id="cfg-github-token"
            name="githubToken"
            value={config.githubToken ?? ""}
            placeholder="ghp_..."
            class="settings-field__input"
            autocomplete="off"
          />
          <button
            type="button"
            class="btn btn--secondary btn--sm"
            data-clear-input="cfg-github-token"
          >
            Clear
          </button>
        </div>
        <span class="settings-field__hint">
          Shared across all portfolio items. Set MDPLANNER_SECRET_KEY to encrypt
          at rest.
        </span>
      </div>

      <div class="settings-field">
        <label class="settings-field__label" for="cfg-cloudflare-token">
          Cloudflare token (API Token)
        </label>
        <div class="settings-field__input-row">
          <input
            type="password"
            id="cfg-cloudflare-token"
            name="cloudflareToken"
            value={config.cloudflareToken ?? ""}
            placeholder="Bearer token..."
            class="settings-field__input"
            autocomplete="off"
          />
          <button
            type="button"
            class="btn btn--secondary btn--sm"
            data-clear-input="cfg-cloudflare-token"
          >
            Clear
          </button>
        </div>
        <span class="settings-field__hint">
          Used for DNS sync. Requires Zone:Read, DNS:Read permissions.
          Registrar:Read is optional for expiry data.
        </span>
      </div>

      <FormActions />
    </form>
  </div>
);
