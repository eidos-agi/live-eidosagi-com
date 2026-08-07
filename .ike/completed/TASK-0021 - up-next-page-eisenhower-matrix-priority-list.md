---
id: TASK-0021
title: /up-next page — Eisenhower matrix + priority list
status: Done
created: '2026-04-17'
priority: High
updated: '2026-04-17'
---
User requested: page at /up-next with (a) Eisenhower matrix above (Do / Schedule / Delegate / Drop — Urgent×Important quadrants), (b) priority-ordered list below with order indicators (1, 2, 3...) and priority badges (urgent / high / normal / low).

Data source: ike tasks — filter deleted_at IS NULL + status != Done. Derive quadrant from:
  importance = priority >= high
  urgency   = priority == urgent OR (milestone == 'Phase 1' OR 'live event')
Render 4 panels with task cards in each. Below the matrix, a numbered list in priority order, each task linking to its .ike/tasks/*.md file on GitHub.

Also: add a 'Up Next' nav link after 'human tasks'.
