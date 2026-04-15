---
name: frontend-design
description: Guidelines for high-quality, modern, and accessible frontend design. Use when creating UI components, designing pages, or when the user mentions "Frontend Design" or UI/UX improvements.
---

# Frontend Design Excellence

This skill focuses on creating beautiful, accessible, and high-performance user interfaces, with a focus on the project's "Linear-inspired" aesthetic.

## 1. Visual Tokens
Follow the established palette and typography:
- **Palette**: Use the Slate-based dark theme with Indigo/Violet accents.
- **Typography**: Inter or similar sans-serif. High contrast for headings, muted for secondary info.
- **Spacing**: Use a strict 4px/8px grid (Tailwind `p-1`, `p-2`, etc.).

## 2. Component Principles
- **Clarity**: Use icons (Lucide) to reinforce meaning, but don't over-rely on them.
- **Feedback**: Every action must have immediate visual feedback (hover states, loading spinners, toast messages).
- **Consistency**: Use existing UI components from `@/components/ui/` (Radix/Shadcn).

## 3. Interaction Design
- **Skeleton Screens**: Use while loading data to reduce perceived latency.
- **Micro-interactions**: Subtle transitions (e.g., `transition-all duration-300`) for a premium feel.
- **Error Handling**: Friendly, actionable error messages instead of technical jargon.

## 4. DESIGN.md First
Always refer to the project's `DESIGN.md` as the source of truth for visual tokens and layout rules.
- If a new pattern is introduced, suggest updating `DESIGN.md`.
