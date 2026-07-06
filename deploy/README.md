# Deployment

## Docker

Requires [Docker](https://docs.docker.com/get-docker/) and Docker Compose.

### Quickstart (v2)

```bash
# 1. Clone the repository
git clone https://github.com/studiowebux/mdplanner
cd mdplanner

# 2. Create your .env file
cp deploy/.env.example deploy/.env
# Edit deploy/.env — set MDPLANNER_SECRET_KEY for any networked instance

# 3. Start
docker compose -f deploy/docker-compose.yml up -d
```

Open `http://localhost:8080` (through Caddy) or `http://localhost:8003`
(mdplanner direct). Project files persist in the `mdplanner-data` Docker volume.

### Environment variables (v2)

Copy `deploy/.env.example` to `deploy/.env` and set values before starting.

| Variable               | Default | Required  | Description                                                                                                      |
| ---------------------- | ------- | --------- | ---------------------------------------------------------------------------------------------------------------- |
| `PROJECT_DIR`          | —       | Yes       | Absolute path to the data directory inside the container. Use `/data` with the default volume mount.             |
| `PORT`                 | `8003`  | No        | HTTP port the server listens on inside the container.                                                            |
| `CACHE`                | `true`  | No        | Set to `false` to disable the SQLite FTS cache. Full-text search requires `true`.                                |
| `MCP_TOKEN`            | —       | No        | Bearer token for MCP API requests (`Authorization: Bearer <token>`). Leave empty to disable auth.                |
| `MDPLANNER_SECRET_KEY` | —       | No        | AES-256-GCM key for encrypting integration secrets stored in `project.md`.                                       |
| `WEBDAV`               | —       | No        | Set to `true` to mount `PROJECT_DIR` as a WebDAV volume at `/webdav/`. Requires `WEBDAV_USER` and `WEBDAV_PASS`. |
| `WEBDAV_USER`          | —       | If WEBDAV | Basic-Auth username for the WebDAV endpoint.                                                                     |
| `WEBDAV_PASS`          | —       | If WEBDAV | Basic-Auth password for the WebDAV endpoint.                                                                     |

Generate a secret key:

```bash
openssl rand -hex 32
# Paste the output into deploy/.env as: MDPLANNER_SECRET_KEY=<output>
```

> **Note:** Without `MDPLANNER_SECRET_KEY`, integration tokens (e.g. Cloudflare
> API key) are stored in plaintext in `project.md`. Acceptable for local
> single-user installs; always set the key for shared or networked deployments.

### Management

```bash
docker compose up -d      # Start in background
docker compose down       # Stop
docker compose logs -f    # Follow logs
docker compose pull       # Update image
```

---

## Full AI Stack (Docker Compose)

Runs mdplanner alongside Ollama (LLM), Chatterbox (TTS), SearXNG (search), and
Caddy (reverse proxy) as a single composed stack. Caddy is the only publicly
exposed service.

**Prerequisites:** Docker, Docker Compose v2. Optional: NVIDIA GPU + Container
Toolkit for hardware-accelerated Ollama and Chatterbox.

```bash
docker compose -f deploy/docker-compose.yml up -d
```

Open `http://localhost:8080`. All services are accessible through Caddy:

| Service    | External URL                   | Notes                         |
| ---------- | ------------------------------ | ----------------------------- |
| mdplanner  | `http://localhost:8080`        | Main application              |
| Ollama API | internal only (`ollama:11434`) | Configure in AI Chat → Config |
| Chatterbox | `http://localhost:8080/tts`    | Routed via Caddy              |
| SearXNG    | `http://localhost:8080/search` | Routed via Caddy              |

### AI Chat configuration

In mdplanner, navigate to AI Chat and open the Config panel:

- **Ollama URL:** `http://ollama:11434` (Docker internal hostname, no port
  exposure needed)
- **Chatterbox URL:** `http://localhost:8080` (through Caddy at `/tts`)
- **SearXNG URL:** `http://localhost:8080` (through Caddy at `/search`)

### GPU support

GPU is disabled by default. To enable NVIDIA GPU for Ollama and/or Chatterbox,
uncomment the `deploy` block in `deploy/docker-compose.yml` for the relevant
service. Requires
[NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html).

### Volumes

| Volume              | Contents                             |
| ------------------- | ------------------------------------ |
| `mdplanner-data`    | Project files (`/data` in container) |
| `ollama-data`       | Downloaded LLM models                |
| `huggingface-cache` | Chatterbox model weights             |
| `searxng-data`      | SearXNG cache                        |

Voice reference WAV files for Chatterbox are bind-mounted from
`deploy/chatterbox/references/`. Add `.wav` files there before starting the
stack.

### Cloudflare integration

The DNS tracker can sync domain expiry and auto-renew data from Cloudflare
Registrar. The Cloudflare API token is saved through the Settings UI and stored
in `project.md`. To encrypt it at rest, set `MDPLANNER_SECRET_KEY` before
starting the server:

```yaml
environment:
  - MDPLANNER_SECRET_KEY=${MDPLANNER_SECRET_KEY}
```

```bash
# Generate a key and add to .env
echo "MDPLANNER_SECRET_KEY=$(mdplanner keygen-secret)" >> .env
```

Once the server is running, navigate to Settings → Cloudflare and paste your API
token. The server encrypts it with AES-256-GCM and stores the ciphertext in
`project.md`. Without `MDPLANNER_SECRET_KEY`, the token is stored in plaintext —
suitable for single-user local deployments, not for shared or public instances.

### Security note

Change the `secret_key` in `deploy/searxng/settings.yml` before any
public-facing deployment. The default value is a placeholder.

### Management

```bash
make -f deploy/Makefile stack-up
make -f deploy/Makefile stack-down
make -f deploy/Makefile stack-logs
```

---

## Linux (systemd)

Systemd service file for running MD Planner as a background service on Linux.

## Installation

Using the Makefile (recommended):

```bash
make -f deploy/Makefile install
```

Or manually:

```bash
sudo cp dist/mdplanner-linux /usr/local/bin/mdplanner
sudo chmod +x /usr/local/bin/mdplanner
sudo useradd --system --create-home --home-dir /var/lib/mdplanner mdplanner
sudo mkdir -p /var/lib/mdplanner/project
sudo chown -R mdplanner:mdplanner /var/lib/mdplanner
sudo cp deploy/mdplanner.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable mdplanner
sudo systemctl start mdplanner
```

## Configuration

Edit the service file to change runtime options:

| Option       | Default                      | Description                     |
| ------------ | ---------------------------- | ------------------------------- |
| `--port`     | 8003                         | HTTP server port                |
| `--cache`    | disabled                     | Add flag to enable SQLite cache |
| Project path | `/var/lib/mdplanner/project` | Last argument to ExecStart      |

To enable the SQLite cache, modify ExecStart:

```
ExecStart=/usr/local/bin/mdplanner --cache --port 8003 /var/lib/mdplanner/project
```

Apply changes:

```bash
sudo systemctl daemon-reload
sudo systemctl restart mdplanner
```

## Management

```bash
make -f deploy/Makefile status
make -f deploy/Makefile stop
make -f deploy/Makefile restart
make -f deploy/Makefile logs
```

## Reverse Proxy

To expose MD Planner behind nginx:

```nginx
server {
    listen 80;
    server_name planner.example.com;

    location / {
        proxy_pass http://127.0.0.1:8003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Uninstall

```bash
make -f deploy/Makefile uninstall
```

---

## Backup

v2 uses a JSON-based backup API — no CLI flags required.

### Export

```bash
# Download a full JSON backup
curl -o backup.json http://localhost:8003/api/v1/backup/export
```

The response is a JSON file containing all project data. The filename is set to
`mdplanner-backup-<date>.json` via `Content-Disposition`.

### Import

```bash
curl -X POST http://localhost:8003/api/v1/backup/import \
  -H "Content-Type: application/json" \
  --data-binary @backup.json
```

Add `?overwrite=true` to overwrite existing entities on import.

> **v1 features (not supported in v2):** CLI flags `--backup-dir`,
> `--backup-interval`, `--backup-public-key`, `mdplanner keygen`, and
> RSA-encrypted TAR backups were v1-only features. They are not present in v2.
> Scheduled backups are not yet implemented — use an external cron job with the
> export endpoint.

---

## MCP Server

The MCP server exposes mdplanner project data to Claude Desktop (or any
MCP-compatible client) via the stdio transport.

### Run with Deno

```bash
deno task mcp ./my-project
deno task mcp --cache ./my-project
```

### Compile a binary

```bash
deno task compile:mcp:macos-arm    # Apple Silicon
deno task compile:mcp:macos-intel  # Intel Mac
deno task compile:mcp:linux        # Linux x86_64
deno task compile:mcp:windows      # Windows x86_64
deno task compile:mcp:all          # All platforms
```

Binaries are written to `dist/mdplanner-mcp-*`.

### Claude Desktop configuration

Add to `~/.claude_desktop_config.json` (macOS) or the equivalent config file on
your platform:

```json
{
  "mcpServers": {
    "mdplanner": {
      "command": "/path/to/mdplanner-mcp-macos-arm",
      "args": ["/path/to/your/project"]
    }
  }
}
```

To enable full-text search, add `--cache`:

```json
{
  "mcpServers": {
    "mdplanner": {
      "command": "/path/to/mdplanner-mcp-macos-arm",
      "args": ["--cache", "/path/to/your/project"]
    }
  }
}
```

### Available tools

| Tool                 | Description                                    |
| -------------------- | ---------------------------------------------- |
| `list_tasks`         | List all tasks, optionally filtered by section |
| `get_task`           | Get a single task by ID                        |
| `create_task`        | Create a new task                              |
| `update_task`        | Update task fields                             |
| `delete_task`        | Delete a task by ID                            |
| `list_notes`         | List all notes (summary)                       |
| `get_note`           | Get a single note with full content            |
| `list_goals`         | List all goals, optionally filtered by status  |
| `list_meetings`      | List all meetings sorted by date descending    |
| `get_meeting`        | Get a single meeting with action items         |
| `list_people`        | List all people in the registry                |
| `get_project_config` | Get project metadata and configuration         |
| `search`             | Full-text search (requires `--cache`)          |

### Available resources

| URI                   | Description                         |
| --------------------- | ----------------------------------- |
| `mdplanner://project` | Project config and metadata as JSON |
| `mdplanner://tasks`   | All tasks as JSON                   |
| `mdplanner://notes`   | All notes as JSON                   |
| `mdplanner://goals`   | All goals as JSON                   |
