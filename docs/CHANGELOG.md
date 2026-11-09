# FlowCRM Changelog

All notable changes to the FlowCRM platform are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] — 2026-11-09

### Added
- **Global Command Palette (`Ctrl+K` / `Cmd+K` Omnisearch):**
  - Universal keyboard-driven search modal accessible from any screen.
  - Searches across navigation pages, quick CRM actions, contacts, deals, and tasks.
  - Includes keyboard shortcuts (Arrow navigation, Enter selection, Escape dismissal).
  - Native bilingual support (English & Arabic RTL) with category groupings.
  - Header search trigger bar with `⌘K` badge on desktop and mobile search icon.
- **Dynamic Dashboard Timeframe Filtering:**
  - Executive period filter switcher (`All Time`, `This Month`, `Last Month`, `This Quarter`).
  - Dynamic KPI recalculation powered by the shared math engine (`_shared/metrics.ts`).
  - Live pipeline stage breakdown re-aggregation matching the selected window.
  - Activity feed type filtering (`All`, `Calls`, `Emails`, `Meetings`, `Stage Changes`).
- **Closed Lost Reason Tracking & Pipeline Intelligence:**
  - `LossReasonModal` triggered whenever a deal transitions to the `lost` stage.
  - Predefined structured loss reasons (Pricing, Competitor, Timing, Product Gap, No Decision, Other).
  - Optional qualitative context feedback textarea.
  - Automatic audit log creation in `activities` tracking the transition with the recorded reason.
- **Deals Kanban Win Probability Visualization:**
  - Stage probability calculation (`new`: 15%, `qualified`: 35%, `proposal`: 60%, `negotiation`: 80%).
  - Smooth visual progress bar and percentage badge on active deal cards.
- **Contacts Table Pagination & Multi-Selection:**
  - Configurable page sizes (10, 25, 50 items per page).
  - Pagination navigation footer with page range indicator and responsive controls.
  - Quick status filter pills with dynamic count badges (`All`, `Leads`, `Prospects`, `Customers`, `Inactive`).
  - Checkbox selection on individual rows and header (select all on page).
  - Floating/sticky Bulk Action Toolbar supporting bulk CSV export and bulk deletion.
- **Comprehensive Documentation Suite (`docs/`):**
  - `docs/audit/flowcrm-discovery-report.md` (Discovery & baseline intelligence)
  - `docs/architecture/flowcrm-architecture.md` (System topology & technical architecture)
  - `docs/design/flowcrm-design-system.md` (Charcoal & Warm Gold design system tokens)
  - `docs/audit/flowcrm-security-report.md` (Threat modeling & security audit)
  - `docs/testing/flowcrm-testing-report.md` (Test execution & verification evidence)
  - `docs/roadmap/flowcrm-future-roadmap.md` (Phased roadmap through 2028)
- **Automated Verification:**
  - Added `src/tests/commandPaletteAndLossReason.test.tsx` covering modal interactions and command palette search.

### Changed
- **Landing Page Alignment:**
  - Corrected FAQ item #2 in English and Arabic to accurately represent the server-side Edge Function secrets architecture and zero-client-secret contract.
- **Dashboard Metric Cards:**
  - Connected metric cards to `activeMetrics` for immediate real-time responsiveness when switching timeframes.
- **Contact Table Layout:**
  - Aligned column widths, typography hierarchy, and hover states with the Charcoal & Warm Gold design system.

### Security
- Verified zero secret exposure in Vite client bundles.
- Verified prompt injection defenses and prototype pollution sanitization in the shared intelligence engine.
- Verified CWE-1236 spreadsheet formula injection neutralization in CSV generators.

---

## [1.0.0] — Previous Stable Release
- Initial multi-tenant CRM release with Supabase Auth, PostgreSQL RLS, FlowAI grounded assistant, and demo mode.
