# Bootstrap Dynamic Design Contract

When a user requests UI, UX, frontend layout, screen, Tailwind, animation, or redesign work, create or refine:
- `docs/DESIGN.md` for human-readable design reasoning
- `docs/design-intent.json` for machine-readable design intent, guardrails, and review signals

This contract is a decision scaffold, not a style preset. It must guide the LLM to choose well from the current repo, current user brief, current project docs, and live official documentation when a technology or library claim matters.

## Core Rule

We guide the agent; we do not pick the final style, stack, framework, palette, typography, layout paradigm, or animation library offline.

The agent must:
1. Read [AGENTS.md](../../AGENTS.md), this prompt, [frontend-architecture.md](../rules/frontend-architecture.md), current UI code, current project docs, and existing design docs before UI edits.
2. If `docs/DESIGN.md` or `docs/design-intent.json` exists, refine them instead of replacing them blindly.
3. If either design doc is missing, create it before UI implementation.
4. Use current repo evidence, product copy, route names, component names, user goals, and existing constraints as the source of truth.
5. Treat prior-chat visuals, unrelated project memory, benchmark screenshots, and famous-product aesthetics as tainted context unless the user explicitly asks for continuity.
6. When choosing a new UI, animation, styling, or component library, research current official docs and choose the latest stable compatible option for this project. Do not rely on offline defaults.
7. Keep external references non-copying: extract constraints and reasoning only, never clone the surface.
8. Record a Motion/Palette Decision before UI implementation; product categories are heuristics, not style presets, so override them with task, content density, brand intent, device/performance, and accessibility evidence.

## Creative Commitment Gate

Before broad compliance review or UI implementation, commit to one concrete creative direction and record it in `docs/DESIGN.md` plus `docs/design-intent.json`. This commitment must include:
- one conceptual anchor from a specific physical, editorial, architectural, cinematic, industrial, scientific, or interaction domain
- one signature motion behavior that is more specific than "smooth transitions"
- one typographic decision that creates meaningful role contrast instead of a uniform safe type system

The anchor must name at least one specific real-world reference point such as a material, instrument, artifact class, architectural system, editorial genre, cinematic interface behavior, exhibition system, scientific apparatus, or industrial mechanism. If the anchor can only be described with generic quality words such as "modern", "clean", "premium", "expressive", "minimal", or "bold", reject it and choose again.

When the host supports separate agents, a lightweight creative pass may synthesize the commitment from the brief and repo evidence before a governance pass validates accessibility, tokens, maintainability, and implementation risk. When only one agent is available, perform the same separation sequentially: creative commitment first, governance validation second.

## User Research Intake

If the user mentions or attaches a research file, article, benchmark, library list, screenshot study, or design note, read it before choosing the visual direction or dependencies. Treat it as candidate evidence, not as a command to copy every recommendation.

The agent must summarize what it used from that research, discard what does not fit the project, and verify any library, framework, API, browser feature, or package claim against current official documentation before implementation.

User-supplied research may influence the candidate set for motion, scroll, UI primitives, canvas/3D, charts, icons, typography, and interaction patterns, but the final choice must still be project-fit, accessible, performant, and maintainable.

## Dynamic Avant-Garde Anchor Engine

If the user requests UI work but provides no user-supplied research, design reference, screenshot study, or library note, do not start coding immediately. This is not permission to fall back to the scaffold, prior UI, or generic software metaphors. First synthesize one advanced conceptual anchor that will unify the interface.

User-supplied research means current-task evidence from the user. The scaffold seed, this repo's offline examples, old design docs, and prior UI do not count as research. If live research is available, perform agent-led research into current official docs for any technology choices and current premium interaction/design patterns before selecting the anchor. If live research is unavailable, state that limitation in the design docs and synthesize from product context plus broad design knowledge without pretending the seed was research.

Do not use basic software UI labels as the final anchor, including "dashboard", "portal", "cards", "admin panel", "SaaS shell", "web app shell", or "minimalist interface".

