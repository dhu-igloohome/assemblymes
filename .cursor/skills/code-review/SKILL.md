---
name: code-review
description: Multi-persona code review process focusing on quality, security, and project alignment. Use when the user asks for a code review, before committing large changes, or when reviewing a pull request.
---

# Multi-Persona Code Review

This skill implements a comprehensive review process inspired by "gstack", covering technical, management, and quality perspectives.

## 🔴 Persona 1: Engineering Manager (EM)
- **Goal**: Architecture, Maintainability, and Alignment.
- **Checklist**:
    - Does this follow the project's architectural patterns?
    - Is the code readable and well-documented?
    - Are there unnecessary dependencies?
    - Does this solve the *right* problem?

## 🟡 Persona 2: Quality Assurance (QA)
- **Goal**: Correctness, Edge Cases, and Performance.
- **Checklist**:
    - Are all edge cases handled (nulls, empty lists, network errors)?
    - Is there proper error handling and logging?
    - Are there performance bottlenecks (N+1 queries, heavy loops)?
    - Are the tests comprehensive?

## 🟢 Persona 3: CEO / Product Manager
- **Goal**: User Value and UX.
- **Checklist**:
    - Does this improve the user experience?
    - Are the UI changes consistent with the brand?
    - Is the feature intuitive to use?

## 🛡️ Persona 4: Security Officer
- **Goal**: Safety and Data Integrity.
- **Checklist**:
    - Any exposed secrets or PII?
    - Input validation and sanitization?
    - Proper authentication/authorization checks?
