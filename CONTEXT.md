# Canopy — design handoff context

A landing page for **Canopy**, a platform that matches builders (engineers, designers, researchers) with problem holders (NGOs, companies, labs) and enablers (investors, mentors) through short sprints. The hook: *"If we can find love online, why not teammates?"*

This doc is a snapshot for continuing the visual/interaction design work in a fresh session — it covers what exists, why it's built the way it is, and one open design question.

## Stack & how to run

- Vanilla JS + Vite (no framework). `animejs` v4.5.0 from npm drives all JS-triggered motion.
- `npm run dev` → `http://localhost:5173`
- Files: `index.html` (markup) · `src/style.css` · `src/main.js` · `public/fonts/*.woff2`

## Brand system

**Palette** (CSS custom properties in `src/style.css`, full light/dark pairs):
- `--paper #f4efdc` / dark `#101c16` — page background, warm cream vs. deep forest-night
- `--card #fcf8ea` / dark `#182620` — card surfaces
- `--ink #26241a` / dark `#eee9d6` — body text
- `--forest #1f5c40` / dark `#7fd9a4` — primary brand green
- `--leaf #5f9a4c`, `--leaf-bright #82b969` / dark `#8fe39b`, `#a7ecad` — foliage greens
- `--coral #cf5f45` — accent (eyebrow labels, cross/pass state)
- `--sun #e3b23f` — secondary accent (tape, highlights)
- `--twine #a68955` — stems, watering can

**Type**: Fraunces (variable, display serif — headlines), Jost (variable, body sans), Caveat (variable, handwritten — kickers/labels/script accents). Self-hosted woff2 in `public/fonts`.

**Visual language**: newspaper-cutout / sticky-note aesthetic — torn paper edges (`.torn` class, CSS gradient technique), pin/tape decorations, slight card rotation (`--tilt` custom property), paper-grain background texture. Deliberately not glossy/corporate.

## Page structure (top to bottom)

1. **Header** — sticky, logo, nav, "Apply to Canopy" opens an intake modal (name / project / domain / skill level / looking-for, all pill-select).
2. **Hero** — headline, sub-copy, and a small SVG scene: a watering can pours onto a sapling in a pot. This is the *only* other animated "plant" element besides the main vine (deliberately kept — it's the singular opening beat, not a repeated motif).
3. **`#growthTrack`** — a wrapper div holding four content sections, with one `<canvas id="vineCanvas">` absolutely positioned behind all of them. This canvas draws **the vine** — see below, this is the centerpiece system.
   - `#problem` — "the gap" pain-point quotes (ML engineer, designer, founder, etc.)
   - `#solution` — Match / Sprint / Notebook three-step explainer + a tick/cross "problem deck" swipe interaction
   - `#for` — a visual "keychain" of role cards (builder/problem-holder/enabler) + tabbed copy
   - `#connect` — finale: a static SVG canopy-tree illustration, "It grew this far because someone kept watering it. Want in?", CTA card
4. **Footer**.

## The vine growth system (the main design surface)

`src/main.js`, function `drawVine()`. This is a canvas, not DOM/SVG — chosen for performance at high density (see perf note below).

- **Growth is scroll-driven**: `progress` (0–1) = how far `#growthTrack` has passed through the viewport. A plain `window.addEventListener('scroll', ...)` + `requestAnimationFrame` throttle drives it (see "reverted" note below).
- **Path**: a sine-wave stem down the left margin, with `xBaseAt(depthFrac)` drifting the stem rightward as depth increases — it's meant to lean *into* the text column the deeper it climbs, not stay pinned to a static margin.
- **Density curve**: leaf-pair spacing and branch frequency both ramp from sparse near the top to "one on every node" by ~55–60% down the page. Branches (added via `drawBranch()`) can recursively sprout one level of sub-branches past ~42% depth for real bushiness.
- **Canopy flood**: past 50% depth, leaves stop being tied to the vine's exact path and scatter across the *full canvas width*, increasing in count toward the bottom — this is the payoff for "it grew this far," meant to feel like the plant has taken over the screen rather than just climbed a line.
- **Leaf shape**: `leafShape()` draws a rounded pothos-style leaf (bezier, with a faint center vein) — redesigned from an earlier thin-almond shape specifically to match a reference photo of a trailing pothos wall decal (cascading heart-shaped leaves over a bedroom wall).
- **Performance**: originally redrew the *entire* accumulated vine on every scroll frame — measured at ~366ms worst-case, unacceptably janky. Rebuilt as **incremental drawing**: a `lastDrawnSeg` counter means each frame only paints newly-revealed segments (or does one full repaint if the user scrolls backward past what's drawn). Re-measured end-to-end through the real scroll→rAF→draw path: ~0.6–3ms average, ~2.6–28ms worst-case. Coverage at full scroll is currently **~16–17%** of the canvas overall, **~50%** in the bottom 10% (the flood zone).

## Interaction systems (all `animejs` v4)

- **Hero pour**: `createTimeline()` choreographs the watering-can tilt, a continuous stream (not just drops), and drop-by-drop bookends (opens and closes with individual countable drops, stream in between) — anchored to the *actual* spout position (measured via `getScreenCTM()` at the real pour-tilt rotation, not the resting angle — an earlier version had the water start ~29px away from the spout, visibly disconnected).
- **Scroll reveals**: `IntersectionObserver` + `animate()` fade/rotate-in for cards, respecting each card's `--tilt`.
- **Tick/cross deck**: swipe-out/settle-in via `animate()` with `outBack` easing.
- **Keychain charms**: expand to *measured* height (`scrollHeight`) via `animate()`, not a guessed `max-height`.

## Iteration history worth knowing

- **Removed**: a system that floated small "leaf cluster" SVGs into paragraph text via `shape-outside` (so copy would wrap around them), with counts doubling per section. Explicitly removed on request — "keep the vine structure" as the sole plant motif, not scattered small accents at each stage.
- **Reverted**: tried driving the vine's scroll progress with anime.js's native `onScroll({sync:true})` ScrollObserver instead of a hand-rolled listener. It never reported `isInView` correctly even under controlled testing — a real bug in that integration, not a workaround-able quirk — so it's back to a plain `scroll` + rAF listener, which is proven reliable.
- **Copy**: a few instances of "No X — just Y" rebuttal-cadence phrasing were flagged as AI-cadence and rewritten for variety (kept one instance in the hero, since one is fine — the pattern repeating 3+ times was the tell).

## Open design question

In the finale's dense flood zone, **left-half canvas coverage runs ~8.3% vs. right-half ~3.4%**. Traced this to its actual cause (simulated the RNG inputs directly — the flood's own scatter is evenly distributed, mean landing dead-center): the main vine's stem is anchored left-of-center by design throughout the whole page, so its own bulk (leaf pairs + branches up to 150px+) stacks on top of the flood on that side, while the right side only gets the flood's uniform layer. Not a bug — a compounding effect of two intentionally-different systems. Undecided: even it out (bias the flood harder right), or keep the "vine's home side is denser, flood fills in around it" asymmetry as-is.

## Reference

User supplied a photo of a trailing pothos wall decal (heart-shaped leaves cascading down a bedroom wall, over minimalist art) as the target "feel" for the vine — informed the leaf-shape redesign and the push toward denser, more overlapping foliage.
