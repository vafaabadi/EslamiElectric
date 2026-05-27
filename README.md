# Eslami Electric

A full-stack bilingual (English / Persian) e-commerce web app for an electrical supplies shop. Built with Express.js, Supabase, and Stripe. Deployed on Vercel.

Native **Android** customer app ([eslami-electric-android](https://github.com/vafaabadi/eslami-electric-android)) � Kotlin, Jetpack Compose.

This project is also maintained as a **portfolio piece** demonstrating production-grade test automation and DevSecOps practices.

[![CI](https://github.com/vafaabadi/EslamiElectric/actions/workflows/ci.yml/badge.svg)](https://github.com/vafaabadi/EslamiElectric/actions/workflows/ci.yml)
[![Security](https://github.com/vafaabadi/EslamiElectric/actions/workflows/security-snyk-zap.yml/badge.svg)](https://github.com/vafaabadi/EslamiElectric/actions/workflows/security-snyk-zap.yml)
[![E2E Tests](https://img.shields.io/badge/E2E%20tests-66%20passing-brightgreen)](https://github.com/vafaabadi/EslamiElectric/actions/workflows/ci.yml)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Testing](#testing)
- [Security Pipeline](#security-pipeline)
- [CI/CD](#cicd)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)

---

## Features

| Feature | Details |
|---|---|
| **Bilingual UI** | Full English and Persian (`/en/`, `/fa/`) locale support, including RTL layout |
| **Product catalogue** | Browse electrical supplies with search and category filtering |
| **Shopping basket** | Persistent basket stored in `localStorage` |
| **Stripe checkout** | Secure card payments via Stripe Checkout (hosted page) |
| **Guest checkout** | No account required — name, email, and delivery address collected at checkout |
| **User accounts** | Register, login, password reset, and profile management via Supabase Auth |
| **Order tracking** | Order history and per-order status page for registered users |
| **Delivery / collection** | Customer selects fulfilment mode at checkout |
| **Rate limiting** | Per-endpoint rate limits on all auth and checkout routes |
| **Email receipts** | Transactional emails via Resend |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js 24, Express.js |
| **Auth & Database** | Supabase (Postgres + Auth) |
| **Payments** | Stripe Checkout |
| **Email** | Resend |
| **Frontend** | Vanilla JS, TailwindCSS |
| **Deployment** | Vercel (serverless functions) |
| **Validation** | Zod |
| **Security** | JWT (`jsonwebtoken`), `bcryptjs`, `express-rate-limit` |

---

## Testing

> This is the main focus of the project from a QA engineering perspective.

### Overview

| | |
|---|---|
| **Framework** | [Playwright](https://playwright.dev/) |
| **Total tests** | **66** across **12 spec files** |
| **Browser** | Chromium (CI), all browsers available locally |
| **Strategy** | All external APIs mocked — no real Stripe or Supabase calls during E2E runs |

### Test Suites

| Spec file | What it covers |
|---|---|
| `smoke.spec.ts` | Core pages load without errors in both locales |
| `pages-loaded.spec.ts` | All route/page combinations render correctly (EN) |
| `pages-loaded-fa.spec.ts` | All route/page combinations render correctly (FA/Persian) |
| `auth-login.spec.ts` | Login form — valid credentials, wrong password, locked account |
| `login-form-validation.spec.ts` | Email format, empty fields, client-side validation errors |
| `basket-and-catalog.spec.ts` | Add to basket, quantity controls, basket persistence |
| `checkout-session-guard.spec.ts` | Session expiry redirect, guest/registered validation, JWT guard |
| `commerce-checkout.spec.ts` | Full checkout flow (mocked Stripe), delivery vs collection |
| `account-area.spec.ts` | Profile page, order history visibility |
| `order-track-and-validation.spec.ts` | Order tracking page, invalid order ID handling |
| `home-nav-extras.spec.ts` | Navigation, locale switching, mobile menu |
| `mobile-locale-shell.spec.ts` | Responsive layout, locale toggle on mobile viewport |

### Key Design Decisions

**Why `page.evaluate()` over `page.addInitScript()` for localStorage seeding**

`addInitScript` re-fires on every navigation, including redirects. This caused a specific bug in session-expiry tests: the stale token was re-seeded after the redirect to `login.html`, causing the post-redirect `toBeNull()` assertion to fail. Using `page.goto('/en/')` + `page.evaluate()` seeds storage exactly once.

**Why all network calls are mocked**

Tests that hit real Stripe or Supabase endpoints are slow, flaky, and create side-effects (test orders in the database, real emails sent). All checkout and auth API calls are intercepted with `page.route()`, making every test deterministic and fast.

**Page Object Model**

Reusable page abstractions live in `tests/e2e/pages/`. Test-scoped helpers (auth, checkout mocks, storage) live in `tests/e2e/helpers/`.

### Running Tests Locally

```bash
# Install dependencies
npm ci

# Install Playwright browsers
npx playwright install --with-deps chromium

# Run all E2E tests (headless)
npm run test:e2e

# Run with browser UI open
npm run test:e2e:ui

# Type-check test files
npm run typecheck:e2e
```

---

## Security Pipeline

Eight security tools run automatically on every push and pull request.

```
Every push / PR
├── npm audit            SCA  — fails on high/critical CVEs in package-lock.json
├── Snyk                 SCA  — dependency vulnerability scan with SARIF output
├── Dependabot           SCA  — weekly automated dependency update PRs
├── CodeQL               SAST — static analysis for JS/TS security patterns
├── OWASP ZAP (baseline) DAST — passive spider scan against the running app
├── TruffleHog           Secrets — full git history scan for leaked credentials
└── Checkov              IaC  — GitHub Actions YAML misconfiguration scan

Nightly (02:00 UTC)
└── OWASP ZAP (full)     DAST — active probe scan (XSS, injection, auth bypass)
```

### What Each Tool Catches

| Tool | Category | Example findings |
|---|---|---|
| **npm audit** | SCA | Known CVE in a direct/transitive npm dependency |
| **Snyk** | SCA | Supply-chain vulnerabilities, licence issues |
| **Dependabot** | SCA | Outdated package versions with available patches |
| **CodeQL** | SAST | SQL injection patterns, prototype pollution, insecure randomness |
| **OWASP ZAP baseline** | DAST | Missing security headers, exposed error details, open redirects |
| **OWASP ZAP full scan** | DAST | Active XSS probes, auth bypass attempts, injection attacks |
| **TruffleHog** | Secrets | API keys, tokens, passwords committed to git history |
| **Checkov** | IaC | Unpinned actions, overly broad workflow permissions |

---

## CI/CD

```
.github/workflows/
├── ci.yml                 npm audit + Playwright E2E  (every push/PR)
├── security-snyk-zap.yml  Snyk SCA + OWASP ZAP baseline  (every push/PR)
├── codeql.yml             CodeQL SAST  (every push/PR + weekly)
├── secret-scanning.yml    TruffleHog  (push to main + PRs)
├── iac-scanning.yml       Checkov  (every push/PR)
├── zap-full-scan.yml      OWASP ZAP full active scan  (nightly 02:00 UTC)
├── sonarcloud.yml         SonarCloud SAST  (manual — setup in progress)
└── stackhawk.yml          StackHawk authenticated DAST  (manual — setup in progress)
```

All workflows use `concurrency` groups with `cancel-in-progress: true` to avoid redundant runs.

---

## Local Setup

**Prerequisites:** Node.js 24+, a Supabase project, a Stripe account.

```bash
# 1. Clone
git clone https://github.com/vafaabadi/EslamiElectric.git
cd EslamiElectric

# 2. Install
npm ci

# 3. Copy and fill in environment variables
cp .env.example .env

# 4. Build TailwindCSS
npm run build

# 5. Start dev server
npm run dev
# → http://localhost:3000/en/
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full list. Required variables:

| Variable | Where to get it |
|---|---|
| `SUPABASE_URL` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API |
| `JWT_SECRET` | Any long random string (`openssl rand -hex 32`) |
| `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard → Webhooks → signing secret |
| `RESEND_API_KEY` | resend.com → API Keys |

---

## Project Structure

```
├── server.js              Express app — all API routes and middleware
├── public/
│   ├── js/                Client-side JS (one file per page)
│   ├── css/               Compiled TailwindCSS
│   └── *.html             Static HTML pages
├── lib/                   Shared server-side utilities
├── config/                Environment and app configuration
├── src/                   TailwindCSS source
├── supabase/migrations/   SQL migration files
├── tests/e2e/
│   ├── *.spec.ts          Test suites (12 files, 66 tests)
│   ├── helpers/           Reusable test utilities (auth, mocks, storage)
│   └── pages/             Page Object Model classes
└── .github/workflows/     8 CI/CD + security workflows
```

---

## Author

Built by a Test Automation Engineer as both a working shop web app and a demonstration of production-quality QA and DevSecOps practices.
