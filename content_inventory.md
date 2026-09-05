# Canopy Production Content Inventory & Launch Readiness Register

This inventory serves as Canopy's living source-of-truth register. Every visible platform claim, dataset, workflow, and user interface is audited across required operational standards.

## Status Classifications
- **Real**: Verified, founder-approved, permissioned, and backed by live database persistence.
- **Illustrative**: Clearly labeled example demonstrating product loop mechanics; non-deceptive; disabled from live transactional mutation.
- **Private Beta Only**: Available only to authenticated, approved cohort collaborators.
- **Pending Review**: Queued records awaiting administrator/moderator evaluation before public broadcast.
- **Archived**: Historical records retained for audit but hidden from discovery.

---

## 1. Core Platform Surfaces & Operational Controls

| Surface / Item | Target State | Current State | Launch-Blocking Gap | Owner | Completion Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication & Tokens** | HttpOnly cookie auth; strict 15m OTP expiry; 5-attempt lock; no token leaks in JSON responses | Fully enforced via `server/routes/auth.js` and `server/middleware/auth.js` | None (closed) | Security Lead | Automated test suite verifies cookie auth and rejection of leaked tokens |
| **Email Delivery** | Pluggable Email Service (`console`, `test`, `resend`) with branded OTP & notification templates | Live in `server/services/email.js`; integrated in registration, verification, reset, application, and matching | Production SMTP/Resend API key configuration | Operations Lead | Test mail adapter assertions passing in CI/test runner |
| **Build Call Creation** | Authenticated submissions only; initial status `pending_review`; enqueued to moderation queue | Implemented in `server/routes/calls.js` with `requireAuth` and `moderationQueue` integration | None (closed) | Product Lead | Automated tests confirm unauthenticated 401 and initial `pending_review` state |
| **Moderation Engine** | Operational review queue (`/api/moderation/queue`), approve/reject workflows, immutable audit logging | Implemented in `server/routes/moderation.js` and `server/repositories/moderation-queue.js` | None (closed) | Admin Team | `/api/moderation/review` transitions entity states and logs to `audit_events` |
| **Admin Authorization** | Strictly verified DB role (`admin` or `moderator`); no domain or enabler escalation bypasses | Enforced in `server/middleware/auth.js` (`requireAdmin`) | None (closed) | Security Lead | Test suite verifies escalation denial for `@canopy.earth` and `enabler` roles |
| **Database Persistence** | Supabase PostgreSQL runtime; honest 503 errors on outage in production; no silent local JSON fallback in prod | Enforced in `server/repositories/base.js` with mappers | Supabase production migration apply | Infra Lead | `server/repositories/base.js` throws 503 in production mode on connection failure |
| **CSRF & Security Headers** | CSP headers, `X-Canopy-Client` validation on mutating requests, nosniff, frame denial, 100kb payload limit | Configured in `server/index.js` and `server/middleware/auth.js` | None (closed) | Security Lead | Headers verified on `/api/health` and all API responses |
| **Client Error Safety** | Safe textContent rendering; no raw server error insertion via `innerHTML` | Updated in `apply.html`, `post-call.html`, and `login.html` | None (closed) | Frontend Lead | Zero unescaped `${err.message}` in client innerHTML blocks |

---

## 2. The Single Illustrative Product-Loop Register

Per the One-Example Rule, Canopy maintains exactly one end-to-end illustrative demonstration with explicit visual disclaimers:

| Record Type | Title | Target State | Current State | Launch-Blocking Gap | Owner | Completion Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Build Call** | Groundwater contamination sensor optical probe | Read-only with prominent illustrative notice; application action disabled | Illustrative label rendered; direct mutation blocked | None (closed) | Content Lead | `ExampleNotice` badge displayed on call card and detail view |
| **Sprint Squad** | Groundwater contamination sensor calibration squad | Read-only demonstration of sprint workflow; shovel action disabled | Illustrative badge rendered; join button inactive | None (closed) | Content Lead | Explicit notice rendered in `sprint.html` |
| **Lab Notebook Entry** | Field calibration benchmarks under high turbidity | Read-only post-mortem demonstration; growth action restricted to example branch | Labeled as example post-mortem | None (closed) | Content Lead | Example banner verified in `notebook.html` |

---

## 3. Surface-by-Surface Verification Matrix

| Page / Route | Target State | Current State | Launch-Blocking Gap | Owner | Completion Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Homepage (`index.html`)** | Truthful metrics, live calls feed, responsive layout | Fully functional, connected to `/api/calls` and `/api/health` | None (closed) | Frontend Lead | Page builds and renders verified real statistics |
| **Match Sandbox (`match.html`)** | Vetted builder network; mutual handshake consent; PII protected until acceptance | Protected by authenticated session; contact info withheld until acceptance | None (closed) | Product Lead | Verified connections API test passing |
| **Sprint Board (`sprint.html`)** | Dynamic capacity management; stage progression (`forming` -> `building` -> `shipped`) | Live in `/api/sprints` with repository backing | None (closed) | Product Lead | Squad member join tests passing |
| **Lab Notebook (`notebook.html`)** | Sanitized field notes and branches; XSS prevention | Sanitized inputs in `/api/notebook` | None (closed) | Content Lead | Input sanitization test passing |
| **Intake Form (`apply.html`)** | Honest rolling review timeline; client-side safe error alerts | Updated rolling SLA text; safe DOM alert | None (closed) | Frontend Lead | Form submits to `/api/applications` with `pending_review` |
| **Post Call Form (`post-call.html`)** | Authenticated submission; queues for moderation | Strictly requires sign-in; sets `pending_review` | None (closed) | Frontend Lead | Submission test passing |
| **Field Pass Login (`login.html`)** | Secure 6-digit OTP verification; rate limited; account-enumeration resistant | Full OTP flow with in-memory/email dispatch | None (closed) | Auth Lead | Integration test suite passing |
| **Legal Pages (`privacy.html`, `terms.html`)** | Accurate data controller disclosures, contact info, and GDPR/CCPA rights | Reconciled with architecture | None (closed) | Legal Lead | Reviewed and updated |
