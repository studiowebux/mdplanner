# MD Planner

Markdown-based project management with directory storage.

## Links

Bug Tracker: [GitHub Issues](https://github.com/studiowebux/mdplanner/issues)

## About

MD Planner is a task management system that uses a directory of markdown files
as the database. Each entity (task, note, goal) is a separate `.md` file with
YAML frontmatter. No external database required. Human-readable. Git-friendly.

## Installation

### Pre-built Binary

Download from
[GitHub Releases](https://github.com/studiowebux/mdplanner/releases):

| Platform    | Binary                  |
| ----------- | ----------------------- |
| Linux x64   | `mdplanner-linux`       |
| macOS Intel | `mdplanner-macos-intel` |
| macOS ARM   | `mdplanner-macos-arm`   |
| Windows x64 | `mdplanner-windows.exe` |

```bash
chmod +x mdplanner-macos-arm
./mdplanner-macos-arm ./my-project
```

### From Source

Requires [Deno](https://deno.land/).

```bash
git clone https://github.com/studiowebux/mdplanner.git
cd mdplanner
deno task dev ./example
```

Open `http://localhost:8003`

## Documentation

Full documentation: [docs/user-guide.md](docs/user-guide.md)

## Contributing

Fork, branch, PR. Run `deno task dev` to test.

## License

GPL-3.0

## Contact

Studio Webux: [studiowebux.com](https://studiowebux.com)
