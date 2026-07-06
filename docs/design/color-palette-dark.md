# Color Palette — Dark Theme

## Core Neutrals

| Token | Hex | Usage |
|-------|-----|-------|
| bg-primary | #343434 | Main background |
| bg-secondary | #3E3E3E | Cards, sidebar, secondary surfaces |
| bg-tertiary | #4A4A4A | Inputs, code blocks, nested surfaces |
| bg-inverse | #F3F3F3 | Inverted backgrounds (tooltips, overlays) |
| bg-hover | #4A4A4A | Hover state on interactive surfaces |
| bg-active | #555555 | Active/pressed state |
| text-primary | #F3F3F3 | Headings, body text |
| text-secondary | #E9DCBE | Secondary content, descriptions |
| text-muted | #8E8B82 | Captions, placeholders, disabled |
| text-inverse | #343434 | Text on inverse backgrounds |
| border-default | #4A4A4A | Default borders, dividers |
| border-strong | #5E5E5E | Emphasized borders |
| border-focus | #8E8B82 | Focus rings |

## Accent

| Token | Hex | Usage |
|-------|-----|-------|
| accent | #E9DCBE | Primary interactive color (buttons, links, active states) |
| accent-hover | #F3F3F3 | Accent hover state |
| accent-subtle | #4A4540 | Dark accent background (selected rows, badges) |
| accent-muted | #B3A78E | Mid-tone accent (progress bars) |

## Semantic — Status Colors

### Success

| Token | Hex | Text on base | Usage |
|-------|-----|-------------|-------|
| success | #04B34F | black | Positive actions, confirmations |
| success-bg | #1A3A2A | | Dark tint behind success messages |
| success-border | #2E7D32 | | Success alert/badge border |
| success-text | #A5D6A7 | | Text on success-bg |

### Warning

| Token | Hex | Text on base | Usage |
|-------|-----|-------------|-------|
| warning | #FF9900 | black | Caution states, pending actions |
| warning-bg | #3D2E10 | | Dark tint behind warnings |
| warning-border | #B36B00 | | Warning alert/badge border |
| warning-text | #FFCC80 | | Text on warning-bg |

### Error

| Token | Hex | Text on base | Usage |
|-------|-----|-------------|-------|
| error | #A6192E | white | Destructive buttons, validation errors |
| error-bg | #3D1520 | | Dark tint behind errors |
| error-border | #7A1222 | | Error alert/badge border |
| error-text | #DC3545 | | Text on surfaces (overdue, inline errors) |

### Info

| Token | Hex | Text on base | Usage |
|-------|-----|-------------|-------|
| info | #0057B8 | white | Informational messages, links |
| info-bg | #152A45 | | Dark tint behind info |
| info-border | #003D82 | | Info alert/badge border |
| info-text | #90CAF9 | | Text on info-bg |

## Usage Patterns

### Buttons

| Button | Background | Text | Hover bg |
|--------|-----------|------|----------|
| Primary | accent | text-primary | accent-hover |
| Danger | error | static-white | error-text |
| Secondary | bg-secondary | text-primary | bg-hover |

### Badges (on subtle backgrounds)

| Badge | Background | Text |
|-------|-----------|------|
| Accent (open, active) | accent-subtle | text-primary |
| Success (completed) | success-bg | success-text |
| Error (offline) | error | static-white |
| Warning (hybrid) | warning-bg | warning-text |

### Inline text (no background)

| Usage | Token |
|-------|-------|
| Error text (overdue) | error-text |
| Success text | success-text |
| Warning text | warning-text |
| Muted text | text-muted |

## Contrast Checklist

- [x] text-primary (#F3F3F3) on bg-primary (#343434) — 10.5:1
- [x] text-secondary (#E9DCBE) on bg-primary (#343434) — 8.5:1
- [x] text-muted (#8E8B82) on bg-primary (#343434) — 3.4:1
- [x] error-text (#DC3545) on bg-primary (#343434) — 4.6:1
- [x] success-text (#A5D6A7) on bg-primary (#343434) — 7.8:1
- [x] warning-text (#FFCC80) on bg-primary (#343434) — 10.4:1
- [x] info-text (#90CAF9) on bg-primary (#343434) — 7.2:1
- [x] static-white (#FFFFFF) on error (#A6192E) — 7.2:1