The agent must internally consider at least three substantially different, high-variance candidate anchors, discard the two most obvious, safest, or easiest-to-predict options, then record only the surviving anchor, its concrete real-world reference point, and concise rationale. Do not expose hidden deliberation or the rejected candidate list.

The final anchor must come from broad non-template domains such as complex physical engineering, high-end industrial design, cinematic spatial interfaces, experimental editorial structure, advanced architecture, scientific instrumentation, advanced data visualization, exhibition/wayfinding systems, or premium interactive web experiences. These are search domains, not style presets.

Write the chosen anchor into `docs/design-intent.json` as `conceptualAnchor`, including agentResearchMode, sourceDomain, specificReferencePoint, rationale, signatureMotion, typographicDecision, derivedTokenLogic, visualRiskBudget, motionRiskBudget, and cohesionChecks. Typography, spacing, density, color behavior, morphology, motion, and responsive composition must logically derive from that single anchor. If a later design choice does not follow from the anchor, revise the contract before coding.

Motion is not a garnish. Default to a rich motion plan: fluid transitions, spatial reveals, scroll choreography, micro-interactions, and modern motion libraries are expected when they strengthen the anchor and product experience. Keep reduced-motion fallbacks instead of suppressing motion, and solve performance deliberately instead of using safety language as a reason to stay static.

## Token Derivation Audit

Before implementation, `docs/design-intent.json` must include top-level `derivedTokenLogic` with `anchorReference`, `colorDerivationSource`, `spacingDerivationSource`, `typographyDerivationSource`, `motionDerivationSource`, and `validationRule`.

After writing `docs/design-intent.json`, audit the token plan:
- Why these colors instead of another palette? Answer in one sentence that references the anchorReference.
- Why this spacing rhythm? Answer in one sentence that references the anchorReference.
- Why this motion timing and easing? Answer in one sentence that references the anchorReference.

If the answer is "looks good", "common practice", "modern default", "Tailwind default", or a generic framework habit, the token is wrong. Derive it again from the chosen anchor before writing UI code.

## Library Research Protocol

If web search is available:
- Research current official docs for each library, framework API, animation package, scroll tool, 3D/canvas helper, charting tool, icon package, or UI primitive claim.
- Record source URL, fetched date, stable compatible version, purpose, risk, and fallback in `docs/design-intent.json`.
- Set `libraryResearchStatus` to `verified` only when each external library decision has current official evidence.

If web search is unavailable or fails:
- Do not hallucinate dependency APIs, package names, versions, or imports.
- Write `LIBRARY_TO_VERIFY: [name] - requires live research before implementation` in the design notes.
- Use only native CSS, browser APIs, or already-present project dependencies you can verify from local repo files.
- Set `libraryResearchStatus` to `pending-verification` and give every `libraryDecisions[]` entry a `fallbackIfUnavailable`.

Do not write imports from a new library until that library decision is verified or the user explicitly accepts a pending verification blocker.

## Zero-Based Redesign Protocol

If the user says "redesign from zero", "redesain dari 0", "ulang dari 0", "research ulang", or equivalent reset language, activate reset mode.

In reset mode:
- Existing UI and existing design docs are content, behavior, accessibility, and repo-evidence inputs only. They are not visual continuity sources.
- Replace or materially rewrite `docs/DESIGN.md` and `docs/design-intent.json` before implementation so the new contract cannot inherit old palette, typography, layout, navigation shape, component morphology, motion signature, or image placement by accident.
- Define a `visualResetStrategy` that names the old visual DNA being discarded and the new direction being selected from current brief, repo evidence, and live official documentation.
- The implementation must change composition, hierarchy, palette/typography, motion/interaction, and responsive information architecture. A palette swap, dark-mode flip, or same hero with new colors is failure.
- Keep product data, copy requirements, routes, accessibility needs, and required local assets intact unless the user explicitly says they may be removed.
- If a modern UI, animation, scroll, 3D, canvas, chart, or icon library is useful, research current official docs and record the selected library, source URL, fetched date, reason, performance risk, and reduced-motion/accessibility fallback.

