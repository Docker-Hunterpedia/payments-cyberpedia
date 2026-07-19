# Cyberpedia Payments — Idea & Specification

A small, self-hosted payment **collection & tracking** platform for courses.
It does **not** process payments online — admins and accounters record payments
that were collected by hand (cash, bank transfer, wallet, …), and the platform
gives structure, follow-up, and analytics on top of that.

> **Design principles:** simple, clean, and **mobile-first**. Most daily usage
> (recording a payment, checking who hasn't paid) happens on a phone.

---

## 1. The Problem

- Many courses, each with a different price and different installment options
  (full payment, 2 payments, 3 payments, …).
- Each course can have **multiple teachers**, each compensated differently
  (percentage of collections, fixed amount per course, or fixed amount per session).
- Money is collected manually in **multiple currencies** through **multiple
  payment methods**, and today there is no single place to see who paid what,
  who still owes, and what the real net profit is.

## 2. The Solution

One platform where:

- **Admin** manages everything: courses, plans, teachers, discounts, users,
  currencies, payment methods, general income/expenses — and sees full analytics
  (income, outcome, net profit, outstanding).
- **Accounter** handles the daily flow: add students, enroll them, record
  payments, apply discounts, grant the full-free badge, and — most importantly —
  see exactly **which student has not paid which installment yet**.

---

## 3. Roles & Permissions

| Capability | Admin | Accounter |
|---|---|---|
| Record payments (course → student → installment → method) | ✅ | ✅ |
| Add students & enroll them into courses | ✅ | ✅ |
| Apply admin-defined discounts (fixed amount + reason) | ✅ | ✅ |
| Grant **full-free** badge for a student in a specific course | ✅ | ✅ |
| View unpaid / overdue installments | ✅ | ✅ |
| Manage courses, payment plans, teachers & compensation | ✅ | ❌ |
| Define discounts (name/reason + fixed amount) | ✅ | ❌ |
| General income & expenses (not related to courses) | ✅ | ❌ |
| Teacher payouts | ✅ | ❌ |
| Full analytics (income, outcome, net profit) | ✅ | ❌ |
| Manage users (create/deactivate accounters, reset passwords) | ✅ | ❌ |
| Manage currencies, exchange rates, payment methods | ✅ | ❌ |

Users are managed by the admin — any number of admin/accounter accounts,
with activate/deactivate and password reset.

---

## 4. Core Concepts & Data Model

### Course
- Name, description, status (active / archived).
- **Price** (amount + currency).
- **Sessions count** — defined on the course plan; used to compute
  per-session teacher payouts (no session log or calendar in v1).
- One or more **payment plan templates**.
- One or more **teachers**, each with a compensation rule.

### Payment Plan Template (per course)
- e.g. "Full payment", "2 installments", "3 installments".
- Each plan = ordered installments: sequence, amount, due date
  (as *days after enrollment*, so plans work for any start date).
- On enrollment the admin/accounter **picks a plan and can override** amounts
  and due dates for that specific student (per-student flexibility on top of
  course templates).

### Teacher & Compensation
A teacher is linked to a course with exactly one compensation rule:

| Type | Meaning | Computation |
|---|---|---|
| `PERCENTAGE` | % of what that course actually collects | collected × percent |
| `FIXED_COURSE` | fixed amount for the whole course | fixed amount |
| `FIXED_SESSION` | fixed amount per session | rate × course sessions count |

The platform shows each teacher's **earned** total (computed) vs **paid out**
total (recorded payouts), and the remaining balance. Teacher payouts count as
**outcome** in analytics when they are paid.

### Student
- **Name, email, and phone number are all mandatory.**
- A student can be enrolled in many courses.

### Enrollment (student ↔ course)
- Chosen payment plan (from templates, with optional per-student overrides).
- Optional **discount**: picked from admin-defined discounts — a **fixed
  amount** (never a percentage) with a reason. The discount reduces the total due.
- Optional **full-free badge**: the student pays nothing for this course.
  Recorded with who granted it and when. Free enrollments are excluded from
  expected-income numbers but visible everywhere else.
- Generates its concrete **installments** (seq, amount due, due date), each with
  a derived status: `PAID`, `PARTIAL`, `UNPAID`, `OVERDUE`.

### Payment Transaction
- Linked to an enrollment and (normally) a specific installment
  ("this is the 1st / 2nd / 3rd payment").
- Amount + **currency** + **exchange-rate snapshot** (see §5).
- **Payment method** — from an admin-defined list (Cash, Bank transfer, …).
- Date, recorded-by (user), optional note.

### General Ledger (admin only, not related to courses)
- Simple **income / expense** entries: type, category, amount + currency,
  date, note. Used for rent, salaries, ads, or any non-course income.

### Discount Definition (admin)
- Name/reason + fixed amount (+ currency), active flag.
  Accounters pick from this list; they don't invent amounts.

---

## 5. Multi-Currency (separate cash boxes — nothing converted)

- Admin defines the **currencies** in use. There are **no exchange rates** in
  the system: money is stored and reported exactly in the currency it was
  received in, like separate physical cash boxes.
- **A payment can be received in any active currency** — even for a course
  priced in another one (e.g. a USD course paid partly in SYP, partly in EUR).
  Each payment stores the amount actually received in its own currency *and*
  a manual **"counts as"** amount — how much of the installment it covers in
  the course currency, decided by the person recording it. Installment math
  uses the applied amount; per-currency analytics use the real received money.
- Analytics show **one box per currency** (income, outcome, net, outstanding),
  never a converted grand total.

---

## 6. Key Flows

### Record a payment (the everyday flow — must be fast on a phone)
1. Select **course** →
2. Select existing **student** or **add a new one** (name, email, phone — all
   mandatory) and enroll them (pick plan, optional discount / free badge) →
3. Select **which installment** this payment is for (1st, 2nd, …) →
4. Select **payment method**, confirm amount & currency →
5. Save. Installment status updates immediately.

### Follow up unpaid students (accounter's main screen)
- List of unpaid/overdue installments across all courses.
- Filters: course, installment number, status (due soon / overdue), date range.
- Search by student name or phone. One tap shows the student's phone to call.

### Analytics (admin)
- **Income** (course collections + other income), **Outcome** (expenses +
  teacher payouts), **Net profit** — all in base currency.
- Filters: date range, course, teacher, payment method, currency.
- Per-course view: expected vs collected vs outstanding, teacher cost, margin.
- Per-teacher view: earned vs paid out vs balance.

---

## 7. Screens (mobile-first)

| Screen | Admin | Accounter |
|---|---|---|
| Login | ✅ | ✅ |
| Dashboard (KPIs: collected, outstanding, overdue; recent activity) | full | limited (no profit numbers) |
| Record payment (wizard) | ✅ | ✅ |
| Unpaid / overdue list | ✅ | ✅ |
| Students (list, detail: enrollments + history + outstanding) | ✅ | ✅ |
| Courses (list, detail: plans, teachers, collected vs expected) | manage | view |
| Teachers (earnings, payouts) | ✅ | ❌ |
| Income / Expenses | ✅ | ❌ |
| Analytics | ✅ | ❌ |
| Settings (users, methods, discounts, currencies & rates) | ✅ | ❌ |

Mobile-first means: bottom navigation on phones, large touch targets,
wizard-style multi-step forms instead of giant forms, sticky action buttons,
tables collapse into cards on small screens.

---

## 8. Tech Stack & Architecture

**Monorepo (pnpm workspaces), self-hosted, deployed with Dokploy.**

```
payments-cyberpedia/
├── apps/
│   ├── web/        # Vite + React + TypeScript
│   └── api/        # NestJS (Express platform) + TypeScript
├── packages/
│   └── shared/     # shared types, zod schemas, enums, constants
├── docs/
├── docker-compose.yml          # local dev (PostgreSQL)
└── dokploy / Dockerfiles       # production deploy
```

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Vite + React + TypeScript | mobile-first |
| UI | Tailwind CSS + shadcn/ui | simple, clean, consistent |
| Data fetching | TanStack Query | caching, optimistic updates |
| Forms | react-hook-form + zod | zod schemas shared with API |
| Charts | Recharts | analytics dashboard |
| Backend | NestJS (Express) | modular: auth, users, courses, students, payments, finance, analytics |
| ORM / DB | Prisma + PostgreSQL | migrations from day 1 |
| Auth | JWT (access + refresh), argon2 hashing, role guards | `ADMIN`, `ACCOUNTER` |
| Logging | **pino** everywhere — `nestjs-pino` (pino-http) on the API, pino browser mode on the web app | pretty logs in dev, structured JSON in prod (readable in Dokploy) |
| Deploy | Dokploy: `api` + `web` (static via nginx/caddy) + `postgres` | + scheduled DB backups |

- **English UI only for v1**, structured (i18n-ready) so Arabic/RTL can be
  added later without rework.
- All money stored as integer minor units (e.g. cents) — never floats.

---

## 9. Out of Scope for v1 (backlog)

- Online payment gateway / student-facing checkout (data model stays gateway-ready).
- Arabic / RTL interface.
- Per-session attendance log or scheduling calendar.
- Automated reminders (WhatsApp/SMS/email) for due installments.
- Printable/PDF receipts, CSV/Excel export.
- Student self-service portal.

## 10. Confirmed Decisions

1. Student **name, email, and phone are all mandatory**.
2. Teacher payouts count as **outcome when actually paid** (cash basis), not when earned.
3. Base currency for analytics is **USD**.
4. A discount's fixed amount applies **once per enrollment** (not per installment).
