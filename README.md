# Canopy // Collaborative Field Station & Builder Network

[![Canopy Production CI/CD Pipeline](https://github.com/Aarushi-Chatterjee/canopy_main/actions/workflows/ci.yml/badge.svg)](https://github.com/Aarushi-Chatterjee/canopy_main/actions/workflows/ci.yml)
[![Node Version](https://img.shields.io/badge/node-20.x%20%7C%2022.x-brightgreen.svg)](https://nodejs.org)
[![Test Suite](https://img.shields.io/badge/tests-115%20passed%20(100%25)-forest.svg)](https://github.com/Aarushi-Chatterjee/canopy_main/actions)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

> "If we can find love online, why not teammates?"
> Canopy closes the gap between "I have an idea" and "I have a team who can ship it." Matching always terminates in real shipped work rather than endless browsing.

---

## Table of Contents

1. [Product Overview & Architecture](#product-overview--architecture)
2. [The Core Product Loop: Match -> Sprint -> Notebook](#the-core-product-loop-match---sprint---notebook)
3. [Tech Stack](#tech-stack)
4. [Project Directory Layout](#project-directory-layout)
5. [Local Development Setup](#local-development-setup)
6. [Testing Framework](#testing-framework)
   - [Frontend Unit Testing (Vitest)](#frontend-unit-testing-vitest)
   - [Backend API & Security Testing](#backend-api--security-testing)
   - [Unified CI Test Runner](#unified-ci-test-runner)
7. [Production CI/CD Pipeline](#production-cicd-pipeline)
8. [Vercel Deployment & Serverless Gateways](#vercel-deployment--serverless-gateways)
9. [Security & Architectural Invariants](#security--architectural-invariants)
10. [Environment Variables](#environment-variables)
11. [Contributing & Feature Development Rules](#contributing--feature-development-rules)

---

## Product Overview & Architecture

Canopy connects three core groups through high-context, invitation-based collaboration:
- **Builders**: Skilled engineers, designers, and domain specialists with the ability to execute.
- **Problem Holders**: NGOs, labs, and companies with real, scoped challenges and data.
- **Enablers**: Impact investors and sponsors seeking deal flow grounded in shipped proof.

### Symmetric Dual-Tier Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       CANOPY CLIENT                         │
│  Vite Multi-Page Architecture (client/)                     │
│  Pages: index, match, sprint, notebook, apply, login, terms │
│  Client Data Layer: client/src/db.js (fetch + local cache)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                       HTTP / HTTPS (JSON)
                      X-Canopy-Client: web
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    API GATEWAY RUNTIME                      │
│  Express Server (server/index.js)                           │
│  Vercel Serverless Wrappers (api/index.js, api/[...path].js)│
│  Routes: /api/auth, /api/sprints, /api/calls, /api/notebook │
│  Security: HttpOnly Session Cookies, Timing-Safe Founder Key│
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
       PostgreSQL / REST               SMTP / OAuth
               │                              │
┌──────────────▼──────────────┐┌──────────────▼───────────────┐
│     SUPABASE DATASTORE      ││     COMMUNICATIONS & AUTH    │
│  Users, Profiles, Matches   ││  Nodemailer (SMTP Relay)     │
│  Sprints, Calls, Notebook   ││  Google OAuth Provider       │
│  Resilient In-Memory Fallback││  Mythos SDK Metering Engine  │
└─────────────────────────────┘└──────────────────────────────┘
```

---

## The Core Product Loop: Match -> Sprint -> Notebook

1. **Match (`match.html`)**:
   Build an expressive profile without shallow swipe mechanics. Browse active Build Calls and express interest with a short note detailing what you bring. The poster curates who joins.
2. **Sprint (`sprint.html`)**:
   Formed squads enter a focused, time-boxed workspace (2 to 4 weeks with a visible sprint clock), shipping functional prototypes that enter the public Library.
3. **Lab Notebook (`notebook.html`)**:
   The open, ongoing record of field notes, findings, failures, and code snippets. Publishing and branching notebook entries is described as "growing" the community.

---

## Tech Stack

* **Frontend**:
  * Build Tool: **Vite 8**
  * Scripting: **Vanilla ES Modules** (zero framework overhead)
  * Styling: Pure Vanilla CSS Design System with CSS variables and organic typography (Fraunces serif, Jost sans, Caveat accent)
  * Animations: **Anime.js** + SVG procedural vine-growth engine
  * Testing: **Vitest 5**
* **Backend**:
  * Runtime: **Node.js 20+**
  * Gateway: **Express 5**
  * Database & Auth: **Supabase** (PostgreSQL + Auth API) with resilient offline-first store
  * Token Security: **Cryptographic scrypt hashing**, timing-safe secret comparisons, signed JWTs
  * Email Dispatch: **Nodemailer** (Gmail SMTP relay) + isolated test inbox
  * Creator Monetization & Metering: **Mythos SDK**
* **CI/CD & Hosting**:
  * CI/CD: **GitHub Actions** (cross-version Node 20.x & 22.x matrix)
  * Hosting & Edge Routing: **Vercel** serverless functions

---

## Project Directory Layout

```text
canopy_animated/
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI/CD matrix pipeline
├── api/
│   ├── index.js                 # Primary Vercel serverless gateway
│   └── [...path].js             # Wildcard catch-all serverless dispatcher
├── client/
│   ├── index.html               # Canopy homepage with vine animation
│   ├── match.html               # Match sandbox and verified directory
│   ├── sprint.html              # Sprints board and ambient cycle clock
│   ├── notebook.html            # Lab Notebook open research tree
│   ├── login.html               # Field station pass and authentication
│   ├── apply.html               # Intake application form
│   ├── post-call.html           # Build Call submission station
│   ├── terms.html & privacy.html# Legal charters and privacy policies
│   ├── 404.html                 # Canopy 404 recovery page
│   └── src/
│       ├── db.js                # Client API layer and local session manager
│       ├── main.js              # Homepage interactions and vines
│       └── __tests__/           # Vitest frontend test suites
│           ├── setup.js         # Test mocks for localStorage and window
│           ├── db-api.test.js   # HTTP client engine and contract tests
│           ├── db-auth.test.js  # Authentication and OAuth redirect tests
│           └── db-features.test.js # Sprints, calls, and matches tests
├── server/
│   ├── index.js                 # Core Express API gateway
│   ├── config/                  # Supabase client and database readiness
│   ├── routes/                  # Domain routers (auth, sprints, calls, etc.)
│   ├── middleware/              # Auth verification, CSRF, security headers
│   ├── services/                # Email dispatch and transactional mail
│   ├── data/                    # Resilient in-memory datastore
│   └── tests/                   # Backend Node test runner suites
│       ├── run-all.js           # Consolidated backend suite runner
│       ├── auth-login.test.js   # Cryptographic authentication test suite
│       └── api-endpoints.test.js# Complete API gateway and system test suite
├── package.json                 # Project scripts and dependencies
├── vite.config.mjs              # Multi-page build and Vitest configuration
└── vercel.json                  # Serverless function routing and rewrite rules
```

---

## Local Development Setup

### 1. Prerequisites
* **Node.js**: v20.0.0 or higher
* **npm**: v10.0.0 or higher
* **Git**

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Aarushi-Chatterjee/canopy_main.git
cd canopy_main

# Install dependencies
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (based on `.env.example`):
```env
PORT=3001
NODE_ENV=development

# Supabase Credentials (optional in local mode; fallback store is active)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# Security & Secrets
JWT_SECRET=your_jwt_secret_at_least_32_chars_long
FOUNDER_CONSOLE_KEY=your_founder_access_key
FOUNDER_EMAILS=founder@canopy.test

# Mythos Session Secret
MYTHOS_SESSION_SECRET=your_base64_encoded_32_byte_secret

# Email Dispatch
EMAIL_PROVIDER=test # Use 'test' for development or 'smtp' for live email
```

### 4. Running Locally
```bash
# Start both Express backend (port 3001) and Vite frontend (port 5173) concurrently
npm run dev

# Or start services individually:
npm run server         # Backend API Gateway on http://localhost:3001
npm run dev:vite-only  # Frontend dev server on http://localhost:5173
```

---

## Testing Framework

Canopy enforces a strict testing standard across both tiers. No code is committed or pushed unless all tests pass.

```
Total Test Coverage: 115 Automated Tests (100% Green)
├── Frontend (Vitest): 32 Tests
└── Backend (Node Test Runner): 83 Tests
```

### Frontend Unit Testing (Vitest)
Executes modern unit tests against the client data layer (`client/src/db.js`):
```bash
npm run test:frontend
```
* **API Client Tests (`db-api.test.js`)**: Validates `{ ok, data }` and `{ ok, code, message }` contract, CSRF headers, Authorization headers, and timeout handling.
* **Auth Tests (`db-auth.test.js`)**: Tests registration, OTP verification, Google OAuth redirect URL calculation, federated tokens, and session purge.
* **Feature Tests (`db-features.test.js`)**: Tests Matches, Sprints, Build Calls, Lab Notebook branching, and Applications intake adapters.

### Backend API & Security Testing
Runs live HTTP integration tests against isolated in-memory test instances:
```bash
npm run test:backend

# Or run individual backend suites:
npm run test:auth      # 45 Authentication, OTP, and OAuth tests
npm run test:api       # 38 RBAC, CSRF, moderation, rate limiting, and GDPR tests
```

### Unified CI Test Runner
Executes the production build and all test suites sequentially:
```bash
npm run ci
```

---

## Production CI/CD Pipeline

The GitHub Actions pipeline (`.github/workflows/ci.yml`) runs on every push and pull request to the `main` branch:

```yaml
Matrix:
  - Node.js 20.x on ubuntu-latest
  - Node.js 22.x on ubuntu-latest

Pipeline Stages:
  1. actions/checkout@v4
  2. actions/setup-node@v4 (with npm caching)
  3. npm ci
  4. npm run test:frontend (Vitest)
  5. npm run test:backend  (Auth + API Gateway suites)
  6. npm run build         (Vite production bundle)
  7. Verification of all distribution HTML entrypoints in dist/
  8. ci-gatekeeper: Validates green status across all matrix jobs
```

---

## Vercel Deployment & Serverless Gateways

Canopy deploys to Vercel as a hybrid application:
* **Static Assets**: Vite multi-page outputs compiled to `dist/`.
* **Serverless Functions**: Mounted under `api/index.js` and `api/[...path].js`.
* **Path Rewriting**: `api/index.js` dynamically unpackages headers (`x-matched-path`, `x-forwarded-uri`) to restore express query parameters and prevent 404 errors on OAuth callback routes (`/api/auth/oauth/callback` and `/api/auth/me`).

To preview the production bundle locally:
```bash
npm run build
npm run preview
```

---

## Security & Architectural Invariants

1. **HttpOnly Session Cookies**:
   Authentication tokens are set with `HttpOnly`, `SameSite=Lax`, and `Secure` (in production) to eliminate client-side token exposure to XSS.
2. **CSRF Defense**:
   All state-mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) require the `X-Canopy-Client: web` header. Requests failing this check are rejected with `403 Forbidden`.
3. **Enterprise Security Headers**:
   Responses include Content Security Policy (CSP), `X-Content-Type-Options: nosniff`, and `X-Frame-Options: SAMEORIGIN`.
4. **Timing-Safe Founder Console**:
   The Founder Station (`/admin`) is gated with `crypto.timingSafeEqual` comparison to defeat side-channel timing attacks. URL parameters like `?key=` are strictly prohibited to prevent credential leaks in browser logs.
5. **GDPR Compliance**:
   Complete data portability (`GET /api/privacy/export` or `GET /api/auth/export`) and irreversible account deletion (`DELETE /api/auth/me`) are implemented with immediate session revocation.
6. **No Artificial Em Dashes**:
   All user-facing copy and documentation strictly avoid em dashes, using colons, parentheses, or spaced hyphens instead.

---

## Environment Variables

| Variable | Required | Default / Test Fallback | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | No | `3001` | Express backend listening port |
| `NODE_ENV` | Yes | `development` | Environment mode (`development`, `test`, `production`) |
| `SUPABASE_URL` | No | Fallback store active | Supabase project URL |
| `SUPABASE_ANON_KEY` | No | Fallback store active | Supabase public API key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | None | Secret key for PostgreSQL RLS bypass |
| `JWT_SECRET` | Yes | 32+ char secret | Secret key used to sign and verify user JWTs |
| `FOUNDER_CONSOLE_KEY` | Yes | Secure secret | Passcode required to unlock `/admin` |
| `FOUNDER_EMAILS` | Yes | Listed emails | Comma-delimited list of verified founder addresses |
| `MYTHOS_SESSION_SECRET` | Yes | Auto-generated in prod | Base64 32-byte secret for Mythos session tokens |
| `EMAIL_PROVIDER` | No | `console` / `test` | Active mail service (`test`, `smtp`, `console`, `resend`) |

---

## Contributing & Feature Development Rules

Whenever introducing a new page, feature, or API endpoint:
1. **Frontend Testing**: Create unit tests in `client/src/__tests__/` covering client data adapters and UI state.
2. **Backend Testing**: Add endpoint tests in `server/tests/api-endpoints.test.js` validating authentication gates, inputs, and response structures.
3. **Pre-Push Validation**: Always run `npm run ci` locally first:
   ```bash
   npm run ci
   ```
4. **Zero Tolerance for Broken Builds**: Only stage, commit, and push once `npm run ci` completes with exit code 0.

---

## License

This project is licensed under the ISC License.
