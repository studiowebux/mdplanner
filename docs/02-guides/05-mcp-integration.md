---
title: MCP Integration
---

# MCP Integration

MD Planner ships a built-in MCP server. Two transport modes are available.

## HTTP

The MCP endpoint is at `/mcp` on the running v2 server. It accepts two kinds of
credential:

1. **Shared token** — set `MCP_TOKEN` and send it as `Authorization: Bearer`.
   Grants access without a named identity.

   ```bash
   MCP_TOKEN=mytoken deno task dev:v2
   ```

2. **Named identity** — a project API key (see [Identity](#identity)). The
   connection is attributed to the key's name (e.g. `Claude`).

When neither `MCP_TOKEN` nor any `api_keys` are configured, the endpoint is open
(local single-user default).

## Claude Desktop configuration

Claude Desktop does not support HTTP MCP servers directly. Use Claude Code
(CLI or IDE extension) instead — it connects via the `type: url` transport shown
below.

## Claude Code configuration

Add to `.claude/settings.json` or `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "mdplanner": {
      "type": "url",
      "url": "http://localhost:8003/mcp",
      "headers": {
        "Authorization": "Bearer mytoken"
      }
    }
  }
}
```

## Identity

To attribute an MCP connection to a named principal, add an API key to
`project.md`. The key's `name` becomes the actor (the same `X-Api-Key`
mechanism the REST API uses).

```yaml
---
api_keys:
  - name: Claude
    key: your-secret-value
---
```

Connect with the key sent as either `X-Api-Key` or `Authorization: Bearer`:

```json
{
  "mcpServers": {
    "mdplanner": {
      "type": "url",
      "url": "http://localhost:8003/mcp",
      "headers": {
        "X-Api-Key": "your-secret-value"
      }
    }
  }
}
```

Or via the CLI:

```bash
claude mcp add --transport http mdplanner http://localhost:8003/mcp \
  --header "X-Api-Key: your-secret-value"
```

The shared `MCP_TOKEN` bearer still works alongside named keys. Set
`MDPLANNER_SECRET_KEY` to encrypt the stored key values at rest.

## Available resources

| URI                   | Description                         |
| --------------------- | ----------------------------------- |
| `mdplanner://project` | Project config and metadata as JSON |
| `mdplanner://tasks`   | All tasks as JSON                   |
| `mdplanner://notes`   | All notes as JSON                   |
| `mdplanner://goals`   | All goals as JSON                   |

## Tool reference

See [MCP Tools](/mcp/) for the complete list of tools grouped by entity.

## Feature gating

The MCP server only exposes tools for **enabled** features. A module disabled in
Settings > Feature Visibility does not load its tools on either transport
(stdio and HTTP) — the same enabled-features config that drives the sidebar
navigation. Core infrastructure (the context pack and preferences) always
loads so an agent can boot on a minimal configuration. Enable a feature and
reconnect to pick up its tools.
