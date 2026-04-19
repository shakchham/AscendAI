# UI Style Guide

This guide keeps internal pages visually consistent.

## Spacing Scale

- Page content wrapper: `space-y-6 p-5`
- Card sections: `space-y-4`
- Form groups: `gap-2` for compact controls, `gap-4` for grid forms
- Card paddings use `Card` component default (`p-5`)

## Core Components

- `Card` from `card.tsx`
  - Use for every major section.
  - Includes hover elevation and consistent title style.
- `Button` from `button.tsx`
  - Variants: `primary`, `secondary`, `neutral`, `success`, `warning`
  - Includes hover and active micro-interactions.
- `Input`, `Select`, `Textarea` from `fields.tsx`
  - Use for all form controls.
  - Includes consistent focus ring and border treatment.
- `LoadingBlock`, `EmptyState` from `state.tsx`
  - Use in every card-backed data section.
  - Always show either loading, data, or empty state.

## Interaction Rules

- Always use transition classes from shared components (no abrupt state change).
- Prefer subtle transforms (`active:scale-[0.99]`) over dramatic animation.
- Keep hover states visible but lightweight.
- Mobile side navigation should close on route change and support backdrop tap-to-close.

## Card Composition Pattern

1. Title
2. Small helper text (optional)
3. Controls
4. Results/summary block

## Accessibility Baseline

- Maintain clear text contrast against backgrounds.
- Preserve keyboard focus visibility (shared fields already handle this).
- Keep button labels action-oriented and short.
