/**
 * MCP server entry point for mdplanner.
 *
 * Usage:
 *   deno task mcp <project-directory>
 *   deno task mcp --cache <project-directory>
 *   deno task mcp --help
 */

import { ProjectManager } from "./src/lib/project-manager.ts";
import { startMcpServer } from "./src/mcp/server.ts";
import { VERSION } from "./src/lib/version.ts";
import { validateProjectPath } from "./src/lib/cli.ts";

interface MCPArgs {
  projectPath: string;
  help: boolean;
  cache: boolean;
}

function printHelp(): void {
  console.error(`
mdplanner-mcp v${VERSION}

Usage:
  mdplanner-mcp [OPTIONS] <project-directory>

Arguments:
  <project-directory>    Path to the project directory (must contain project.md)

Options:
  -c, --cache            Enable SQLite cache for fast search queries
  -h, --help             Show this help message

Examples:
  mdplanner-mcp ./my-project
  mdplanner-mcp --cache ./my-project

Claude Desktop config (~/.claude_desktop_config.json):
  {
    "mcpServers": {
      "mdplanner": {
        "command": "/path/to/mdplanner-mcp",
        "args": ["/path/to/your/project"]
      }
    }
  }
`);
}

function parseArgs(args: string[]): MCPArgs {
  const result: MCPArgs = {
    projectPath: ".",
    help: false,
    cache: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      result.help = true;
      i++;
    } else if (arg === "-c" || arg === "--cache") {
      result.cache = true;
      i++;
    } else if (arg.startsWith("-")) {
      console.error(`Error: Unknown option '${arg}'`);
      console.error("Use --help for usage information");
      Deno.exit(1);
    } else {
      result.projectPath = arg;
      i++;
    }
  }

  return result;
}

const cliArgs = parseArgs(Deno.args);

if (cliArgs.help) {
  printHelp();
  Deno.exit(0);
}

await validateProjectPath(cliArgs.projectPath);

const projectManager = new ProjectManager(cliArgs.projectPath, {
  enableCache: cliArgs.cache,
  dbPath: `${cliArgs.projectPath}/.mdplanner.db`,
});
await projectManager.init();

await startMcpServer(projectManager);
