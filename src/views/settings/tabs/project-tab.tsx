import type { FC } from "hono/jsx";
import { FormActions } from "../../../components/ui/form-actions.tsx";
import type { PublicProjectConfig } from "../../../types/project.types.ts";

type ProjectTabProps = {
  config: PublicProjectConfig;
};

/**
 * A password field for a stored secret (GitHub/Gitea/CI/Cloudflare token).
 * Blank = keep existing; the Clear button flags the hidden `<name>Clear` input
 * so the server wipes it. Placeholder + hint prefix reflect whether a token is
 * already set. Extracted from ProjectTab — the four token fields were identical.
 */
const SecretTokenField: FC<{
  id: string;
  name: string;
  label: string;
  hasToken?: boolean;
  unsetPlaceholder: string;
  hint: string;
}> = ({ id, name, label, hasToken, unsetPlaceholder, hint }) => (
  <div class="settings-field">
    <label class="settings-field__label" for={id}>{label}</label>
    <div class="settings-field__input-row">
      <input
        type="password"
        id={id}
        name={name}
        placeholder={hasToken
          ? "•••••••• (set — leave blank to keep)"
          : unsetPlaceholder}
        class="settings-field__input"
        autocomplete="off"
      />
      <input type="hidden" id={`${id}-clear`} name={`${name}Clear`} value="" />
      <button
        type="button"
        class="btn btn--secondary btn--sm"
        data-clear-input={id}
      >
        Clear
      </button>
    </div>
    <span class="settings-field__hint">
      {hasToken ? "A token is set. " : "No token set. "}
      {hint}
    </span>
  </div>
);

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
        <label class="settings-field__label" for="cfg-stale-days">
          Stale days (dashboard)
        </label>
        <input
          type="number"
          id="cfg-stale-days"
          name="staleDays"
          value={config.staleDays ?? 14}
          min={1}
          class="settings-field__input settings-field__input--narrow"
        />
        <span class="settings-field__hint">
          Days without activity before a portfolio project is highlighted as
          stale.
        </span>
      </div>

      <div class="settings-field">
        <label class="settings-field__label" for="cfg-cerveau-dir">
          Cerveau directory
        </label>
        <input
          type="text"
          id="cfg-cerveau-dir"
          name="cerveauDir"
          value={config.cerveauDir ?? ""}
          placeholder="/path/to/cerveau"
          class="settings-field__input"
        />
        <span class="settings-field__hint">
          Absolute path to a Cerveau root (contains _configs_/, _packages_,
          version.txt). When set, enable the “Cerveau” feature to show the
          read-only viewer in the sidebar.
        </span>
      </div>

      <div class="settings-field">
        <label class="settings-field__label" for="cfg-tasks-per-section">
          Tasks per section (list / board)
        </label>
        <input
          type="number"
          id="cfg-tasks-per-section"
          name="tasksPerSection"
          value={config.tasksPerSection ?? 25}
          min={1}
          class="settings-field__input settings-field__input--narrow"
        />
        <span class="settings-field__hint">
          How many tasks each section renders before a "Load more" control
          appears in the task list and board.
        </span>
      </div>

      <div class="settings-field">
        <label
          class="settings-field__label"
          for="cfg-hide-completed-after-days"
        >
          Hide completed tasks after (days)
        </label>
        <input
          type="number"
          id="cfg-hide-completed-after-days"
          name="hideCompletedAfterDays"
          value={config.hideCompletedAfterDays ?? ""}
          min={0}
          placeholder="Never"
          class="settings-field__input settings-field__input--narrow"
        />
        <span class="settings-field__hint">
          Automatically hide Done tasks older than this many days. Leave blank
          to always show. Use the "Show hidden" toggle in the task list to
          reveal them.
        </span>
      </div>

      <SecretTokenField
        id="cfg-github-token"
        name="githubToken"
        label="GitHub token (PAT)"
        hasToken={config.hasGithubToken}
        unsetPlaceholder="ghp_..."
        hint="Shared across all portfolio items. Set MDPLANNER_SECRET_KEY to encrypt at rest."
      />

      <div class="settings-field">
        <label class="settings-field__label" for="cfg-gitea-base-url">
          Gitea base URL
        </label>
        <input
          type="url"
          id="cfg-gitea-base-url"
          name="giteaBaseUrl"
          value={config.giteaBaseUrl ?? ""}
          placeholder="https://gitea.example.com"
          class="settings-field__input"
          autocomplete="off"
        />
        <span class="settings-field__hint">
          Self-hosted Gitea instance URL. When set together with a Gitea token,
          Gitea becomes the active VCS provider (repos, issues, PRs) in place of
          GitHub.
        </span>
      </div>

      <SecretTokenField
        id="cfg-gitea-token"
        name="giteaToken"
        label="Gitea token (PAT)"
        hasToken={config.hasGiteaToken}
        unsetPlaceholder="Personal access token..."
        hint="Generated in Gitea under Settings → Applications. Set MDPLANNER_SECRET_KEY to encrypt at rest."
      />

      <div class="settings-field">
        <label class="settings-field__label" for="cfg-woodpecker-base-url">
          CI server URL
        </label>
        <input
          type="url"
          id="cfg-woodpecker-base-url"
          name="woodpeckerBaseUrl"
          value={config.woodpeckerBaseUrl ?? ""}
          placeholder="https://ci.example.com"
          class="settings-field__input"
          autocomplete="off"
        />
        <span class="settings-field__hint">
          CI server URL (currently Woodpecker). When set together with a CI
          token, pipeline status is read from the CI server.
        </span>
      </div>

      <SecretTokenField
        id="cfg-woodpecker-token"
        name="woodpeckerToken"
        label="CI token (PAT)"
        hasToken={config.hasWoodpeckerToken}
        unsetPlaceholder="Personal access token..."
        hint="Personal access token for the CI server (Woodpecker: profile → settings). Set MDPLANNER_SECRET_KEY to encrypt at rest."
      />

      <SecretTokenField
        id="cfg-cloudflare-token"
        name="cloudflareToken"
        label="Cloudflare token (API Token)"
        hasToken={config.hasCloudflareToken}
        unsetPlaceholder="Bearer token..."
        hint="Used for DNS sync. Requires Zone:Read, DNS:Read permissions. Registrar:Read is optional for expiry data."
      />

      <FormActions />
    </form>
  </div>
);
