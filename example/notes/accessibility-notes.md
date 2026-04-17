---
id: note_accessibility_notes
created_at: "2026-02-25T10:00:00Z"
updated_at: "2026-03-20T14:00:00Z"
revision: 2
mode: simple
project: MDPlanner
tags: [mdplanner/notes]
---

# Accessibility Notes

## Current state
Not audited. Basic semantic HTML in place (headings, nav, main, buttons).

## Quick wins
- [ ] Add `aria-label` to icon-only buttons
- [ ] Ensure focus visible on all interactive elements
- [ ] Table `<th scope="col">` for sortable columns
- [ ] Skip-to-content link in shell

## Screen reader testing
Test with VoiceOver (macOS) minimum.
NVDA + Firefox for Windows coverage.

## Forms
Labels already connected via `for`/`id`.
Error messages need `aria-describedby` link.

## Color contrast
Using CSS vars — verify all combos pass WCAG AA (4.5:1).
