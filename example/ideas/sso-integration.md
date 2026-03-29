---
id: idea_sso
title: SSO Integration
status: cancelled
category: feature
priority: medium
project: Client Portal
start_date: "2026-02-01"
end_date: "2026-04-15"
resources: 1 dev, SAML library license
subtasks:
  - Evaluate SAML vs OIDC
  - Build identity provider adapter
  - Test with Okta and Azure AD
created_at: 2026-01-30
cancelled_at: 2026-03-10T09:00:00.000Z
links: [idea_templates]
---

# SSO Integration

Enable enterprise customers to authenticate via their corporate identity
provider using SAML 2.0 or OpenID Connect.

## Cancellation Reason

Deprioritized in favor of API Gateway auth consolidation. Will revisit in Q3
when the gateway handles all auth flows centrally.
