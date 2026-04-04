---
id: idea_mobile_push
title: Mobile Push Notifications
status: implemented
category: feature
priority: high
project: Mobile App
start_date: "2026-01-15"
end_date: "2026-03-01"
resources: 1 dev, Firebase account
subtasks:
  - Set up Firebase Cloud Messaging
  - Build notification preferences UI
  - Implement quiet hours
  - Test on iOS and Android
created_at: 2026-01-10
implemented_at: 2026-03-01T14:30:00.000Z
links: [idea_integrations]
---

# Mobile Push Notifications

Real-time push notifications for task assignments, due date reminders, and
mentions. Uses Firebase Cloud Messaging for cross-platform delivery.

## Implementation Notes

- FCM token refresh handled on app launch
- Notification channels: assignments, reminders, mentions, system
- Quiet hours respect device timezone
