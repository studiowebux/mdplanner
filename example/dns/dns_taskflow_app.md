---
id: dns_taskflow_app
domain: taskflow.app
expiry_date: "2027-06-01"
auto_renew: true
renewal_cost_usd: 19.99
provider: cloudflare
status: active
project: TaskFlow Platform
nameservers:
  - "dana.ns.cloudflare.com"
  - "rob.ns.cloudflare.com"
dns_records:
  - type: A
    name: "@"
    value: "203.0.113.10"
    ttl: 1
    proxied: true
  - type: CNAME
    name: www
    value: taskflow.app
    ttl: 1
    proxied: true
  - type: MX
    name: "@"
    value: route1.mx.cloudflare.net
    ttl: 3600
  - type: TXT
    name: "@"
    value: "v=spf1 include:_spf.mx.cloudflare.net ~all"
    ttl: 3600
last_fetched_at: "2026-05-30T06:00:00.000Z"
created_at: "2025-06-01T08:00:00.000Z"
updated_at: "2026-05-30T06:00:00.000Z"
---

Primary production domain for the TaskFlow Platform. Proxied through Cloudflare
for DDoS protection and caching. Auto-renew enabled.
