# FlowCRM — Multi-User B2B Sales & Pipeline Management Platform

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![React](https://img.shields.io/badge/React-18.3-61DAFB)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38BDF8)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20RLS-3ECF8E)

FlowCRM is a portfolio-grade, production-ready Customer Relationship Management (CRM) platform engineered for small businesses, sales teams, freelancers, and service agencies. It combines multi-tenant workspace isolation, database-level Row-Level Security (RLS), full bilingual English/Arabic internationalization with native RTL support, an interactive drag-and-drop Kanban pipeline, real-time KPI metrics, and sanitized CSV reporting.

---

## 1. Product Overview

FlowCRM provides a centralized, secure operating system for customer relationships:
- **Unified Account Directory**: Complete contact cards with phone, email, company, job title, internal notes, and linked opportunity tracking.
- **Interactive Sales Pipeline**: Visual Kanban board across 6 customizable stages (`New Lead`, `Qualified`, `Proposal Sent`, `Negotiation`, `Closed Won`, `Closed Lost`) with drag-and-drop support and keyboard-accessible stage selectors.
- **Actionable Tasks & Due Dates**: Follow-up task scheduler highlighting due today and overdue outreach items.
- **Audit Activity Feed**: Chronological interaction timeline logging phone calls, emails, meetings, notes, and automated pipeline stage transitions.
- **Data-Derived Sales Analytics**: Live calculated KPIs (Total Contacts, Active Deals, Open Pipeline Value, Win Rate %, Won Revenue) and distribution charts.
- **Bilingual Interface**: Full Arabic (RTL) and English (LTR) language switching with persistent locale and native typography (`IBM Plex Sans Arabic` & `Inter`).
- **Two Operating Modes**:
  1. *Connected Supabase Mode*: Live PostgreSQL backend with strict Row-Level Security policies.
  2. *Isolated Interactive Demo Mode*: Realistic synthetic data provider allowing immediate testing and evaluation without database credentials.

---

## 2. Technology Stack

- **Frontend**:
  - React 18 & TypeScript (strict mode enabled)
  - Vite 5 with code splitting and rollup vendor chunking
  - Tailwind CSS 3.4 with custom B2B design tokens:
    - Deep Charcoal: `#101318`
    - Warm Gold Accent: `#C9A961`
    - Pale Gold: `#E7D3A0`
  - React Router v6 for protected routing and public authentication guards
  - Lucide React for consistent icon design
  - Recharts for data-driven pipeline stage distribution visualizations
- **Backend & Database**:
  - Supabase Auth (Email & Password, Session management)
  - Supabase PostgreSQL with 7 normalized relational tables
  - Row-Level Security (RLS) policies on every exposed table
  - Security Definer helper functions to eliminate recursive policy queries
  - Database migrations in `supabase/migrations/`
  - SQL authorization test suite in `supabase/tests/`
- **Testing & Verification**:
  - Vitest test runner
  - React Testing Library & jsdom
  - Chrome DevTools automated browser testing

---

## 3. Architecture & Project Layout

```
FlowCRM/
├── index.html                    # Application HTML shell with web fonts
├── package.json                  # Dependencies and execution scripts
├── tsconfig.json                 # Strict TypeScript configuration
├── vite.config.ts                # Vite build and Vitest configuration
├── tailwind.config.js            # Tailwind tokens (Charcoal & Gold palette)
├── .env.example                  # Environment configuration template
├── supabase/
│   ├── migrations/
│   │   └── 20261017000000_flowcrm_core_schema.sql  # Core DDL, triggers, RLS policies
│   └── tests/
│       └── rls_security_test.sql                   # SQL authorization tests
└── src/
    ├── types/
    │   ├── database.types.ts     # PostgreSQL schema TypeScript types
    │   └── crm.types.ts          # Domain models and enriched relations
    ├── lib/
    │   ├── supabase.ts           # Supabase client with config validation
    │   ├── utils.ts              # Currency, date, and task calculation helpers
    │   └── csv.ts                # Sanitized CSV generation (CWE-1236 immune)
    ├── i18n/
    │   ├── en.ts                 # English dictionary
    │   ├── ar.ts                 # Arabic dictionary
    │   └── I18nContext.tsx       # Dynamic locale & document direction provider
    ├── services/
    │   ├── authService.ts        # Supabase Auth & Demo session engine
    │   ├── crmService.ts         # Unified CRM data gateway
    │   └── demoData.ts           # Realistic synthetic dataset
    ├── context/
    │   ├── AuthContext.tsx       # Session state and auth methods
    │   └── CRMContext.tsx        # CRM records state and synchronization
    ├── components/
    │   ├── common/               # Button, Input, Modal, Badge, Card, Skeleton
    │   └── layout/               # AppLayout, Sidebar, Header, MobileNav
    ├── features/
    │   ├── auth/                 # SignIn, SignUp, ResetPassword
    │   ├── dashboard/            # DashboardPage, MetricCard, PipelineChart
    │   ├── contacts/             # ContactsPage, ContactFormModal, ContactDetailModal
    │   ├── deals/                # DealsKanbanPage, KanbanColumn, DealCard, DealFormModal
    │   ├── tasks/                # TasksPage, TaskFormModal
    │   ├── activities/           # ActivitiesPage, ActivityFormModal
    │   ├── reports/              # ReportsPage
    │   └── settings/             # SettingsPage
    └── tests/
        ├── calculations.test.ts  # Task overdue & pipeline metric tests
        ├── csv.test.ts           # Formula injection protection tests
        ├── permissions.test.ts   # RBAC permission matrix tests
        └── i18n.test.ts          # Bilingual key parity tests
```

---

## 4. Database Schema & Security Architecture

### Relational Schema (PostgreSQL)

| Table | Primary Key | Foreign Keys | Key Columns |
| :--- | :--- | :--- | :--- |
| `workspaces` | `id` (UUID) | — | `name`, `slug`, `created_at` |
| `profiles` | `id` (UUID) | `auth.users(id)` | `email`, `full_name`, `avatar_url` |
| `workspace_members` | `id` (UUID) | `workspaces(id)`, `profiles(id)` | `role` (`owner`, `admin`, `manager`, `sales_rep`) |
| `contacts` | `id` (UUID) | `workspaces(id)`, `profiles(id)` | `full_name`, `email`, `phone`, `company`, `status`, `lead_source` |
| `deals` | `id` (UUID) | `workspaces(id)`, `contacts(id)`, `profiles(id)` | `title`, `value`, `currency`, `stage`, `expected_close_date` |
| `tasks` | `id` (UUID) | `workspaces(id)`, `contacts(id)`, `deals(id)` | `title`, `description`, `due_date`, `priority`, `status` |
| `activities` | `id` (UUID) | `workspaces(id)`, `contacts(id)`, `deals(id)` | `type`, `description`, `occurred_at` |

### Row-Level Security (RLS)

All 7 tables have Row-Level Security enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).

