# Color Palette — Light Theme

## Core Neutrals

| Token | Hex | Usage |
|-------|-----|-------|
| bg-primary | #FFFFFF | Main background |
| bg-secondary | #F5F5F5 | Cards, sidebar, secondary surfaces |
| bg-tertiary | #EBEBEB | Inputs, code blocks, nested surfaces |
| bg-inverse | #000000 | Inverted backgrounds (tooltips, overlays) |
| bg-hover | #F5F5F5 | Hover state on interactive surfaces |
| bg-active | #E0E0E0 | Active/pressed state |
| text-primary | #000000 | Headings, body text |
| text-secondary | #2C2C2C | Secondary content, descriptions |
| text-muted | #6B6B6B | Captions, placeholders, disabled |
| text-inverse | #FFFFFF | Text on inverse backgrounds |
| border-default | #E0E0E0 | Default borders, dividers |
| border-strong | #C0C0C0 | Emphasized borders |
| border-focus | #8E8E8E | Focus rings |

## Accent

| Token | Hex | Usage |
|-------|-----|-------|
| accent | #FFAB00 | Primary interactive color (buttons, links, active states) |
| accent-hover | #E69A00 | Accent hover state |
| accent-subtle | #FFF3D0 | Light accent background (selected rows, badges) |
| accent-muted | #FFD666 | Mid-tone accent (progress bars) |

## Semantic — Status Colors

### Success

| Token | Hex | Text on base | Usage |
|-------|-----|-------------|-------|
| success | #04B34F | black | Positive actions, confirmations |
| success-bg | #E8F5E9 | | Light tint behind success messages |
| success-border | #A5D6A7 | | Success alert/badge border |
| success-text | #2E7D32 | | Text on success-bg |

### Warning

| Token | Hex | Text on base | Usage |
|-------|-----|-------------|-------|
| warning | #FF9900 | black | Caution states, pending actions |
| warning-bg | #FFF3E0 | | Light tint behind warnings |
| warning-border | #FFCC80 | | Warning alert/badge border |
| warning-text | #000000 | | Text on warning-bg |

### Error

| Token | Hex | Text on base | Usage |
|-------|-----|-------------|-------|
| error | #A6192E | white | Destructive actions, validation errors |
| error-bg | #FBE9EC | | Light tint behind errors |
| error-border | #F1B8BF | | Error alert/badge border |
| error-text | #A6192E | | Text on error-bg |

### Info

| Token | Hex | Text on base | Usage |
|-------|-----|-------------|-------|
| info | #0057B8 | white | Informational messages, links |
| info-bg | #E3F2FD | | Light tint behind info |
| info-border | #90CAF9 | | Info alert/badge border |
| info-text | #0057B8 | | Text on info-bg |

## Category Colors

| Category | Light | Base | Dark |
|----------|-------|------|------|
| Orange | #ED8B00 | #E57200 | #DC4405 |
| Yellow | #FEDB00 | #FFC600 | #F2A900 |
| Green | #78BE20 | #4C8C2B | #44693D |
| Blue | #00A3E0 | #0085AD | #005670 |
| Navy | #006298 | #003865 | #041E42 |
| Purple | #93328E | #642F6C | #3C1053 |
| Pink | #CE0F69 | #AC145A | #6C1D45 |

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| shadow-sm | 0 1px 2px rgba(0,0,0,0.05) | Subtle elevation (cards) |
| shadow-md | 0 4px 12px rgba(0,0,0,0.08) | Medium elevation (dropdowns, popovers) |
| shadow-lg | 0 10px 15px rgba(0,0,0,0.1) | High elevation (modals, dialogs) |

## Contrast Checklist

- [x] text-primary (#000000) on bg-primary (#FFFFFF) — 21:1
- [x] text-secondary (#2C2C2C) on bg-primary (#FFFFFF) — 14.7:1
- [x] text-muted (#6B6B6B) on bg-primary (#FFFFFF) — 5.4:1
- [ ] accent (#FFAB00) on bg-primary (#FFFFFF) — 2.1:1 (fails AA for text, OK for large text/icons)
- [x] accent (#FFAB00) on bg-inverse (#000000) — 9.9:1
- [x] success-text (#2E7D32) on success-bg (#E8F5E9) — 5.8:1
- [x] warning-text (#000000) on warning-bg (#FFF3E0) — 19.3:1
- [x] error-text (#A6192E) on error-bg (#FBE9EC) — 6.2:1
- [x] info-text (#0057B8) on info-bg (#E3F2FD) — 5.9:1

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

## Known Issues

- accent (#FFAB00) on white fails WCAG AA for normal text (2.1:1) — use text-primary on accent-subtle backgrounds, not accent as text color
- accent works for large text, icons, borders, and button backgrounds
