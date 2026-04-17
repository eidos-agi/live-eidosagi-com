---
id: TASK-0018
title: Savings formula correction — usd_saved_estimate should reflect local_event_count
  * claude_cost
status: To Do
created: '2026-04-17'
priority: High
---
Current /api/savings returned `usd_saved_estimate: 0` even after an eidos-local event landed. Expected (local_event_count × claude_event_cost_usd) = 1 × $0.004 = $0.004. Formula appears to skip fractional dollars. Fix: return the raw float (JS number, JSON serializes .004 fine), and update the SavingsStrip to render with enough precision ("$0.004 saved · 1 local event") until the counter grows.

Also: a second derived metric — `hosted_cost_incurred_usd = hosted_event_count × claude_event_cost_usd` — is worth surfacing so viewers see both sides of the equation (money spent on hosted Claude vs money saved on local).
