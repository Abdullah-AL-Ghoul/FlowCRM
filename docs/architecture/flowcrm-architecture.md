# FlowCRM — Technical Architecture & Systems Engineering

**Document Version:** 2.0.0  
**Status:** Canonical Reference Architecture  
**Author:** Software Architecture & Engineering Team  

---

## 1. System Topology & Dual-Mode Operations

FlowCRM is designed with a **Dual-Mode Operating Architecture** to support both real-world cloud enterprise deployment and instantaneous zero-friction offline/demo evaluation:

```
                            ┌────────────────────────────────────────┐
                            │           Browser Client (Vite)        │
                            │  React 18 + Strict TypeScript 5.6      │
                            └───────────────────┬────────────────────┘
                                                │
                      ┌─────────────────────────┴─────────────────────────┐
                      │                                                   │
                      ▼                                                   ▼
            [Connected Mode]                                      [Demo / Offline Mode]
       VITE_SUPABASE_URL present                                  Credentials absent or demo flag
                      │                                                   │
                      ▼                                                   ▼
         Supabase PostgreSQL DB                                   Local Synthetic Gateway
      - Multi-Tenant RLS Policies                               - crmService in-memory/localStorage
      - 7 Normalized Tables + Quota                             - Seed dataset (10 contacts, 7 deals,
      - SECURITY DEFINER Functions                                8 tasks, 12 activities)
                      │                                                   │
                      ▼                                                   ▼
         Edge Function (Deno)                                      Browser Shared Engine
       flowai-assistant gateway                                 supabase/functions/_shared/
                      │                                                   │
                      └─────────────────────────┬─────────────────────────┘
                                                │
                                                ▼
                                    Single Shared AI Engine
                             - Authoritative metrics formulas
                             - 12 read-only tools
                             - Grounded evidence citations
                             - Adversarial prompt fencing
```

### Mode Comparison Matrix

| Property | Connected Supabase Mode | Offline / Demo Mode |
| :--- | :--- | :--- |
| **Authentication** | Supabase Auth (JWT, email confirmation) | Synthetic Demo Session with auto-provisioned workspace |
| **Data Storage** | PostgreSQL 15+ on Supabase | Browser `localStorage` (`flowcrm_demo_data_v2`) |
| **Multi-Tenancy** | PostgreSQL Row-Level Security (RLS) | Isolated mock workspace (`demo-workspace-01`) |
| **AI Transport** | Authenticated POST to `flowai-assistant` Edge Function | Client-side execution of `_shared/` modules via `localGateway.ts` |
| **AI Providers** | Server-side Gemini 1.5 Flash / OpenAI / Claude via secrets | Deterministic rule-based dispatcher over local tools |
| **Rate Limiting** | Database Quota RPCs (`consume_flowai_usage`) | Local usage counter (`localStorage`) |

---

## 2. Frontend State & Module Organization

The application state is organized into three global React Context providers that wrap the entire tree:

```
<I18nProvider>              (Manages active locale 'en' | 'ar', RTL/LTR direction, translations)
  └── <AuthProvider>        (Manages Supabase auth session, JWT tokens, profile, and demo switch)
        └── <CRMProvider>   (Manages contacts, deals, tasks, activities, metrics, and optimistic updates)
              └── <AppLayout>
                    ├── <Header />
                    ├── <Sidebar />
                    ├── <Outlet /> (Dashboard, Contacts, Deals, Tasks, Reports, Settings)
                    └── Global Slide-overs (<FlowAICopilot />, <MeetingIntelligenceModal />, etc.)
```

### Module Breakdown & Responsibilities
- **`src/context/CRMContext.tsx`:** Single source of truth for CRM entities. Handles batch fetching on workspace change, optimistic state mutations, and error handling.
- **`src/services/crmService.ts`:** Data abstraction layer that switches transparently between Supabase SQL and local demo storage.
- **`src/services/edgeGateway.ts`:** Handles communication with the Supabase Edge Function `flowai-assistant` with automatic abort signaling and standardized error envelopes.
- **`supabase/functions/_shared/metrics.ts`:** Single shared math engine for calculating KPIs (pipeline value, win rates, stage distributions, day boundaries for tasks).

---

## 3. Database Schema & Multi-Tenant Security

### Schema Entity Relationship Diagram

```
[workspaces] 1 ──── ∞ [workspace_members] ∞ ──── 1 [profiles] (auth.users)
      │
      ├─── 1 ──── ∞ [contacts] 1 ──── ∞ [deals]
      │                  │                │
      │                  └─── 1 ──── ∞ [tasks]
      │                                   │
      └─── 1 ───────────────────────── ∞ [activities]
      │
      └─── 1 ───────────────────────── ∞ [flowai_usage]
```

### Row-Level Security (RLS) Guardrails
1. **Workspace Scoping:** Every query enforces `is_workspace_member(workspace_id, auth.uid())`.
2. **Defensive Definers:** Helper functions (`is_workspace_member`, `is_workspace_admin`) are marked `SECURITY DEFINER STABLE` to prevent recursive RLS query loops.
3. **Foreign Key Workspace Parity:** Policies ensure that when a deal is linked to a contact, both belong to the exact same workspace.
4. **Isolated Quota Ledger:** The `flowai_usage` table cannot be modified directly by any user token; it is written solely by privileged database RPCs invoked by the edge function.

---

## 4. FlowAI Single Shared Engine Architecture

To ensure zero divergence between cloud execution and local testing:
1. **Identical Codebase (`_shared/`):** Both Deno on Supabase and React in Vite import the exact same modules:
   - `crmTools.ts`: 12 registered tools (`get_workflow_overview`, `search_contacts`, `search_deals`, etc.).
   - `metrics.ts`: Deterministic calculation of pipeline sums and date math.
   - `prompts.ts`: Versioned prompt templates with prompt-injection fencing (`<crm_untrusted_data>`).
   - `validation.ts`: Runtime sanitization of tool arguments (stripping prototype pollution keys).
2. **Clickable Citations:** All answers carry `GroundedEvidence` arrays mapping claims to actual record IDs.
3. **No Silent Mutations:** AI never writes directly to the database. All extracted meeting tasks require human verification and explicit due dates.

---

## 5. Build, Bundling & Performance Optimization

- **Rollup Manual Chunking (`vite.config.ts`):**
  - `vendor`: React, React-DOM, React Router.
  - `charts`: Recharts, d3 components.
  - `icons`: Lucide React SVG bundle.
- **Code Splitting:** All top-level page routes (`LandingPage`, `DashboardPage`, `ContactsPage`, `DealsKanbanPage`, `TasksPage`, `ReportsPage`, `SettingsPage`) are lazily loaded via `React.lazy()` with `<Suspense>` fallbacks.
- **Strict CSS Isolation:** Tailwind CSS purging ensures the final CSS stylesheet is only 51 kB gzipped to 8.8 kB.
