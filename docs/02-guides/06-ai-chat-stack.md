# AI Chat Stack

Run MD Planner alongside Ollama (LLM), Chatterbox (TTS), SearXNG (search), and
Caddy (reverse proxy) as a single composed stack.

## Prerequisites

Docker, Docker Compose v2. Optional: NVIDIA GPU + Container Toolkit for
hardware-accelerated Ollama and Chatterbox.

## Start the stack

```bash
docker compose -f deploy/docker-compose.yml up -d
```

Open `http://localhost:8080`. All services are accessible through Caddy.

| Service    | External URL                   | Notes                         |
| ---------- | ------------------------------ | ----------------------------- |
| mdplanner  | `http://localhost:8080`        | Main application              |
| Ollama API | internal only (`ollama:11434`) | Configure in AI Chat settings |
| Chatterbox | `http://localhost:8080/tts`    | Routed via Caddy              |
| SearXNG    | `http://localhost:8080/search` | Routed via Caddy              |

## AI Chat configuration

In mdplanner, navigate to AI Chat and open the Config panel:

- **Ollama URL:** `http://ollama:11434` (Docker internal hostname)
- **Chatterbox URL:** `http://localhost:8080` (through Caddy at `/tts`)
- **SearXNG URL:** `http://localhost:8080` (through Caddy at `/search`)

## GPU support

GPU is disabled by default. To enable NVIDIA GPU for Ollama and/or Chatterbox,
uncomment the `deploy` block in `deploy/docker-compose.yml` for the relevant
service. Requires
[NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html).

## Volumes

| Volume              | Contents                             |
| ------------------- | ------------------------------------ |
| `mdplanner-data`    | Project files (`/data` in container) |
| `ollama-data`       | Downloaded LLM models                |
| `huggingface-cache` | Chatterbox model weights             |
| `searxng-data`      | SearXNG cache                        |

Voice reference WAV files for Chatterbox are bind-mounted from
`deploy/chatterbox/references/`. Add `.wav` files there before starting the
stack.

## Security

Change the `secret_key` in `deploy/searxng/settings.yml` before any
public-facing deployment. The default value is a placeholder.

## Management

```bash
make -f deploy/Makefile stack-up
make -f deploy/Makefile stack-down
make -f deploy/Makefile stack-logs
```
