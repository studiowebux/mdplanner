---
title: Backup and Restore
---

# Backup and Restore

## JSON Backup (v2 UI)

MD Planner v2 includes a built-in JSON backup and restore feature available
from **Settings → Data**. It exports all 39 domains (tasks, goals, notes,
contacts, habits, and more) into a single JSON file and can restore from it.

### Export

Navigate to **Settings → Data** and click **Download Backup**. The browser
downloads a file named `mdplanner-backup-YYYY-MM-DD.json`.

You can also export via the API:

```bash
curl -o backup.json http://localhost:8003/api/v1/backup/export
```

The file structure:

```json
{
  "version": "2.0.0-alpha",
  "exportedAt": "2026-05-15T12:00:00.000Z",
  "domains": {
    "tasks": [...],
    "goals": [...],
    "notes": [...]
  }
}
```

### Import

Navigate to **Settings → Data**, choose a backup `.json` file, and click
**Restore Backup**. A summary table shows how many records were restored per
domain and any errors encountered.

You can also import via the API:

```bash
curl -X POST http://localhost:8003/api/v1/backup/import \
  -F "file=@backup.json"
```

Or with a raw JSON body:

```bash
curl -X POST http://localhost:8003/api/v1/backup/import \
  -H "Content-Type: application/json" \
  --data-binary @backup.json
```

**Import behaviour:**

- Records with the same ID are **upserted** (overwritten).
- Records not present in the backup are **left untouched**.
- Import is **not destructive** — it never deletes existing data.
- If the backup `version` differs from the running server version, a warning
  is shown in the result but the import still proceeds.
- Import is **non-transactional** — each record is written individually. If
  a domain fails mid-restore, already-imported domains are not rolled back.
  Check the per-domain error counts in the result table after importing.

### What is not backed up

The following are intentionally excluded:

| Domain | Reason |
|--------|--------|
| Project config (`project.md`) | Infrastructure — contains server settings, API keys, and feature flags. Restoring it from a backup could break the running server configuration. |
| Cloudflare DNS | External sync side-effect — DNS records live in Cloudflare, not in the local data directory. |
| GitHub integration config | Per-portfolio token and repo settings are stored in `project.md` frontmatter (see above). |
| Search / FTS cache | Derived data — rebuilt automatically from source records on every full sync. Backing it up would be redundant. |
| Sticky notes (board-scoped) | Sticky boards **are** included. Individual sticky notes are board-scoped and restored as part of their board. |

---

## TAR Backup (v1 — encrypted archives)

MD Planner supports TAR archive export/import with optional AES-256-GCM
encryption using RSA-OAEP-4096 key pairs.

## Key generation

Generate an RSA key pair for encrypted backups:

```bash
mdplanner keygen
```

Output:

```text
PUBLIC KEY (hex)  -- store in --backup-public-key or MDPLANNER_BACKUP_PUBLIC_KEY:
<long hex string>

PRIVATE KEY (hex) -- keep secret, used to decrypt backups (X-Backup-Private-Key header):
<long hex string>
```

Store the private key in a password manager. It cannot be recovered if lost. The
public key is safe to include in server configuration.

## Integration secret encryption

Separately from backup encryption, integration tokens (Cloudflare API token,
GitHub PAT) stored in `project.md` can be encrypted at rest:

```bash
mdplanner keygen-secret
# Outputs a 64-character hex string
```

Set as `MDPLANNER_SECRET_KEY` environment variable. Without this key, tokens are
stored in plaintext.

## Plain export

```bash
curl -o backup.tar http://localhost:8003/api/backup/export
```

## Encrypted export

```bash
# Start server with encryption enabled
mdplanner --backup-public-key <public-key-hex> ./my-project

# Download encrypted archive
curl -o backup.tar.enc http://localhost:8003/api/backup/export
```

## Import (plain)

```bash
curl -X POST http://localhost:8003/api/backup/import \
  --data-binary @backup.tar
```

## Import (encrypted)

```bash
curl -X POST http://localhost:8003/api/backup/import \
  -H "X-Backup-Private-Key: <private-key-hex>" \
  --data-binary @backup.tar.enc
```

Add `?overwrite=true` to overwrite existing files on import.

## Scheduled backups

```bash
mdplanner \
  --backup-dir /var/backups/myproject \
  --backup-interval 24 \
  --backup-public-key <public-key-hex> \
  ./my-project
```

Backups are written as `backup-YYYY-MM-DD-HH-MM-SS.tar` (plain) or `.tar.enc`
(encrypted). A manual backup can be triggered at any time via
`POST /api/backup/trigger`. Status is available at `GET /api/backup/status`.

## Docker

Mount a volume for the backup directory:

```yaml
services:
  mdplanner:
    image: ghcr.io/studiowebux/mdplanner:latest
    volumes:
      - ./data:/data
      - ./backups:/backups
    environment:
      - MDPLANNER_BACKUP_DIR=/backups
      - MDPLANNER_BACKUP_INTERVAL=24
      - MDPLANNER_BACKUP_PUBLIC_KEY=<public-key-hex>
```
