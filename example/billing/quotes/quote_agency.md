---
id: quote_agency
number: Q-2026-002
customer_id: customer_agency
title: Business Plan Q1 Subscription
status: sent
currency: CAD
expires_at: 2026-03-15
tax_rate: 15
subtotal: 900
tax: 135
total: 1035
revision: 1
sent_at: 2026-02-10
created_at: 2026-02-10
updated_at: 2026-02-10
line_items:
  - id: li_1
    type: service
    description: Business Plan (20 users) - Quarterly
    group: Subscription
    quantity: 20
    unit: unit
    unit_rate: 45
    taxable: true
    amount: 900
  - id: li_2
    type: text
    description: Priority support included with Business Plan
    amount: 0
  - id: li_3
    type: service
    description: Premium onboarding session
    group: Add-ons
    quantity: 2
    unit: h
    unit_rate: 150
    rate_id: rate_standard
    optional: true
    taxable: true
    amount: 300
payment_schedule:
  - description: 50% deposit
    percent: 50
    due_date: 2026-02-15
  - description: Balance on completion
    percent: 50
    due_date: 2026-03-15
---

# Quote: Business Plan Q1

## Notes

Quarterly subscription for DevAgency with optional onboarding.

## Footer

Valid for 30 days. Terms subject to master service agreement.