Key policies:
1. **Multi-Tenant Isolation**: Records are accessible only if the requesting user belongs to the workspace (`is_workspace_member(workspace_id, auth.uid())`).
2. **Non-Recursive Membership Verification**: PostgreSQL `SECURITY DEFINER STABLE` functions avoid recursive RLS query deadlocks.
3. **Cross-Workspace Reference Validation**: When creating deals or tasks linked to contacts, policies enforce that the contact belongs to the exact same workspace.
4. **Privilege Escalation Prevention**: Non-admin users cannot promote themselves or modify roles in `workspace_members`.
5. **Role-Based Deletion**: Record deletions are restricted to `owner`, `admin`, and `manager` roles.

---

## 5. Security & Safety Practices

- **Zero Secret Exposure**: The frontend client uses only `VITE_SUPABASE_PUBLISHABLE_KEY` (anonymous public key). Service role credentials are never exposed.
- **Spreadsheet Formula Injection Protection (CWE-1236)**: Exported CSV records starting with dangerous formula characters (`=`, `+`, `-`, `@`, `\t`, `\r`) are automatically prepended with a single quote `'` and wrapped in RFC 4180 quotes.
- **UTF-8 BOM Header**: CSV downloads include `\uFEFF` byte order marks to ensure Arabic characters open correctly in Excel and other spreadsheet software without character corruption.
- **Input Validation**: Both frontend forms and database constraints enforce required formats, non-negative deal values, and valid enum states.

---

## 6. Installation & Quick Start

### Prerequisites
- Node.js 18+ (tested on Node.js 24)
- npm 9+

### 1. Clone & Install
```bash
git clone <repository-url>
cd FlowCRM
npm install
```

### 2. Configure Environment (Optional for Supabase)
Copy the example environment file:
```bash
cp .env.example .env
```
Open `.env` and configure your Supabase project keys:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-anon-key-here
```
> **Note**: If `.env` is omitted or contains placeholder values, FlowCRM automatically launches in **Isolated Demo Mode** with realistic data.

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 7. Supabase Database Setup & Migrations

To provision a live Supabase backend:

1. Create a project in [Supabase Dashboard](https://database.new).
2. Go to **SQL Editor** in your Supabase project.
3. Open `supabase/migrations/20261017000000_flowcrm_core_schema.sql` and run the script.
4. Enable Email Auth in **Authentication > Providers > Email**.
5. Add your app URL (e.g. `http://localhost:5173` or your production domain) under **Authentication > URL Configuration > Redirect URLs**.
6. Retrieve your Project URL and Anonymous Public Key from **Project Settings > API**, and add them to your `.env` file.

---

## 8. Verification & Test Commands

### Run Automated Tests
```bash
npm test
```
Executes all 14 tests across calculations, CSV sanitization, permissions matrix, and bilingual i18n parity.

### Run TypeScript Type Check
```bash
npx tsc --noEmit
```
Performs strict compiler verification with zero emitted errors.

### Build for Production
```bash
npm run build
```
Generates optimized distribution assets in `dist/`.

### Run Production Preview
```bash
npm run preview
```

---

## 9. Deployment Instructions

### Vercel Deployment
1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Environment Variables:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase Anon Key
6. Click **Deploy**.

---

## 10. Known Limitations

- Real-time WebSocket subscriptions require Supabase Realtime publication configuration on the target PostgreSQL tables.
- File attachments for contact cards (such as PDF contracts) require a Supabase Storage bucket (`crm-attachments`) configured with appropriate storage RLS policies.
