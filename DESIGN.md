# AssemblyMES UI Style Guide (Linear-Inspired)

This project adopts a **Linear-inspired enterprise UI** from the `awesome-design-md` approach:
minimal chrome, high information density, clear hierarchy, and restrained accent usage.

## 1) Visual theme

- Base tone: neutral dark shell + light working canvas.
- Mood: focused, operational, low distraction.
- Density: medium-high for ERP data workflows.

## 2) Color roles

- Primary accent: Indigo (`#6366F1` / `#4F46E5`) for key actions and active states.
- Shell background: Slate 950 (`#020617`) and Slate 900 (`#0F172A`).
- Canvas background: White / Slate 50 for content readability.
- Text:
  - Primary dark text on canvas: Slate 900
  - Secondary text: Slate 500/600
  - Primary light text on dark shell: Slate 100
  - Secondary light text: Slate 400

## 3) Typography

- Font: Geist Sans (already configured).
- Headings: bold, tight tracking, clear visual hierarchy.
- Body copy: compact but readable (`text-sm` to `text-base`).

## 4) Components

- Sidebar:
  - Dark surface with subtle borders.
  - Active item uses indigo-tinted background and brighter text.
  - Navigation groups expand via explicit click interaction.
- Cards:
  - Rounded (`xl`) with light border.
  - Hover states use subtle elevation and accent-tinted border.
- Inputs:
  - On dark surfaces, use dark fill + light text + clear border.
- Buttons:
  - Primary action = indigo filled.
  - Secondary actions = outline/neutral.

## 5) Layout principles

- Left fixed navigation, right fluid workspace.
- 8px spacing rhythm, grouped sections with visible boundaries.
- Home modules are direct-entry cards to reduce navigation steps.

## 6) Do / Don't

- Do keep contrast high for shop-floor readability.
- Do prioritize clear status and action affordances.
- Don't overuse gradients, shadows, or decorative elements.
- Don't hide critical nav actions behind hover-only interactions.
