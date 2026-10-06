# Canopy — Design Handoff

Reference this file when asking Claude (or anyone) to design UI mockups, propose visual changes, or theme a new page for Canopy. Everything here is extracted from the live code, so it's accurate as of this commit — not aspirational.

**How to use this for mockups without code changes:** almost every visual decision on the site routes through the token list in [Design Tokens](#design-tokens). A mockup that only changes token *values* (a new accent hex, a different display face, a new radius scale) can be dropped straight into `src/style.css`'s `:root` block with no other code touched. A mockup that introduces a new *component* should follow the [Component Patterns](#component-patterns) below so it inherits the same texture/motion/accessibility conventions instead of inventing new ones.

## Brand identity

- **Name:** Canopy — "If we can find love online, why not teammates?"
- **Metaphor:** organic growth, end to end. A sapling gets watered on the homepage hero; a hand-drawn vine grows down the page as you scroll, thickening and maturing in color as it goes; the closing section is a full canopy. Product surfaces built later (Match/Sprint/Notebook) deliberately evolve *away* from the storybook texture into a calmer "workspace" material — see [Two Visual Worlds](#two-visual-worlds).
- **Voice:** warm, direct, a little handwritten. Script accents (Caveat) are used for asides and human touches ("grab a shovel", "no rush — the sapling will still be here"), never for body copy.

## Two visual worlds

The site intentionally runs **two coherent sub-systems on one shared token set**, not one style bleeding into the other:

| | Homepage (`index.html`) | Workspace pages (`match.html`, `sprint.html`, `notebook.html`) |
|---|---|---|
| Feel | Storybook, hand-drawn, illustrated | Calmer, denser, product-shaped |
| Base surface | `.paper-card` + `.torn` (torn-paper edge, tape, pins) | `.elevated-card` (real shadow, 18px radius, colored top accent) |
| Accent language | Hand-tilted rotations (`--tilt`), script labels, a growing SVG vine behind everything | A domain color system (`[data-domain]`) driving chips/avatars/card accents consistently |
| Icons | Illustrated inline SVG (logo mark, keychain charms) | A small drawn-icon set (`.icon`) — never emoji |

Both share the same color tokens, type stack, spacing rhythm, and motion curves — a mockup for either should never invent a second palette.

## Design tokens

All in `src/style.css`, lines 1–88. Change a value here and it cascades everywhere that token is used — this is the fastest lever for a design change that touches the whole site.

### Color (light theme, `:root`)

| Token | Value | Used for |
|---|---|---|
| `--paper` | `#f4efdc` | page background |
| `--paper-deep` | `#e9e0c2` | recessed surfaces (code/teaser blocks, scrollbar track) |
| `--card` | `#fcf8ea` | card/panel surfaces |
| `--card-edge` | `#e4dabb` | card borders |
| `--ink` | `#26241a` | primary text |
| `--ink-soft` | `#5c5744` | secondary text |
| `--ink-faint` | `#716b58` | tertiary/meta text — *contrast-tuned, see inline comment at style.css:25; don't lighten without re-checking 4.5:1 at the sizes it's used* |
| `--forest` | `#1f5c40` | primary accent — links, active states, CTAs |
| `--forest-deep` | `#123a28` | footer background, deepest accent |
| `--leaf` | `#5f9a4c` | secondary green accent |
| `--leaf-bright` | `#82b969` | brightest green, decorative |
| `--sun` | `#e3b23f` | focus rings (always, sitewide), warm highlight |
| `--sun-soft` | `#f2d99a` | soft warm fill |
| `--coral` | `#cf5f45` | warm accent, "alone/problem" states |
| `--twine` | `#a68955` | keychain/rope-colored accents, tape |
| `--line` | `rgba(38,36,26,.16)` | hairline borders |
| `--shadow` | `rgba(38,32,16,.22)` | drop shadows |
| `--pill-active-ink` | `#12240f` | text on `--leaf` — *deliberately theme-invariant, see style.css:37* |

**Dark theme** (`@media (prefers-color-scheme: dark)` + `:root[data-theme="dark"]`, style.css:47–88) redefines every token above — never add a color that only exists in one theme block.

### Domain colors (workspace pages only)

Set via `[data-domain="…"]` attribute selectors (style.css:621–627) — each domain maps to one existing brand token, never a new hue:

`climate → --leaf` · `health → --coral` · `education → --sun` · `civic → --twine` · `hardware → --forest` · `ai → --forest-deep` · `design → --leaf-bright`

### Motion

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(.23,1,.32,1)` | default — presses, entrances, hovers |
| `--ease-in-out` | `cubic-bezier(.77,0,.175,1)` | slow ambient morphs (vine leaf grow-in) — never for UI feedback |

Rules that hold sitewide (don't relitigate per component):
- Every pressable element gets `:active{ transform:scale(.95–.97) }`.
- Every focusable element gets `outline:3px solid var(--sun)` on `:focus-visible`.
- Hover-only motion is gated behind `@media (hover:hover) and (pointer:fine)` so touch doesn't get stuck "hover" states.
- `prefers-reduced-motion` is respected everywhere motion exists — never remove this when adding a new animated element.

### Type

Three faces, self-hosted as variable woff2 (`public/fonts/`):

| Face | Role | Stack |
|---|---|---|
| **Fraunces Var** | Display — all headings, card titles, stamps | `'Fraunces Var', 'Iowan Old Style', Georgia, serif` |
| **Jost Var** | Body | `'Jost Var', 'Century Gothic', 'Avenir Next', system-ui, sans-serif` |
| **Caveat Var** | Script accent — kickers, hand-touches, never body copy | `'Caveat Var', 'Segoe Print', cursive` |

Tracking is **size-tiered**, not one fixed value (style.css:125–140): the bigger the heading, the more negative the letter-spacing. Hero h1 (largest) is `-.025em`; section h2 is `-.02em`; the base h1–h3 rule is `-.01em`; h4 (smallest headings) is `-.005em`. A new large display heading should get its own tier following this curve, not inherit the base `-.01em`.

### Spacing & shape

No formal spacing scale token — spacing is authored per-component in `px`/`rem`, generally on an ~4–8px rhythm. Two shape languages coexist by design (see [Two Visual Worlds](#two-visual-worlds)): homepage radii are small and irregular (`2px`–`10px`, often paired with a `--tilt` rotation); workspace-page radii are larger and consistent (`14px`–`18px`, no rotation). Match the radius language to whichever world the new element lives in.

## Component patterns

Class names are reused verbatim across pages — build new UI by composing these, not new one-off classes, unless the pattern is genuinely new.

| Pattern | Class(es) | Where | Notes |
|---|---|---|---|
| Button | `.btn` + `.btn-stamp` \| `.btn-ghost`, optional `.btn-sm` | sitewide | stamp = filled/primary, ghost = outline/secondary |
| Paper card (homepage) | `.paper-card`, optional `.torn` | homepage | torn = jagged bottom edge via repeating gradient |
| Elevated card (workspace) | `.elevated-card`, optional `.interactive` | Match/Sprint/Notebook | `.interactive` adds the hover-lift; top 4px bar reads `--domain` |
| Tag/chip | `.tag-chip`, optional `.skill` modifier | workspace pages | colored dot from `--domain`; `.skill` variant is neutral |
| Filter/pill toggle | `.filter-chip` or `.pill`, `aria-pressed` | Match filters, intake form | active state = filled `--forest`/`--leaf` |
| Avatar | `.avatar` + `.blob-1`…`.blob-6`, optional `.sm`/`.lg` | workspace pages | generative: conic-gradient + blob border-radius, seeded per name in JS |
| Modal | `dialog#applyModal`, JS toggles `.is-open`/`.closing` | sitewide (shared intake form) | see `main.js` `openModal`/`closeModal` |
| Toast | `.toast`, `.show` toggle | sitewide | `showToast(msg)` in `main.js` |
| Scroll reveal | `.reveal`, `.in-view` toggle | homepage | IntersectionObserver-driven, `main.js` |
| Icon | `.icon` (inline `<svg><use>`) | Match/Sprint | never emoji — see style.css:730 |

## Page inventory

| Page | Purpose | Key sections (by id/class) |
|---|---|---|
| `index.html` | Landing/story | `#problem`, `#solution` (steps + tick/cross deck `#deckCard`), `#for` (keychain), `#connect` (finale). Wrapped in `#growthTrack`, which hosts the scroll-driven SVG vine (`.vine-svg`, built in `main.js`). |
| `match.html` | Browse Build Calls / people | `#callGrid`, `#peopleGrid` — card grids, domain filters |
| `sprint.html` | Kanban-style sprint board | Forming/Building/Shipped columns, `.clock-ring` countdown |
| `notebook.html` | Public process log / feed | `#entryGrid` — masonry card feed |

All four share the same `<header>`, `<footer>`, and `#applyModal` intake form markup.

## Quick reference: making a change without touching component code

- **Retheme the whole site** → edit the color tokens in `src/style.css:19–40` (and their dark-mode counterparts at `:47` / `:69`).
- **Change the type pairing** → swap the `font-family` stack on `h1,h2,h3,h4,.display` (line 131) and/or `body` (line 107); keep the size-tiered tracking scale intact.
- **Change a domain's color** → edit its single line in the `[data-domain="…"]` block (line 621) — never touch the components that consume `--domain`.
- **Add a new workspace page** → copy `match.html`'s `<head>`/header/footer/modal, build content from `.stage` + `.elevated-card` + existing chip/avatar patterns, and add its nav link (search `sprint.html` for every place a nav link is duplicated).
- **Propose a mockup for an existing page** → describe it in terms of the tokens and patterns above; that's what lets it land as a token/CSS diff instead of new components.
