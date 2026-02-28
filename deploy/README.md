# Deployment

## Docker

Requires [Docker](https://docs.docker.com/get-docker/) and Docker Compose.

```bash
# Initialize a project directory
mkdir -p data
docker run --rm -v "$(pwd)/data:/data" $(docker build -q .) init /data

# Start the server
docker compose up -d
```

Open `http://localhost:8003`. Project files are stored in `./data/` on the host.

### Configuration

Edit `docker-compose.yml` to change options:

| Option    | Default  | Description                            |
| --------- | -------- | -------------------------------------- |
| Port      | 8003     | Host port mapping                      |
| Data path | `./data` | Host directory for project             |
| `--cache` | disabled | Add flag in CMD to enable SQLite cache |

To enable the cache, override the command in `docker-compose.yml`:

```yaml
services:
  mdplanner:
    build: .
    image: localhost:5000/mdplanner:latest
    ports:
      - "8003:8003"
    volumes:
      - ./data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:8003/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
    command: [
      "run",
      "--allow-net",
      "--allow-read",
      "--allow-write",
      "--allow-env",
      "main.ts",
      "--cache",
      "/data",
    ]
```

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

### Key generation

Before using encrypted backups, generate a key pair:

```bash
mdplanner keygen
```

Output:

```
PUBLIC KEY (hex)  — store in --backup-public-key or MDPLANNER_BACKUP_PUBLIC_KEY:
<long hex string>

PRIVATE KEY (hex) — keep secret, used to decrypt backups (X-Backup-Private-Key header):
<long hex string>
```

Store the private key in a password manager or secret store. It cannot be
recovered if lost. The public key is safe to include in the server
configuration.

### Server flags

| Flag                        | Env var                       | Description                                         |
| --------------------------- | ----------------------------- | --------------------------------------------------- |
| `--backup-public-key <hex>` | `MDPLANNER_BACKUP_PUBLIC_KEY` | RSA public key hex — enables encrypted exports      |
| `--backup-dir <path>`       | `MDPLANNER_BACKUP_DIR`        | Directory where scheduled backups are written       |
| `--backup-interval <hrs>`   | `MDPLANNER_BACKUP_INTERVAL`   | Backup frequency in hours (requires `--backup-dir`) |

### Plain export

```bash
# Download a plaintext TAR archive via curl
curl -o backup.tar http://localhost:8003/api/backup/export
```

### Encrypted export

```bash
# Start server with encryption enabled
mdplanner --backup-public-key <public-key-hex> ./my-project

# Download encrypted archive
curl -o backup.tar.enc http://localhost:8003/api/backup/export
```

### Import (plain)

```bash
curl -X POST http://localhost:8003/api/backup/import \
  --data-binary @backup.tar
```

### Import (encrypted)

```bash
curl -X POST http://localhost:8003/api/backup/import \
  -H "X-Backup-Private-Key: <private-key-hex>" \
  --data-binary @backup.tar.enc
```

Add `?overwrite=true` to overwrite existing files on import.

### Scheduled backups

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
