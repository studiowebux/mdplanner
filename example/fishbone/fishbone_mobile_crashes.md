---
id: fishbone_mobile_crashes
title: Mobile App Crash Rate Spike
description: Crash-free sessions dropped below 98% after the v1.2 mobile release
project: Mobile App
created_at: 2026-04-12T00:00:00.000Z
updated_at: 2026-04-12T00:00:00.000Z
---

## People

- On-call rotation gaps during release week
- Limited native debugging expertise on the team

## Process

- No staged rollout for the v1.2 build
- Crash thresholds not gating the release

## Platform

- OS-specific regressions on older Android versions
- Background task limits killing sync

## Code

- Unhandled null in offline cache hydration
- Race condition in the sync queue

## Device

- Low-memory devices terminating the app
- Inconsistent behavior across screen densities

## Network

- Timeouts not retried on flaky connections
- Large payloads on cellular
