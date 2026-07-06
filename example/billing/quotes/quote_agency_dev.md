---
id: quote_agency_dev
number: Q-2026-003
customer_id: customer_agency
title: Custom Development Sprint
status: draft
currency: CAD
expires_at: 2026-04-30
tax_rate: 15
revision: 1
created_at: 2026-03-20
updated_at: 2026-03-20
line_items:
  - id: li_1
    type: text
    description: "Phase 1: Discovery & Design"
  - id: li_2
    type: service
    description: UX Research & Wireframes
    group: "Phase 1: Discovery"
    quantity: 16
    unit: h
    unit_rate: 150
    rate_id: rate_standard
    taxable: true
  - id: li_3
    type: service
    description: Technical Architecture Review
    group: "Phase 1: Discovery"
    quantity: 8
    unit: h
    unit_rate: 250
    rate_id: rate_premium
    taxable: true
  - id: li_4
    type: text
    description: "Phase 2: Implementation"
  - id: li_5
    type: service
    description: Frontend Development
    group: "Phase 2: Implementation"
    quantity: 24
    unit: h
    unit_rate: 150
    rate_id: rate_standard
    taxable: true
  - id: li_6
    type: product
    description: SSL Certificate (1 year)
    quantity: 1
    unit: unit
    unit_rate: 100
    taxable: true
  - id: li_7
    type: expense
    description: Cloud hosting setup fee
    quantity: 1
    unit: fixed
    unit_rate: 400
    taxable: false
  - id: li_8
    type: service
    description: Post-launch support (optional)
    group: Add-ons
    quantity: 10
    unit: h
    unit_rate: 150
    rate_id: rate_standard
    optional: true
    taxable: true
    discount: 10
    discount_type: percent
---

# Quote: Custom Development Sprint

## Notes

Full-stack development sprint covering discovery, design, and implementation. Optional post-launch support with 10% discount.

## Footer

This quote is valid for 30 days. Travel expenses billed at cost. All work covered under standard NDA.
