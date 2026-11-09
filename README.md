# FlowCRM — Multi-User B2B Sales & Pipeline Management Platform

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![React](https://img.shields.io/badge/React-18.3-61DAFB)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38BDF8)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20RLS-3ECF8E)

FlowCRM is a portfolio-grade, production-ready Customer Relationship Management (CRM) platform engineered for small businesses, sales teams, freelancers, and service agencies. It combines multi-tenant workspace isolation, database-level Row-Level Security (RLS), full bilingual English/Arabic internationalization with native RTL support, an interactive drag-and-drop Kanban pipeline, real-time KPI metrics, sanitized CSV reporting — and **FlowAI**, a server-side, grounded AI copilot layer (committed to a strict security contract: no browser-held provider keys, no fabricated facts, no unconfirmed writes).

---

## 1. Product Overview

FlowCRM provides a centralized, secure operating system for customer relationships:
- **Unified Account Directory**: Complete contact cards with phone, email, company, job title, internal notes, and linked opportunity tracking.
- **Interactive Sales Pipeline**: Visual Kanban board across 6 customizable stages (`New Lead`, `Qualified`, `Proposal Sent`, `Negotiation`, `Closed Won`, `Closed Lost`) with drag-and-drop support and keyboard-accessible stage selectors.
- **Actionable Tasks & Due Dates**: Follow-up task scheduler highlighting due today and overdue outreach items.
- **Audit Activity Feed**: Chronological interaction timeline logging phone calls, emails, meetings, notes, and automated pipeline stage transitions.
- **Data-Derived Sales Analytics**: Live calculated KPIs (Total Contacts, Active Deals, Open Pipeline Value, Win Rate %, Won Revenue) and distribution charts — computed by ONE shared formula engine used by both the dashboard and the AI layer.
- **FlowAI Intelligence Suite** (see §4):
  - **Copilot drawer** grounded in read-only CRM tools with auditable evidence links.
  - **Deal & Contact Intelligence** panels: rule-based risk signals + optional LLM narrative.
  - **Sales Writer** with verified data only (placeholders + missing-field warnings instead of invented commitments).
  - **Meeting Intelligence** extracting decisions, risks, and *human-approved* task proposals (with explicit due dates).
  - **Natural-Language Analytics** routed to registered metric tools — never generated SQL.
- **Bilingual Interface**: Full Arabic (RTL) and English (LTR) language switching with persistent locale and native typography (`IBM Plex Sans Arabic` & `Inter`).
- **Two Operating Modes**:
  1. *Connected Supabase Mode*: Live PostgreSQL backend with strict Row-Level Security policies and server-side AI via Edge Functions.
  2. *Isolated Interactive Demo Mode*: Realistic synthetic data provider allowing immediate testing and evaluation without database credentials; the entire AI suite runs the identical rule-based engines locally with honest, labeled degradation.

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
  - Supabase PostgreSQL with 7 normalized relational tables + `flowai_usage` quota table
  - Row-Level Security (RLS) policies on every exposed table
  - Security Definer helper functions to eliminate recursive policy queries
  - Database migrations in `supabase/migrations/`
  - SQL authorization test suite in `supabase/tests/`
  - **Supabase Edge Function** `flowai-assistant` (Deno) executing all AI actions *_shared modules imported by both the client and the Deno runtime (single source of truth for tools, prompts, metrics, validation, rate limits).
- **Testing & Verification**:
  - Vitest test runner (74 tests / 11 suites: calculations, CSV sanitization, permissions, i18n parity, UI components, tool registry, adversarial prompt-injection, FlowAI orchestration, cross-runtime shared-engine contract)
  - React Testing Library & jsdom
  - pgTAP SQL authorization suite (`supabase/tests/rls_security_test.sql`)

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
│   │   ├── 20261017000000_flowcrm_core_schema.sql   # Core DDL, triggers, RLS policies
│   │   └── 20261019000000_flowai_security.sql       # flowai_usage table + SECURITY DEFINER quota RPCs (removes user_ai_settings)
│   ├── functions/
│   │   ├── _shared/                                 # Cross-runtime AI engine (imported by client AND edge)
│   │   │   ├── types.ts          # Result shapes, tool registry specs, envelope protocol
│   │   │   ├── prompts.ts        # Versioned prompt templates + untrusted-data fencing
│   │   │   ├── validation.ts     # Server payload + tool-arg validators (Deni-safe, no zod)
│   │   │   ├── gateway.ts        # CRMDataGateway (workspace-scoped row fetcher)
│   │   │   ├── crmTools.ts       # 12 read-only tools + executeSharedTool dispatcher
│   │   │   ├── metrics.ts        # Authoritative KPI/period/day-boundary formulas
│   │   │   ├── copilotEngine.ts  # Deterministic router + LLM tool selection + synthesis
│   │   │   ├── intelligenceEngine.ts # Deal/contact rule signals + optional LLM narrative
│   │   │   ├── analyticsEngine.ts    # NL analytics intents (registered tools only)
│   │   │   ├── writerRules.ts    # Offline grounded draft templates
│   │   │   ├── meetingEngine.ts  # Meeting extraction + honest unavailability refusal
│   │   │   ├── providerAdapter.ts    # Gemini/OpenAI adapter (timeouts, retries, JSON mode)
│   │   │   └── rateLimiter.ts    # Quota rails + cost estimation
│   │   └── flowai-assistant/
│   │       └── index.ts          # Consolidated edge gateway (auth, quotas, actions)
│   └── tests/
│       └── rls_security_test.sql                   # SQL authorization tests (pgTAP)
└── src/
    ├── types/
    │   ├── database.types.ts     # PostgreSQL schema TypeScript types
    │   └── crm.types.ts          # Domain models and enriched relations
    ├── lib/
    │   ├── supabase.ts           # Supabase client with config validation
    │   ├── utils.ts              # Currency, date, task-day helpers (delegating to shared metrics)
    │   └── csv.ts                # Sanitized CSV generation (CWE-1236 immune)
    ├── i18n/
    │   ├── en.ts                 # English dictionary
    │   ├── ar.ts                 # Arabic dictionary
    │   └── I18nContext.tsx       # Dynamic locale & document direction provider
    ├── services/
    │   ├── authService.ts        # Supabase Auth & Demo session engine
    │   ├── crmService.ts         # Unified CRM data gateway (metrics via shared engine)
    │   ├── edgeGateway.ts        # Authenticated transport to the FlowAI edge function
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
    │   ├── settings/             # SettingsPage
    │   └── ai/                   # FlowAI suite
    │       ├── components/       # FlowAICopilot, AISalesWriterModal, MeetingIntelligenceModal,
    │       │                     # ContactAIPanel, DealAIPanel, NLAnalyticsSection,
    │       │                     # AISettingsSection (gateway status + usage), EvidenceCitation…
    │       ├── services/         # flowAIService (transport dispatcher), toolRegistry, localGateway
    │       ├── types/            # ai.types.ts (re-exports shared types + client UI types)
    │       └── prompts/          # Thin re-export of _shared/prompts (single source of truth)
    └── tests/                    # 11 suites / 74 tests (see §9)
```

---

## 4. FlowAI — Server-Side, Grounded AI Layer

FlowCRM embeds an AI copilot that is **grounded in your CRM data, audit-friendly, and write-safe**. Its defining property is a *single shared engine*: the exact same tool implementations, prompts, metrics formulas, validators, and rate-limit rails run in the browser (demo mode) and inside a Deno Edge Function (connected mode), via pure cross-runtime modules in `supabase/functions/_shared/`.

### Request Flow (Connected Mode)

```
React (FlowAICopilot / panels)
   │  fetch() + user JWT + apikey      ← src/services/edgeGateway.ts
   ▼
Edge Function  flowai-assistant  (Deno)
   ├── 1. authenticate user JWT (supabase.auth.getUser)          → 401 unauthorized
   ├── 2. validate payload (size, shape, locale, action)          → 400 bad_request / 413 payload_too_large
   ├── 3. consume quota via SECURITY DEFINER RPC (service role)   → 429 rate_limited
   │        consume_flowai_usage(workspace_id, user_id, tokens_estimate)
   ├── 4. build CRMDataGateway with a USER-JWT client             → RLS enforced, reads stay tenant-scoped
   ├── 5. execute action through the shared engine (_shared/*)
   ├── 6. optional provider call (Gemini / OpenAI) with timeout + retry + JSON extraction
   └── 7. record usage tokens via RPC, return normalized envelope
   ▼
{ ok: true, data, meta: { engine, promptVersion, tool?, unconfigured? } }
{ ok: false, error: { code, message } }
```

Error codes: `unauthorized`, `forbidden`, `bad_request`, `payload_too_large`, `rate_limited`, `not_configured`, `upstream_error`, `internal` (plus client-side `network` / `aborted` surfaced by the edge gateway).

### Actions

| Action | Purpose |
| :--- | :--- |
| `copilot` | Ask-the-data chat: deterministic router → registered tool → grounded answer (LLM synthesis optional) |
| `sales-draft` | Emails / proposals / follow-ups with verified numbers only; missing fields become explicit placeholders |
| `deal-insight` | Rule-based risk signals (stagnation, slip, erosion) + optional LLM narrative with evidence |
| `contact-insight` | Lead-readiness assessment with data-gap warnings (no invented contact facts) |
| `meeting-notes` | Meeting → decisions / risks / *proposed* tasks requiring human confirmation with explicit due dates |
| `analytics` | Natural-language questions routed to registered metric tools (never generated SQL) |
| `status` | Gateway capability report (provider configured? model? limits?) |

### The 12 Registered Read-Only Tools

`get_workflow_overview`, `search_contacts`, `search_deals`, `search_tasks`, `get_contact_timeline`, `get_deal_detail`, `get_dashboard_metrics`, `get_pipeline_stage_breakdown`, `get_won_deals_period`, `get_contact_sources`, `get_overdue_by_assignee`, `compare_time_windows`.

Every tool result carries localized **GroundedEvidence** (record IDs + types) that the UI renders as clickable citations, so each claim in an AI answer can be traced back to a real row.

### Security Contract (Enforced, Not Aspirational)

1. **No provider keys in the browser.** Generative providers are called exclusively inside the Edge Function using server secrets (`GEMINI_API_KEY` / `OPENAI_API_KEY`). The client never sees, stores, or transmits provider keys; the legacy plaintext-key storage table was removed by migration `20261019000000_flowai_security.sql`.
2. **RLS all the way down.** CRM reads inside the function use the caller's own JWT (`supabase.auth.getUser`-derived client), so tenant isolation is enforced by PostgreSQL, not by prompt promises. The service-role key is used *only* for the two quota RPCs.
3. **Untrusted-data fencing.** CRM row strings are wrapped in strict delimiters and sanitized (backticks, angle brackets, `<script>` neutralized) before entering prompts; the system directive orders the model to treat fenced data as inert.
4. **Tool-argument hardening.** Prototype-pollution keys (`__proto__`, `constructor`) are stripped, string inputs clamp-bounded, numbers generically bounded — validated server-side per request.
5. **No silent writes.** AI never mutates CRM records. Meeting Intelligence may *propose* tasks; they become real rows only after the user reviews them, selects them, and provides an explicit due date (no default dates).

### Honest Degradation (Demo Mode & Unconfigured Deployments)

| Feature | Demo Mode (no Supabase) | Connected, no provider key | Connected + provider key |
| :--- | :--- | :--- | :--- |
| Copilot | Deterministic router over local tools (`engine: 'rules'`) | Rule-grounded answers | LLM synthesis over tool evidence |
| Sales Writer | Offline templates with placeholders | Offline templates | LLM drafts with data verification |
| Contact / Deal insight | Rule signals only | Rule signals, `unconfigured` hint | LLM narrative + signals |
| Meeting Intelligence | Extraction unavailable, honest `unavailableReason` | Same honest refusal | Full extraction + task proposals |
| Analytics | Registered tools, deterministic phrasing | Registered tools | LLM phrasing over tool results |
| Usage metering | Local counters (`localStorage`) | DB quota RPCs | DB quota RPCs |

### Quota Rails

Per-workspace/per-user limits enforced by DB functions, not just client checks:

- `FLOWAI_HOURLY_REQUEST_LIMIT` (default **60**, clamp 10–5000)
- `FLOWAI_MONTHLY_TOKEN_LIMIT` (default **200000**)
- Usage rows live in `flowai_usage`; client receives bilingual (en/ar) `rate_limited` errors with reset hints. Exposed in **Settings → AI Workspace** as a live usage bar and gateway status card.

---

## 5. Database Schema & Security Architecture

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
| `flowai_usage` | `id` (UUID) | `workspaces(id)`, `auth.users(id)` | `action`, `provider`, `tokens_in`, `tokens_out`, `estimated_cost_usd`, `created_at` |

`flowai_usage` (migration `20261019000000_flowai_security.sql`) has no client-facing policy — it is written exclusively by the two `SECURITY DEFINER` RPCs (`consume_flowai_usage`, `record_flowai_usage`) and read through the owner-bounded `get_flowai_usage` RPC, so tampering with counters from the browser is impossible. This migration also **drops the legacy `user_ai_settings` table** that previously stored plaintext provider keys.

### Row-Level Security (RLS)

All 7 tables have Row-Level Security enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).

Key policies:
1. **Multi-Tenant Isolation**: Records are accessible only if the requesting user belongs to the workspace (`is_workspace_member(workspace_id, auth.uid())`).
2. **Non-Recursive Membership Verification**: PostgreSQL `SECURITY DEFINER STABLE` functions avoid recursive RLS query deadlocks.
3. **Cross-Workspace Reference Validation**: When creating deals or tasks linked to contacts, policies enforce that the contact belongs to the exact same workspace.
4. **Privilege Escalation Prevention**: Non-admin users cannot promote themselves or modify roles in `workspace_members`.
5. **Role-Based Deletion**: Record deletions are restricted to `owner`, `admin`, and `manager` roles.

---

## 6. Security & Safety Practices

### Platform Security
- **Zero Secret Exposure**: The frontend client uses only `VITE_SUPABASE_PUBLISHABLE_KEY` (anonymous public key). Service role credentials and AI provider keys never reach the browser.
- **Spreadsheet Formula Injection Protection (CWE-1236)**: Exported CSV records starting with dangerous formula characters (`=`, `+`, `-`, `@`, `\t`, `\r`) are automatically prepended with a single quote `'` and wrapped in RFC 4180 quotes.
- **UTF-8 BOM Header**: CSV downloads include `\uFEFF` byte order marks to ensure Arabic characters open correctly in Excel and other spreadsheet software without character corruption.
- **Input Validation**: Both frontend forms and database constraints enforce required formats, non-negative deal values, and valid enum states.

### AI-Specific Security (FlowAI)
- **Prompt-Injection Defense**: Untrusted data (CRM rows, pasted meeting notes) is fenced and sanitized; adversarial tests (`aiSecurityAdversarial.test.ts`) verify that classic injections (`ignore previous instructions`, fake system roles, directive overrides) are fenced out and that tool arguments cannot carry prototype-pollution payloads.
- **Deterministic Numerics**: All money/date/percentage figures come from the shared metrics formulas — never from model arithmetic. The LLM may only *phrase* verified tool results.
- **No Data Exfiltration Surface**: Provider calls are made server-side with workspace-scoped data only after quota + auth checks; there is no BYOK pathway that could punt tenant data to a user-supplied endpoint.
- **Abortable, Bounded Requests**: Client requests carry `AbortSignal`s; the edge function enforces payload size limits and provider timeouts/retries with caps.

---

## 7. Installation & Quick Start

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

## 8. Supabase Backend Setup & FlowAI Deployment

### 8.1 Database

1. Create a project in [Supabase Dashboard](https://database.new).
2. Go to **SQL Editor** in your Supabase project.
3. Run, in order:
   - `supabase/migrations/20261017000000_flowcrm_core_schema.sql` (core DDL, triggers, RLS)
   - `supabase/migrations/20261019000000_flowai_security.sql` (quota table + SECURITY DEFINER RPCs; drops legacy `user_ai_settings`)
4. Enable Email Auth in **Authentication > Providers > Email**.
5. Add your app URL (e.g. `http://localhost:5173` or your production domain) under **Authentication > URL Configuration > Redirect URLs**.
6. Retrieve your Project URL and Anonymous Public Key from **Project Settings > API**, and add them to your `.env` file.

> The pgTAP authorization suite in `supabase/tests/rls_security_test.sql` can be run against any Postgres 14+ instance with `pgTAP` installed, or via Supabase CLI local development (`supabase test db`).

### 8.2 FlowAI Edge Function (required for connected-mode AI)

Requires [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) (and Deno is bundled internally — no separate install needed for deployment):

```bash
supabase functions deploy flowai-assistant --project-ref <your-project-ref>
```

Then set server-side secrets (never exposed to the browser):

```bash
# Exactly one provider is active; set FLOWAI_PROVIDER to 'gemini' or 'openai'
supabase secrets set GEMINI_API_KEY=<your-gemini-key>
# supabase secrets set OPENAI_API_KEY=<your-openai-key>       # alternative provider
supabase secrets set FLOWAI_PROVIDER=gemini
# optional overrides (defaults shown)
supabase secrets set FLOWAI_MODEL=gemini-1.5-flash           # or gpt-4o-mini for openai
supabase secrets set FLOWAI_HOURLY_REQUEST_LIMIT=60
supabase secrets set FLOWAI_MONTHLY_TOKEN_LIMIT=200000
```

Without a provider key the function still serves **rule-based, grounded** responses (with `unconfigured` hints) — the UI degrades honestly rather than hiding the gap. **Settings → AI Workspace** in the app shows live gateway status, usage, and deployment diagnostics.

---

## 9. Verification & Test Commands

### Run Automated Tests
```bash
npm test
```
Executes **74 tests across 11 suites**:

| Suite | Focus |
| :--- | :--- |
| `calculations.test.ts` | Task due-today/overdue day-boundary math incl. timezone offsets |
| `csv.test.ts` | Formula injection protection (CWE-1236) |
| `permissions.test.ts` | RBAC permission matrix |
| `i18n.test.ts` | Bilingual key parity (en/ar) |
| `uiComponents.test.tsx` | Button/EmptyState/Modal behavior |
| `crmService.test.ts` | Unified data gateway + demo mode |
| `leadScoringAndQuality.test.ts` | Lead scoring & data quality heuristics |
| `toolRegistry.test.ts` | Shared tool execution through the client registry |
| `flowAIService.test.ts` | Client dispatcher: copilot/insight/analytics/meeting paths, demo metering, honest refusal |
| `aiSecurityAdversarial.test.ts` | Prompt-injection fencing & payload hygiene |
| `sharedEngine.test.ts` | Cross-runtime contract: shared metrics/periods, validation, copilot router, quota rails, all 12 tools end-to-end |

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

## 10. Deployment Instructions

### Vercel (Frontend)
1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Environment Variables:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase Anon Key
6. Click **Deploy**.

### Supabase (Backend + FlowAI)
- Run the two migrations (§8.1), then deploy the edge function and secrets (§8.2).
- Frontend and function must point at the same project; the app auto-detects configured vs. demo mode at startup.

---

## 11. Known Limitations

- Real-time WebSocket subscriptions require Supabase Realtime publication configuration on the target PostgreSQL tables.
- File attachments for contact cards (such as PDF contracts) require a Supabase Storage bucket (`crm-attachments`) configured with appropriate storage RLS policies.
- Generative AI features require deploying `flowai-assistant` **and** setting a provider key server-side (§8.2). Without it, the AI suite runs in honest rule-based mode — functional but not generative.
- Local LLM evaluation runs against mocked provider adapters; the end-to-end live provider responses should be smoke-tested once a real `GEMINI_API_KEY`/`OPENAI_API_KEY` is installed on the project secrets.
- Provider usage costs are *estimated* from token counts (`estimate_cost_usd` in usage rows); invoices from the provider remain the source of truth.
