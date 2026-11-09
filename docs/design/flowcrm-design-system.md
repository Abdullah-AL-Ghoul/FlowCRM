# FlowCRM — Design System Specification

**Design System Name:** FlowCRM Charcoal & Gold Design System  
**Version:** 2.0.0  
**Design Philosophy:** Modern B2B SaaS, High Craft, Executive Clarity, Frictionless Ergonomics.  

---

## 1. Visual Identity & Design Principles

FlowCRM departs from generic, uninspired dashboard templates by grounding its aesthetic in a distinctive **Executive Charcoal & Warm Gold** palette.

### Core Principles
1. **Purposeful Contrast:** High information density without visual clutter. Key numbers, conversion stages, and alerts are instantly discernible.
2. **Native Bilingual Typographic Harmony:** Fluid support for Latin (English) and Arabic (RTL) scripts with matching optical weights and line-heights.
3. **Restraint & Polish:** Micro-interactions (150ms transitions, subtle scale, glow on focus) that elevate perceived performance without distraction.
4. **Accessible by Default:** WCAG 2.2 AA compliant contrast ratios (>= 4.5:1 for body copy, >= 3:1 for large headers and UI controls). Minimum 44×44px interactive tap zones.

---

## 2. Color Palette & Token Architecture

### Primary Brand Palette

| Token Name | Hex Code | Tailwind Class | Semantic Usage |
| :--- | :--- | :--- | :--- |
| **Brand Background** | `#101318` | `bg-brand-bg` | Main sidebar background, dark chrome shell |
| **Brand Surface** | `#1A1F26` | `bg-brand-surface` | Sidebar active state, cards in dark mode |
| **Brand Border** | `#28303B` | `border-brand-border` | Subtle dividers in dark sidebar & chrome |
| **Brand Gold (Accent)** | `#C9A961` | `text-brand-gold`, `bg-brand-gold` | Primary actions, key KPI highlights, brand mark |
| **Brand Gold Pale** | `#E7D3A0` | `text-brand-goldPale`, `bg-brand-goldPale` | Subtle badges, pill highlights, hover accents |
| **Brand Gold Hover** | `#B89548` | `bg-brand-goldHover` | Active and hover states for gold buttons |

### Neutral Greys & Canvas Tokens

| Token Name | Hex Code | Usage |
| :--- | :--- | :--- |
| **Canvas Background** | `#F8FAFC` (`slate-50`) | Primary viewport background |
| **Card / Surface Background** | `#FFFFFF` (`white`) | Data cards, tables, modal bodies |
| **Dividers & Borders** | `#E2E8F0` (`slate-200`) | Card borders, table grid lines |
| **Body Text Primary** | `#0F172A` (`slate-900`) | Headings, primary contact names, numbers |
| **Body Text Secondary** | `#475569` (`slate-600`) | Descriptions, table cell content |
| **Muted Labels** | `#64748B` (`slate-500`) | Captions, timestamps, column headers |

### Semantic Feedback Tokens

| Intent | Background | Text | Border | Usage in CRM |
| :--- | :--- | :--- | :--- | :--- |
| **Success / Won** | `bg-emerald-50` | `text-emerald-800` | `border-emerald-200` | Won deals, active contacts, connected status |
| **Warning / At Risk** | `bg-amber-50` | `text-amber-800` | `border-amber-200` | Overdue follow-ups, stale deals, demo mode |
| **Danger / Lost** | `bg-rose-50` | `text-rose-800` | `border-rose-200` | Lost deals, delete actions, urgent tasks |
| **Info / Qualified** | `bg-sky-50` | `text-sky-800` | `border-sky-200` | Qualified stage, lead sources, info alerts |

---

## 3. Typography Scale & Font Pairings

- **Latin (English):** Inter, system-ui, -apple-system, sans-serif
- **Arabic:** IBM Plex Sans Arabic, Cairo, sans-serif

### Type Scale

