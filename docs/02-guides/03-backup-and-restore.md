---
title: Backup and Restore
---

# Backup and Restore

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
