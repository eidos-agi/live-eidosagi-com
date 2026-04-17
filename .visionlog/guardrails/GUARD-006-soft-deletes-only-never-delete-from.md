---
id: "GUARD-006"
type: "guardrail"
title: "Soft deletes only \u2014 never DELETE FROM"
status: "active"
date: "2026-04-17"
---

Every table has deleted_at. Reads filter WHERE deleted_at IS NULL. The activity feed is a historical record — failure states are content, not embarrassment to hide.
