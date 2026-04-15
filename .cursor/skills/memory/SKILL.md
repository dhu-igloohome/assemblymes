---
name: project-memory
description: Persistent project context and decision tracking across sessions. Use when recording major technical decisions, architectural shifts, or keeping track of long-term project "memory".
---

# Project Memory (claude-mem)

This skill helps maintain long-term context for the project by using a persistent `MEMORY.md` file.

## 1. Tracking Decisions
Whenever a major technical decision is made (e.g., "Switching from REST to GraphQL", "Adding a new RBAC system"), record it in `MEMORY.md`.
- **Date**: YYYY-MM-DD
- **Decision**: Summary of the choice.
- **Rationale**: Why was this chosen?
- **Implications**: What should the agent remember for the future?

## 2. Session Context
At the end of a complex task, summarize the state of the project in `MEMORY.md`.
- What was completed?
- What is pending?
- What roadblocks were encountered?

## 3. Reading Memory
Before starting a new complex task, check `MEMORY.md` to see if there is relevant historical context that isn't captured in the code or recent chat history.

---
## MEMORY.md Template
Refer to [MEMORY_TEMPLATE.md](MEMORY_TEMPLATE.md) for the structure.
