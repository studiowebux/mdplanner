# MCP Integration

MD Planner ships a built-in MCP server with 198 tools. Two transport modes are
available.

## stdio (local binary)

Compile the MCP binary:

```bash
deno task compile:mcp:macos-arm    # Apple Silicon
deno task compile:mcp:macos-intel  # Intel Mac
deno task compile:mcp:linux        # Linux x86_64
deno task compile:mcp:windows      # Windows x86_64
```

Or run directly with Deno:

```bash
deno task mcp ./my-project
deno task mcp --cache ./my-project
```

## HTTP (remote server)

When running the HTTP server, the MCP endpoint is at `/mcp`. Protect it with
`--mcp-token`:

```bash
mdplanner --mcp-token mytoken ./my-project
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

See [MCP Tools](../03-reference/03-mcp-tools.md) for the complete list of 198
tools grouped by entity.
