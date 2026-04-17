---
id: note_zsh_aliases
created_at: "2025-03-01T09:00:00Z"
updated_at: "2026-02-10T11:00:00Z"
revision: 11
mode: simple
tags: [mdplanner/notes]
---

# Zsh Aliases & Functions

## Navigation
```zsh
alias ..='cd ..'
alias ...='cd ../..'
alias proj='cd ~/Projects'
alias brain='cd ~/Development/cerveau/_brains_'
```

## Git
```zsh
alias gs='git status'
alias gp='git push'
alias gl='git log --oneline -10'
alias gco='git checkout'
```

## Dev
```zsh
alias dv2='cd ~/Projects/mdplanner && deno task dev:v2'
alias dt='deno task test'
alias dl='deno lint && deno fmt --check'
```

## Utilities
```zsh
alias ll='ls -la'
alias ports='lsof -i -P | grep LISTEN'
```
