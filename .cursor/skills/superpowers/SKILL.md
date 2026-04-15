---
name: superpowers
description: Composable software development methodology focusing on Spec -> Plan -> TDD -> Implementation. Use when starting a new feature, refactoring complex logic, or when the user wants a structured "Superpowers" development flow.
---

# Superpowers Development Workflow

This skill implements the "Superpowers" methodology for agentic software development. It emphasizes structure, planning, and test-driven development.

## 1. Spec Gathering
Before coding, ensure the requirements are crystal clear.
- Ask clarifying questions about edge cases.
- Identify all stakeholders and user personas.
- Document the "Definition of Done".

## 2. Implementation Planning
Create a detailed plan before touching the code.
- List all files to be created or modified.
- Identify potential breaking changes.
- Sequence tasks to minimize dependencies.

## 3. Test-Driven Development (TDD)
Write tests before implementation whenever possible.
- Define expected behavior via unit or integration tests.
- Run tests to see them fail (Red).
- Implement minimal code to make tests pass (Green).
- Refactor and optimize.

## 4. Subagent-Driven Execution
For large tasks, break them down and use specialized "subagents" if available.
- Use the `Task` tool for isolated sub-tasks.
- Ensure each subagent has clear context and a narrow goal.

## 5. Composable Skills
Treat every complex operation as a potential "skill" to be reused.
- If a pattern repeats, document it in `.cursor/skills/`.
