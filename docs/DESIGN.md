# Design Notes - AR Tata Surya

## 1. Design Intent and Product Personality

The interface exists to support a stable, readable AR camera view with minimal visual distraction. This update focuses on camera visibility and overlay clarity, not a visual redesign.

## 2. Audience and Use-Context Signals

Primary users are students and instructors using mobile browsers in classroom or home settings. Lighting and device variability are expected, so AR readiness and clear error messaging are required.

## 3. Visual Direction and Distinctive Moves

Anchor reference: optical viewfinder with a matte box and HUD markings. Maintain the existing visual language and strengthen the camera-layer hierarchy so the live feed is always visible behind the AR scene and UI overlays.

## 4. Color, Typography, Spacing, and Density Decisions

Keep current palette and type choices; treat camera video as the base layer and ensure overlays remain readable without darkening the entire view. Typography decision: display for titles, body for instructions, monospace for debug data.

## 5. Token Architecture and Alias Strategy

No new tokens are introduced. Existing tokens remain the source of truth for overlay UI, while camera video uses fixed layering rules.

## 6. Responsive Recomposition Plan

Mobile remains primary; overlays keep their positions while camera and canvas stay fullscreen. Desktop retains the same hierarchy for predictable debugging.

## 7. Motion, Interaction, and Feedback Rules

Signature motion is short fade in/out for status overlays. Motion is functional: loading, readiness, and error states only. Reduced motion is respected by avoiding decorative animations in AR view.

## 8. Component Language, States, and Morphology

Overlay components keep their current morphology. State feedback is focused on loading and camera readiness.

## 9. Source Boundaries and Context Hygiene

No new design references or libraries are introduced. Decisions are based on current repo UI and the AR debugging brief.

## 10. Accessibility Non-Negotiables

Controls remain reachable with clear contrast and focus treatment. Status messages remain readable over live video.

## 11. Anti-Patterns to Avoid

Avoid hiding the camera video behind opaque layers or using loading overlays that never release. Avoid unnecessary UI redesign.

## 12. Implementation Notes for Future UI Tasks

Any future visual redesign should update this document and the design intent JSON before CSS changes.
