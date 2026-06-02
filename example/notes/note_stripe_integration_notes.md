---
id: note_stripe_integration_notes
created_at: "2026-02-01T14:00:00Z"
updated_at: "2026-03-10T11:00:00Z"
revision: 3
mode: simple
project: Website
tags: [mdplanner/notes]
---

# Stripe Integration Notes

## Webhooks
Always verify `stripe-signature` header before processing.
Use `constructEvent()` with endpoint secret.

## Key events to handle
- `checkout.session.completed` — provision access
- `customer.subscription.deleted` — revoke access
- `invoice.payment_failed` — send dunning email

## Test cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3DS required: `4000 0025 0000 3155`

## Idempotency
Pass `idempotencyKey` on all write operations.
Use event ID from webhook as key.
