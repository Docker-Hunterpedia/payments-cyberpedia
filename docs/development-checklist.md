# Development Checklist

Companion to [idea.md](./idea.md). Work top-to-bottom — each phase leaves the
app in a runnable state. Check items off as they land.

---

## Phase 0 — Repo & Tooling

- [x] Init pnpm workspace monorepo (`apps/web`, `apps/api`, `packages/shared`)
- [x] Root TypeScript config + per-app `tsconfig` extending it
- [x] ESLint + Prettier (single root config for all packages)
- [x] `packages/shared`: zod, shared enums (`Role`, `CompensationType`, `InstallmentStatus`, …)
- [x] `docker-compose.yml` for local dev: PostgreSQL (+ volume)
- [x] Root scripts: `dev` (api + web concurrently), `build`, `lint`, `typecheck`
- [x] `.env.example` for api and web
- [x] README: setup instructions

## Phase 1 — Backend Foundation (NestJS + Prisma)

- [x] NestJS app on Express platform; zod validation via `ZodValidationPipe` + shared schemas
- [x] Prisma setup + initial migration; connect to local Postgres
- [x] Config module (env validation)
- [x] Auth module: login (email + password, argon2), JWT access + refresh (with rotation), logout
- [x] Role guard + `@Roles()` decorator (`ADMIN`, `ACCOUNTER`)
- [x] Users module (admin only): CRUD accounters/admins, activate/deactivate, reset password
- [x] Seed script: first admin user
- [x] Logging: **pino** via `nestjs-pino` as the app logger — request logging (pino-http) with request IDs, redaction of sensitive fields (passwords, tokens), `pino-pretty` in dev, structured JSON in prod
- [x] Global error format wired through the pino logger

## Phase 2 — Reference Data (admin settings)

- [x] Currencies: CRUD + base currency setting + rate-to-base (editable)
- [x] Payment methods: CRUD + active flag
- [x] Discount definitions: CRUD (name/reason, fixed amount, currency, active)
- [x] All money fields as integer minor units across schema

## Phase 3 — Courses & Teachers

- [x] Teachers: CRUD (name, phone, email, notes)
- [x] Courses: CRUD (name, description, price + currency, sessions count, status)
- [x] Payment plan templates per course (installments: seq, amount, due-days-from-enrollment)
- [x] Course⟷teacher link with compensation rule (`PERCENTAGE` | `FIXED_COURSE` | `FIXED_SESSION` + value)
- [ ] Course detail endpoint: expected vs collected vs outstanding summary *(needs enrollments + payments — lands with Phase 5)*

## Phase 4 — Students & Enrollments

- [ ] Students: CRUD (name, email, phone — all mandatory), search by name/phone
- [ ] Enroll student in course: pick plan template → generate concrete installments
- [ ] Per-student overrides of installment amounts/due dates at enrollment
- [ ] Apply discount (from definitions) to enrollment, with reason stored
- [ ] Full-free badge: grant/revoke, store who + when; zero out amounts due
- [ ] Guard: no duplicate active enrollment (same student + course)
- [ ] Installment status derivation: `PAID` / `PARTIAL` / `UNPAID` / `OVERDUE`

## Phase 5 — Payments

- [ ] Record payment: enrollment + installment + amount + currency (rate snapshot) + method + date + note + recorded-by
- [ ] Auto-suggest next unpaid installment for the enrollment
- [ ] Edit/void a payment (admin only), with audit fields
- [ ] Unpaid/overdue query: filters (course, installment seq, status, date range) + search (student name/phone)
- [ ] Student payment history endpoint

## Phase 6 — Finance (admin)

- [ ] General ledger: income/expense entries (type, category, amount + currency, date, note)
- [ ] Ledger categories: CRUD
- [ ] Teacher earnings computation per course (all 3 compensation types)
- [ ] Teacher payouts: record payout (amount, currency, date, note); earned vs paid vs balance

## Phase 7 — Analytics (admin)

- [ ] Aggregates in base currency using stored rate snapshots
- [ ] Dashboard endpoint: income, outcome, net profit, outstanding, overdue count (period comparison)
- [ ] Time series: income/outcome per day/week/month
- [ ] Per-course report: expected, collected, outstanding, teacher cost, margin
- [ ] Per-teacher report: earned, paid out, balance
- [ ] Breakdown filters: date range, course, teacher, payment method, currency

## Phase 8 — Frontend Foundation (Vite + React)

- [ ] Vite + React + TS app; Tailwind CSS + shadcn/ui
- [ ] API client + TanStack Query setup (typed via `packages/shared`)
- [ ] Client logging: pino (browser mode) wrapper — replaces ad-hoc `console.log`, silenced/leveled by env
- [ ] Auth: login page, token refresh, protected routes, role-based routing/menus
- [ ] App shell — **mobile-first**: bottom nav (phone) / sidebar (desktop), page headers, sticky primary actions
- [ ] Shared UI: money display (currency-aware), status badges, list⇄card responsive table, empty/loading/error states, toasts, confirm dialogs
- [ ] Form kit: react-hook-form + zod resolvers using shared schemas

## Phase 9 — Frontend Features

- [ ] **Record payment wizard** (course → student [or quick-add + enroll] → installment → method/amount → confirm) — optimize for one-hand phone use
- [ ] Unpaid/overdue screen: filters, search, tap-to-call phone
- [ ] Students: list + search, detail (enrollments, history, outstanding)
- [ ] Courses: list, detail (plans, teachers, money summary); admin manage forms
- [ ] Teachers (admin): list, detail (earnings vs payouts), record payout
- [ ] Income/Expenses (admin): list + quick add
- [ ] Settings (admin): users, payment methods, discounts, currencies & rates
- [ ] Dashboard: role-aware KPI cards + recent activity

## Phase 10 — Analytics UI (admin)

- [ ] KPI cards with period comparison
- [ ] Income vs outcome chart (Recharts), net profit trend
- [ ] Per-course and per-teacher report views
- [ ] Global filters (date range, course, teacher, method, currency) — usable on mobile

## Phase 11 — Polish & Hardening

- [ ] Full pass on phone-sized screens (every screen, every form)
- [ ] Input UX: numeric keyboards for amounts/phones, sensible autofocus
- [ ] Pagination on all lists; debounced search
- [ ] Rate limiting + secure headers (helmet) on API
- [ ] Backend authorization audit: every mutation checked against role matrix in idea.md §3
- [ ] Seed/demo data script for testing
- [ ] Basic e2e smoke: login → enroll → pay → shows in unpaid/analytics

## Phase 12 — Deployment (Dokploy)

- [ ] `apps/api` Dockerfile (multi-stage, prisma migrate deploy on start)
- [ ] `apps/web` Dockerfile (static build served by nginx/caddy)
- [ ] Dokploy project: api + web + PostgreSQL, env vars, domains + HTTPS
- [ ] Automated Postgres backups (Dokploy backup schedule) + restore test
- [ ] Health check endpoint wired into Dokploy
- [ ] Production smoke test on a real phone

## Backlog (post-v1)

- [ ] Payment gateway integration (data model is gateway-ready)
- [ ] Arabic / RTL + i18n switcher
- [ ] Automated due-installment reminders (WhatsApp/SMS/email)
- [ ] PDF receipts, CSV/Excel export
- [ ] Session/attendance log per course
- [ ] Student self-service portal
