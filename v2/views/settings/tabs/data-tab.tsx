import type { FC } from "hono/jsx";

export const DataTab: FC = () => (
  <div class="settings-tabs__panel settings-tabs__panel--data">
    <h2 class="settings-page__heading">Data</h2>

    <section class="settings-data__section">
      <h3 class="settings-data__section-title">Export</h3>
      <p class="settings-data__description">
        Download a full JSON backup of all your data — tasks, goals, notes, and
        every other domain. Keep it somewhere safe.
      </p>
      <a
        href="/api/v1/backup/export"
        download
        class="btn btn--primary"
      >
        Download Backup
      </a>
    </section>

    <section class="settings-data__section">
      <h3 class="settings-data__section-title">Import</h3>
      <p class="settings-data__description">
        Restore from a backup file. Existing records with the same ID are
        overwritten. Records not in the backup are left untouched.
      </p>
      <form
        class="settings-data__import-form"
        hx-post="/api/v1/backup/import"
        hx-encoding="multipart/form-data"
        hx-swap="innerHTML"
        hx-target="#backup-import-result"
      >
        <label class="settings-data__file-label">
          <input
            type="file"
            name="file"
            accept=".json,application/json"
            class="settings-data__file-input"
            required
          />
        </label>
        <button type="submit" class="btn btn--secondary">
          Restore Backup
        </button>
      </form>
      <div id="backup-import-result" class="settings-data__result" />
    </section>
  </div>
);
