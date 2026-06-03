---
id: mindmap_mobile_app
project: Mobile App
created_at: "2026-04-22T10:00:00.000Z"
updated_at: "2026-04-22T10:00:00.000Z"
---

# Mobile App Architecture

- Mobile App
  - Presentation
    - Screens
      - Task list
      - Task detail
      - Settings
    - Navigation
      - Tab bar
      - Deep links
  - Data Layer
    - Local store
      - SQLite cache
      - Migrations
    - Sync engine
      - Offline queue
      - Conflict resolution
  - Platform
    - iOS
      - Widgets
      - Push (APNs)
    - Android
      - Widgets
      - Push (FCM)
  - Observability
    - Crash reporting
    - Analytics events
