---
id: brainstorm_billing_ux
tags: [billing, ux, design]
linked_tasks: [task_1775093654964_jp5s]
created_at: 2026-03-20
updated_at: 2026-03-20
---

# Billing UX Improvements

## Should invoices have a print-friendly view or PDF export?

PDF export is the priority — customers need downloadable invoices for their records. Print-friendly CSS is a nice-to-have but PDF covers the use case better. Use HTML→PDF approach to reuse existing detail view layout.

## How should the quote approval flow work?

Draft → Submit for Approval → Approved/Rejected → Send. The approver should see a diff of what changed since last approval. Rejection sends it back to draft with comments.

## What billing information should appear on the customer detail page?

Summary stats (total quoted, invoiced, paid, outstanding) plus recent quotes and invoices tables. Already implemented — verify it covers edge cases like zero-state and overdue invoices.