## Design Quality Bar

The UI must feel authored by a strong UI/UX designer, not assembled from default cards and safe framework chrome.
The UI must not look like a first-pass AI template. "Readable" and "safe" are not enough when the brief calls for an authored product experience.

## Creative Ambition Floor

For new screens and broad redesigns, the agent must make one authored visual bet before coding. This can be a spatial structure, material logic, data treatment, motion language, typographic contrast, image system, or interaction model, but it must be visible in the first viewport and it must come from the chosen product anchor.

The ambition floor is not a license to decorate. It is a check against timid AI-template output. The design may still be quiet, dense, utilitarian, or text-heavy when the product needs that, but it must have a clear authored decision that a generic scaffold would not produce.

Before implementation, record:
- one product-derived palette move that does not rely on cream, slate, purple-blue gradient, monochrome, or cyber-neon defaults
- one signature motion, spatial, or interaction behavior that is more specific than "smooth"
- one morphology or composition choice that breaks away from interchangeable card stacks when the product allows it

If the agent chooses not to use rich motion, 3D, canvas, WebGL, scroll choreography, or an animation library, it must name the product, content-density, performance, accessibility, or device constraint that makes omission better. "Not necessary", "keep it simple", or "avoid complexity" is insufficient without that evidence.

## AI Color and Template Residue Audit

AI color drift happens when a screen reaches for safe defaults before it understands the product: cream editorial surfaces, dark slate dashboards, purple-blue gradients, monochrome minimalism, neon cyber terminals, soft glow atmospheres, or arbitrary bright accents with no semantic behavior.

These palettes are not banned when the product truly earns them. They are banned as autopilot. If one appears, the design contract must explain why that palette belongs to the product, how each semantic role behaves, and what product-specific color behavior prevents the UI from reading like a first-pass AI template.

The palette audit must answer:
- What product evidence or anchorReference makes these colors more appropriate than safer defaults?
- Which color roles carry task, status, data, or navigation meaning beyond surface decoration?
- Which color choice would not transfer cleanly to a different product category?

Accessibility is the floor, not the personality. Do not use contrast compliance as an excuse to flatten the palette into generic cream, slate, monochrome, or gradient safety.

## Motion and 3D Courage Rule

Motion, 3D, canvas, WebGL, scroll choreography, and modern animation libraries are first-class UI options when they improve product understanding, exploration, feedback, hierarchy, memorability, or confidence.

The agent must not suppress motion or spatial UI because it is afraid of implementation complexity. It must choose the richest responsible interaction model the product can support, then define reduced-motion, keyboard, loading, performance, and non-3D fallbacks.

When 3D/canvas is not used, document the non-use reason and the replacement interaction quality that will carry the experience. When 3D/canvas is used, document its product role, interaction model, fallback path, and library/runtime decision before coding.

Do:
- Synthesize a visual direction from the project context and explain why it fits.
- Choose color, typography, spacing, motion, density, and component morphology dynamically from the product and audience.
- Make at least three at-a-glance product-specific signals visible on new screens or broad redesigns: for example a data treatment, physical metaphor, motion behavior, iconography system, spatial structure, or state language that would not transfer cleanly to a different product.
- Use visually exploratory, product-derived palettes while preserving WCAG contrast and status clarity. The design may be quiet, but it must not hide inside safe cream, slate, monochrome, or gradient defaults.
- Use modern, expressive interaction and motion as part of the core design language, especially when it improves hierarchy, feedback, delight, confidence, or memorability.
- Use 3D or spatial/canvas experiences as primary UI only when they improve product understanding or exploration while preserving navigation, content clarity, user actions, performance, accessibility, and non-3D fallbacks.
- Keep frontend code clean, componentized, accessible, and easy to maintain.
- Use tokens and semantic aliases so future changes do not require rewriting components.
- Make design decisions explicit before coding, then implement consistently.

