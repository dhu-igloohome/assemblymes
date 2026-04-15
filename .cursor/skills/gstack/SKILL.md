---
name: gstack
description: High-level engineering management and release workflow based on the Garry Tan "gstack" setup. Use when the user wants to "ship", "review", or take a "CEO/Manager" view of the project.
---

# Gstack Engineering Management

This skill provides an opinionated framework for managing the software development lifecycle, inspired by Garry Tan's "gstack".

## 1. /office-hours (Strategy)
Use this mindset to discuss high-level architecture and product direction.
- Focus on the "Why" before the "How".
- Align technical debt with business priorities.

## 2. /qa (Deep Testing)
Before shipping, run a comprehensive "QA" persona review.
- Perform destructive testing (try to break it).
- Verify accessibility and performance.

## 3. /ship (Release Engineering)
Follow a strict release process:
- **Verification**: Run `npm run build` and all tests.
- **Review**: Perform a final Code Review.
- **Delivery**: Commit with clear, descriptive messages and push to the remote.
- **Feedback**: Confirm deployment status.

## 4. Personas in Gstack
- **CEO**: Is this moving the needle?
- **Eng Manager**: Is the code clean and scalable?
- **Release Manager**: Is the deployment state safe?
- **Documentation Engineer**: Is the README/MEMORY.md up to date?
