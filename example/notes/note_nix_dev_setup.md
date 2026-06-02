---
id: note_nix_dev_setup
created_at: "2026-03-25T10:00:00Z"
updated_at: "2026-04-01T09:00:00Z"
revision: 2
mode: simple
project: Infrastructure
tags: [mdplanner/notes]
---

# Nix Dev Setup

## Why Nix
- Reproducible dev environments
- Per-project shell with exact tool versions
- No global installs polluting system

## flake.nix structure
```nix
devShells.default = pkgs.mkShell {
  buildInputs = [ pkgs.deno pkgs.gh ];
};
```

## Workflow
```bash
nix develop  # enter dev shell
nix develop --command deno task dev:v2  # run without entering shell
```

## LSP in Helix
lspmcp bridge runs inside the nix shell.
Configured via `.helix/languages.toml` per project.
