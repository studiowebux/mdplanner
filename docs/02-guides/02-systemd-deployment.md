# systemd Deployment

Run MD Planner as a background service on Linux.

## Installation

Using the Makefile:

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

To enable SQLite cache, modify ExecStart:

```ini
ExecStart=/usr/local/bin/mdplanner --cache --port 8003 /var/lib/mdplanner/project
```

To add authentication:

```ini
ExecStart=/usr/local/bin/mdplanner --api-token mysecret --mcp-token mcptoken --cache /var/lib/mdplanner/project
```

For integration secret encryption:

```ini
[Service]
Environment=MDPLANNER_SECRET_KEY=<your-64-char-hex-key>
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
