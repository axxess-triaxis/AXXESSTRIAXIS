# Agentic Phase 1 Post-Deploy QA Checklist

Date: 2026-07-30  
Use after A-78 migration and deployment.

Mark one option per row:

- Fully works
- Improvement
- Does not work
- Not for addressal now

| # | Check | Fully works | Improvement | Does not work | Not for addressal now | Notes |
|---|---|---|---|---|---|---|
| 1 | Agent Connections panel appears in Settings > Integrations | [ ] | [ ] | [ ] | [ ] | |
| 2 | OpenAI option is visible | [ ] | [ ] | [ ] | [ ] | |
| 3 | Anthropic/Claude option is visible | [ ] | [ ] | [ ] | [ ] | |
| 4 | Microsoft Copilot option is visible but correctly caveated | [ ] | [ ] | [ ] | [ ] | |
| 5 | Admin can generate an agent key | [ ] | [ ] | [ ] | [ ] | |
| 6 | key is shown once only | [ ] | [ ] | [ ] | [ ] | |
| 7 | connection appears in list | [ ] | [ ] | [ ] | [ ] | |
| 8 | `tools/list` returns three tools | [ ] | [ ] | [ ] | [ ] | |
| 9 | `list_projects` returns only tenant projects | [ ] | [ ] | [ ] | [ ] | |
| 10 | `query_knowledge_hub` returns tenant-scoped answer/citations or honest no-source state | [ ] | [ ] | [ ] | [ ] | |
| 11 | `create_task` creates task or pending approval as designed | [ ] | [ ] | [ ] | [ ] | |
| 12 | created task appears in Tasks & Workflow | [ ] | [ ] | [ ] | [ ] | |
| 13 | audit log records successful tool call | [ ] | [ ] | [ ] | [ ] | |
| 14 | invalid key fails safely | [ ] | [ ] | [ ] | [ ] | |
| 15 | revoked key fails safely | [ ] | [ ] | [ ] | [ ] | |
| 16 | failure/capability denial audit is recorded | [ ] | [ ] | [ ] | [ ] | |
| 17 | no other tenant data appears | [ ] | [ ] | [ ] | [ ] | |
| 18 | no raw key appears after initial display | [ ] | [ ] | [ ] | [ ] | |
| 19 | UI copy makes Phase 1/Phase 2 limits clear | [ ] | [ ] | [ ] | [ ] | |
| 20 | founder signs off A-78 for production certification | [ ] | [ ] | [ ] | [ ] | |

## Summary

- Fully works: `____ / 20`
- Improvement: `____ / 20`
- Does not work: `____ / 20`
- Not for addressal now: `____ / 20`

Decision:

- [ ] A-78 can close
- [ ] A-78 remains blocked pending remediation
- [ ] A-78 code is accepted but live certification deferred

