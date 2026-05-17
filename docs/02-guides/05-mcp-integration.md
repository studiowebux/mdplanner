---
title: MCP Integration
---

# MCP Integration

MD Planner ships a built-in MCP server with 157 tools. Two transport modes are
available.

## HTTP

The MCP endpoint is at `/mcp` on the running v2 server. Protect it with
`MCP_TOKEN`:

```bash
MCP_TOKEN=mytoken deno task dev:v2
```

## Claude Desktop configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
or the equivalent path on your platform:

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

With SQLite cache:

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

## Available resources

| URI                   | Description                         |
| --------------------- | ----------------------------------- |
| `mdplanner://project` | Project config and metadata as JSON |
| `mdplanner://tasks`   | All tasks as JSON                   |
| `mdplanner://notes`   | All notes as JSON                   |
| `mdplanner://goals`   | All goals as JSON                   |

## Tool reference

See [MCP Tools](/mcp/) for the complete list of tools grouped by entity.
