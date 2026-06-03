---
id: dns_taskflowhq_com
domain: taskflowhq.com
expiry_date: "2026-12-20"
auto_renew: true
renewal_cost_usd: 14.99
provider: cloudflare
status: active
project: API Gateway
nameservers:
  - "dana.ns.cloudflare.com"
  - "rob.ns.cloudflare.com"
dns_records:
  - type: A
    name: api
    value: "203.0.113.42"
    ttl: 1
    proxied: true
  - type: CNAME
    name: docs
    value: taskflowhq.com
    ttl: 3600
  - type: CAA
    name: "@"
    value: "0 issue \"letsencrypt.org\""
    ttl: 3600
last_fetched_at: "2026-05-28T11:30:00.000Z"
created_at: "2025-02-20T09:00:00.000Z"
updated_at: "2026-05-28T11:30:00.000Z"
---

Corporate and API documentation domain. Hosts the public API Gateway under the
`api` subdomain. CAA record restricts certificate issuance to Let's Encrypt.
