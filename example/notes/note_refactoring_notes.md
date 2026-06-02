---
id: note_refactoring_notes
created_at: "2026-03-10T13:00:00Z"
updated_at: "2026-03-25T10:00:00Z"
revision: 3
mode: simple
project: MDPlanner
tags: [mdplanner/notes]
---

# Refactoring Notes

## createActionBtns factory
Before: 18 domain constants.tsx files each had identical actionBtns function.
After: `v2/components/ui/action-btns.tsx` with `createActionBtns(path, formContainer, opts)`.

## Rule of Three
When same code appears in 3+ places → extract.
When 2 variants exist → normalize to one, never add a third.

## Anti-patterns removed
- Inline onClick handlers (CSP violation)
- Hardcoded px values in domain CSS
- Duplicate filter option extraction logic

## In progress
- `createSearchPredicate` shared across domains
- `extractProjectNames` utility (already done)