| Style Level | Size | Weight | Tracking | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display 1** | 2rem (32px) | Bold (700) | -0.025em | 1.25 | Landing hero header, major stats |
| **Page Title** | 1.5rem (24px) | Bold (700) | -0.02em | 1.3 | Module headers (Dashboard, Contacts, Deals) |
| **Section Header** | 1.125rem (18px) | SemiBold (600) | -0.015em | 1.35 | Card titles, modal headers |
| **Body Standard** | 0.875rem (14px) | Regular (400) | Normal | 1.5 | Table cells, form values, prose |
| **Body Medium** | 0.875rem (14px) | Medium (500) | Normal | 1.5 | Button labels, navigation links |
| **Caption / Meta** | 0.75rem (12px) | Medium (500) | +0.01em | 1.4 | Badges, timestamps, helper text |
| **Micro Badge** | 0.6875rem (11px) | SemiBold (600) | +0.02em | 1.2 | Deal stage tags, lead source pills |

---

## 4. Spacing Scale & Elevation

### Spacing Unit: 4px Base
- `p-1` (4px), `p-2` (8px), `p-3` (12px), `p-4` (16px), `p-6` (24px), `p-8` (32px).
- Modal interior padding: `p-6` (24px).
- Card padding: `p-5` to `p-6` (20–24px).
- Table cell padding: `py-3 px-4` (12px top/bottom, 16px left/right).

### Elevation & Shadows
- `shadow-xs`: `0 1px 2px 0 rgba(0, 0, 0, 0.05)` (Form inputs, status pills)
- `shadow-sm`: `0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)` (Cards, metric tiles)
- `shadow-md`: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)` (Dropdowns, popovers)
- `shadow-xl`: `0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)` (Modals, drawers)

---

## 5. UI Component System Standards

### 1. Button (`src/components/common/Button.tsx`)
- **Variants:**
  - `primary`: Solid Dark Slate (`#0F172A`), white text, crisp border.
  - `gold`: Premium Warm Gold (`#C9A961`), charcoal text (`#0F172A`), high emphasis.
  - `secondary`: White background, subtle border, slate text.
  - `outline`: Transparent background, slate border.
  - `ghost`: Transparent background, hover tint.
  - `danger`: Crimson Red (`#E11D48`), white text.
- **Sizes:** `sm` (text-xs, py-1.5, px-2.5), `md` (text-sm, py-2, px-3.5), `lg` (text-base, py-2.5, px-5).
- **Interactive State:** Focus ring with 2px offset (`focus-visible:ring-2 focus-visible:ring-brand-gold`).

### 2. Form Inputs (`src/components/common/Input.tsx`)
- High visual legibility: 1px border (`border-slate-300`), white background, rounded 8px (`rounded-lg`).
- Focus state: `focus:border-brand-gold focus:ring-1 focus:ring-brand-gold`.
- Floating helper text and immediate validation error feedback in rose-600.

### 3. Modal & Drawers (`src/components/common/Modal.tsx`)
- Smooth backdrop blur (`backdrop-blur-xs bg-slate-900/50`).
- Keyboard dismissable (`Escape` key).
- Focus trapping and scroll locking on mount.

### 4. Data Tables
- Sticky header with subtle backdrop.
- Alternating row hover states (`hover:bg-slate-50/80`).
- Row selection checkbox column with bulk action toolbar when rows are selected.
- Clean pagination footer (`Showing 1-10 of 42 results`).

---

## 6. Accessibility & Responsive Breakpoints

- **Mobile (< 640px):** Single column layouts, sticky bottom actions, off-canvas navigation.
- **Tablet (640px - 1023px):** 2-column metrics, simplified table layouts, scrollable Kanban board.
- **Desktop (>= 1024px):** Fixed navigation sidebar, full 4-column metric grid, 6-stage Kanban board.
- **High Resolution (>= 1440px):** Expanded layout with 1280px max-width container.
