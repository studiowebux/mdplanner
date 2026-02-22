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

| Option       | Default     | Description                   |
| ------------ | ----------- | ----------------------------- |
| Port         | 8003        | Host port mapping             |
| Data path    | `./data`    | Host directory for project    |
| `--cache`    | disabled    | Add flag in CMD to enable SQLite cache |

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
      test: ["CMD", "wget", "-qO-", "http://localhost:8003/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
    command: ["run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "main.ts", "--cache", "/data"]
```

### Management

```bash
docker compose up -d      # Start in background
docker compose down       # Stop
docker compose logs -f    # Follow logs
docker compose pull       # Update image
```

---

## Linux (systemd)

Systemd service file for running MD Planner as a background service on Linux.

## Installation

```bash
# Copy binary
sudo cp dist/mdplanner-linux /usr/local/bin/mdplanner
sudo chmod +x /usr/local/bin/mdplanner

# Create service user
sudo useradd --system --create-home --home-dir /var/lib/mdplanner mdplanner

# Create project directory
sudo mkdir -p /var/lib/mdplanner/project
sudo chown -R mdplanner:mdplanner /var/lib/mdplanner

# Initialize a project (create project.md in /var/lib/mdplanner/project)
sudo -u mdplanner bash -c 'cat > /var/lib/mdplanner/project/project.md << EOF
---
name: My Project
---
EOF'

# Install and enable service
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
sudo systemctl status mdplanner    # Check status
sudo systemctl stop mdplanner      # Stop
sudo systemctl restart mdplanner   # Restart
sudo journalctl -u mdplanner -f    # Follow logs
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
sudo systemctl stop mdplanner
sudo systemctl disable mdplanner
sudo rm /etc/systemd/system/mdplanner.service
sudo systemctl daemon-reload
sudo rm /usr/local/bin/mdplanner
sudo userdel -r mdplanner
```
