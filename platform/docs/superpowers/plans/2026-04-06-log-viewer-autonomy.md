# Log Viewer + Autonomy Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Log Viewer page showing agent errors from disk + live execution events, and 3 autonomy modes (Manual/Auto/Checkpoint) for pipeline runs.

**Architecture:** Log Viewer reads Hermes log files via fetch (browser) or Tauri fs (desktop), merges with live executionStore logs, renders in a filterable table. Autonomy mode is a dropdown in the ExecutionToolbar that sets a field on StartRunRequest.

**Tech Stack:** React, Zustand, Tauri fs plugin (optional), existing executionStore

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/components/logs/LogViewerPage.tsx` | Create | Full-page log viewer with filters |
| `src/components/logs/LogParser.ts` | Create | Parse Hermes log files into unified format |
| `src/components/execution/ExecutionToolbar.tsx` | Modify | Add autonomy mode selector |
| `src/stores/executionStore.ts` | Modify | Add autonomyMode field |
| `src/components/layout/TopNav.tsx` | Modify | Add Logs tab |
| `src/App.tsx` | Modify | Wire LogViewerPage route |

---

### Task 1: Log Parser utility
- Create `src/components/logs/LogParser.ts`
- Parse errors.log, token_usage.jsonl, killswitch.log into unified LogEntry format

### Task 2: Log Viewer Page
- Create `src/components/logs/LogViewerPage.tsx`
- Left panel: log stream (newest first), right panel: filters
- Auto-refresh every 5s

### Task 3: Autonomy Mode in Toolbar
- Add Manual/Auto/Checkpoint dropdown to ExecutionToolbar
- Store mode in executionStore

### Task 4: Wire into App
- Add Logs tab to TopNav
- Route in App.tsx
- Commit
