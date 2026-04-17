---
id: TASK-0013
title: Light mode + dark mode toggle + system-preference default
status: To Do
created: '2026-04-17'
priority: Medium
milestone: Phase 3 — Full GPU Battery Visible
---
Site is dark-only today (workshop palette). Add a light-mode variant that keeps the Eidos personality: warm cream bg (#f0ebe4), walnut/brass primaries on light, sage secondary. Use the `[data-theme="paper"]` palette already defined in eidosagi.com/src/styles/themes.css as the starting point.

**Deliverables**:
1. Add `[data-theme="paper"]` CSS vars to globals.css.
2. Honor `prefers-color-scheme` by default (`html` class set at boot via no-flash inline script).
3. Toggle in the header (sun/moon icon, tiny, next to the site-URL tag).
4. Persist choice in localStorage.
5. Test ActivitySidebar, ChatSidebar, RaceBoard, and all pages in both modes.

**Acceptance**: load the site with a light system preference — it comes up in paper theme on first paint, no dark flash. Toggle persists.