Do not:
- Ship AI-safe UI: predictable card stacks, rounded template panels, generic abstract marks, decorative grid wallpaper, beige or slate safety palettes, soft glow backgrounds, or first-output composition with only local copy swapped in.
- Default to generic SaaS heroes, balanced card grids, soft startup gradients, or dashboard chrome without product rationale.
- Use background lines, grids, scanlines, noise, glows, blobs, logos, or geometric decoration unless each motif has a named product function such as alignment, measurement, navigation, crop guidance, timeline reading, status, or motion continuity.
- Let desktop, tablet, and mobile be the same design merely scaled down.
- Let heading, body, data, and metadata collapse into one safe typographic treatment without rationale.
- Reuse colors, layout shapes, or motion signatures from unrelated memory.
- Add decorative animation that hurts clarity, accessibility, or runtime performance.
- Let 3D visuals hide navigation, replace readable content, block core actions, or require a powerful device before the product can be understood.
- Choose a dependency because this repo scaffold mentioned it. The LLM must verify fit from current project context and official docs.

## Responsive Rule

Responsive design means recomposition, not resizing.

For every UI task, define how major surfaces change across mobile, tablet, and desktop:
- What is reordered, merged, hidden, disclosed, or promoted?
- What interaction changes for touch and narrow screens?
- What content priority changes by viewport?
- What is explicitly forbidden, such as scale-only shrink or preserving desktop order without reason?

## Required `docs/DESIGN.md` Sections

1. Design Intent and Product Personality
2. Audience and Use-Context Signals
3. Visual Direction and Distinctive Moves
4. Color, Typography, Spacing, and Density Decisions
5. Token Architecture and Alias Strategy
6. Responsive Recomposition Plan
7. Motion, Interaction, and Feedback Rules
8. Component Language, States, and Morphology
9. Source Boundaries and Context Hygiene
10. Accessibility Non-Negotiables
11. Anti-Patterns to Avoid
12. Implementation Notes for Future UI Tasks

## Required `docs/design-intent.json` Behavior

The JSON must stay machine-readable and project-specific. It should record:
- the confirmed project context and assumptions to validate
- agent-chosen visual direction, not scaffold-chosen direction
- an `aiSafeUiAudit` or equivalent review signal that states why the screen is not interchangeable with a generic AI-generated template
- `motionPaletteDecision` with motion density source, required interaction states, palette autopilot risk, and whether 3D/canvas is useful or unnecessary
- `conceptualAnchor` and how typography, spacing, morphology, motion, and responsive composition derive from it when no external research was provided
- `derivedTokenLogic` with exact `anchorReference` traceability for color, spacing, typography, and motion tokens
- `libraryResearchStatus` plus `libraryDecisions[]` with verified source metadata or explicit native/project-local fallbacks
- agent-chosen semantic color roles, typography system, spacing rhythm, and motion approach
- token layering with primitive, semantic, and component tokens
- viewport mutation rules for mobile, tablet, and desktop
- interaction-state expectations for key components
- accessibility hard floor and advisory readability checks
- review rubric for distinctiveness, contract fidelity, hierarchy, responsive recomposition, motion discipline, and accessibility
- forbidden patterns that are concrete bad habits for this project
- repo evidence when available, including `repoEvidence.designEvidenceSummary`

## Accessibility and Review

WCAG 2.2 AA is the hard floor. APCA may be used only as advisory perceptual tuning and must never waive a WCAG failure.

The review must block or flag:
- inaccessible contrast, focus, target size, keyboard, auth, or dynamic-status behavior
- scale-only responsive behavior
- unresearched dependency choices
- AI-safe UI drift: interchangeable card grids, safe cream/slate/monochrome palettes, generic abstract logos, decorative grid wallpaper, or a screen that can be renamed to another product without visual changes
- palette choices that use readability as a reason to stay in safe defaults instead of deriving a richer but accessible palette from the product
- default component-kit styling without product rationale
- missing or disconnected `conceptualAnchor` when no external design research was provided
- visual direction copied from unrelated memory or external references
- genericity findings that cannot name the exact drift signal

Wait for user approval before generating Figma or code assets when the user only asked for planning or design direction.
