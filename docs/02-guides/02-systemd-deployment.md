---
title: systemd Deployment
---

# systemd Deployment

Run MD Planner as a background service on Linux.

## Installation

v2 runs with Deno — no compiled binary required.

```bash
# Install Deno
curl -fsSL https://deno.land/install.sh | sh

# Clone the repository
git clone https://github.com/studiowebux/mdplanner.git /opt/mdplanner

# Create a system user and data directory
sudo useradd --system --create-home --home-dir /var/lib/mdplanner mdplanner
sudo mkdir -p /var/lib/mdplanner/project
sudo chown -R mdplanner:mdplanner /var/lib/mdplanner

# Install the service file
sudo cp deploy/mdplanner.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable mdplanner
sudo systemctl start mdplanner
```

## Configuration

All runtime options are set via environment variables in the `[Service]` block.
Edit `/etc/systemd/system/mdplanner.service`:

```ini
[Unit]
Description=MD Planner
After=network.target

[Service]
Type=simple
User=mdplanner
Group=mdplanner
WorkingDirectory=/opt/mdplanner
ExecStart=/home/<your-user>/.deno/bin/deno run \
  --allow-net --allow-read --allow-write --allow-env \
  v2/bin.ts
Environment=PROJECT_DIR=/var/lib/mdplanner/project
Environment=PORT=8003
Environment=CACHE=true
Environment=MCP_TOKEN=
Environment=MDPLANNER_SECRET_KEY=
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mdplanner
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/mdplanner /opt/mdplanner
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

| Variable               | Default | Description                                                      |
| ---------------------- | ------- | ---------------------------------------------------------------- |
| `PROJECT_DIR`          | —       | Absolute path to the project data directory.                     |
| `PORT`                 | `8003`  | HTTP port.                                                       |
| `CACHE`                | `true`  | Set to `false` to disable the SQLite FTS cache.                  |
| `MCP_TOKEN`            | —       | Bearer token for `/mcp` endpoint. Leave empty to disable auth.   |
| `MDPLANNER_SECRET_KEY` | —       | AES-256-GCM key for encrypting integration secrets.              |

Generate a secret key:

```bash
openssl rand -hex 32
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

## Reverse proxy

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

For SSE support, add to the location block:

```nginx
proxy_buffering off;
proxy_cache off;
proxy_read_timeout 86400;
```

## Uninstall

```bash
make -f deploy/Makefile uninstall
```
