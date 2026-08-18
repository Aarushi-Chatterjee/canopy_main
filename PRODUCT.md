# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three roles who currently find each other through scattered, unstructured channels (LinkedIn DMs, Discord servers, university networks, random Slack groups):
- **Builders** — people with technical/creative/domain skills (ML engineers, designers, hardware engineers, researchers) who have the ability to execute but lack a specific problem or team to point it at.
- **Problem Holders** — NGOs, companies, and labs with a real, scoped challenge, no fast way to reach skilled, mission-driven teams, and no time for procurement overhead.
- **Enablers** — impact investors and sponsors who want deal flow grounded in shipped proof rather than forecast slides, and want to scout/mentor teams before they raise.

## Product Purpose

Canopy closes the gap between "I have an idea/problem" and "I have a team who can ship it." It replaces cold, low-context networking with a structured, deliberate path: match with intent, commit to a real time-boxed sprint, and walk away with a shipped, documented artifact.

## Positioning

"If we can find love online, why not teammates?" Canopy is not a swipe-based social network or a generic job board — it is built around high-context, invitation-based matching (a written note of what you'd bring, read and chosen by the poster, not a blind accept/reject) combined with a mandatory time-boxed execution loop (Sprint) and public process transparency (Lab Notebook), so that matching always terminates in real shipped work rather than an endless browse.

## Operating Context

The product loop is three steps, referred to consistently across the site as **Match → Sprint → Notebook**:
1. **Match** — build a profile (domains, skills, collaboration style) with a generative, non-photo avatar; browse Build Calls and People; express interest with a short note ("grab a shovel, not a swipe"); the poster chooses who joins.
2. **Sprint** — a formed team enters a shared workspace (starter repo, sample data, a 2–4 week deadline, a visible sprint clock) and ships a tangible output that enters the public Library.
3. **Notebook** — the open, ongoing record of process (successes, failures, snippets, datasets) that builds credibility and helps others learn; publishing an entry is described as "growing" the library/community.

A secondary surface, the **Problem Marketplace** (tick/cross deck on the homepage), lets builders swipe through posted problems (with domain, reward, dataset access) independently of a specific person-to-person match.

## Capabilities and Constraints

- Current build is a **static, mockup-only** front end (Vite + vanilla JS, no framework). All forms/CTAs open a shared intake modal and explicitly state "no account is created here" / "mockup only."
- Real backend auth (Supabase-based register/login/session/password reset) is planned but not yet built — open item, tracked separately, not blocking front-end/visual work.
- Terminology is fixed and used verbatim across the product: "Build Call," "grab a shovel," "sprint clock," "Lab Notebook," "grow this entry," "the Library," "Problem Marketplace."
- Site currently has 4 pages: `index.html` (homepage, with an illustrated hero + scroll-driven vine-growth animation across Problem/Solution/Who-it's-for/Connect sections), `match.html`, `sprint.html`, `notebook.html` (currently plain long-form article layouts reusing homepage paper-card tokens, and are the ones under active redesign toward a more product-UI feel — homepage's vine/growth-track system is out of scope for that redesign).

## Brand Commitments

- Name: **Canopy**. Founder quote (used in footer): "I kept hearing the same frustration from brilliant people. So I started Canopy to close that gap — one Build Call, one sprint, one shipped project at a time." — Aarushi Chatterjee, Founder.
- Existing type system: **Fraunces** (display serif), **Jost** (body sans), **Caveat** (handwritten/script accent), self-hosted as variable woff2.
- Existing color tokens: `--paper`, `--card`, `--ink`/`--ink-soft`/`--ink-faint`, `--forest`/`--forest-deep`, `--leaf`/`--leaf-bright`, `--sun`, `--coral`, `--twine`, plus a dark theme variant.
- Visual metaphor is organic/growth throughout (sapling → vine → canopy; "grab a shovel"; "grow this entry"; watering-can hero animation) — a durable brand commitment, distinct from any one page's specific visual treatment (paper/torn-card texture is an implementation choice on the homepage, not necessarily binding for every future surface).

## Evidence on Hand

Full verbatim page copy for Match, Sprint, and Lab Notebook (hero copy, section-by-section body copy, and calls to action) already exists in the repo's `match.html`, `sprint.html`, `notebook.html` and was supplied directly by the product owner — this is real content, not placeholder, and must be preserved (rearranged into UI form, not deleted or replaced with placeholder text) through any redesign.

## Product Principles

1. Deliberate over frictionless — every connection point (Match note, Sprint join, Notebook entry) favors a small moment of real intent over one-tap/swipe interaction.
2. Process is proof — the Lab Notebook and shipped Sprint outputs (the Library) are treated as the credibility layer, valued above self-reported credentials.
3. Time-boxed momentum — Sprint's fixed 2–4 week window and visible clock are core to how the product creates follow-through, not an incidental feature.
4. Every role is a peer — Builders, Problem Holders, and Enablers are designed and written about with equal weight; no role is the "customer" and the others secondary.
