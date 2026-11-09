# FlowCRM — Strategic Product & Engineering Roadmap

**Document Version:** 2.0.0  
**Target Horizon:** 2027 – 2028  
**Strategic Focus:** Intelligent Automation, Seamless Omnichannel Sync, and Enterprise Scale.  

---

## 1. Product Vision & Long-Term Objectives

FlowCRM is evolving from an executive pipeline & contact management platform into an **Intelligent Revenue Engine** for high-velocity sales teams.

### Strategic Pillars
1. **Zero-Latency Grounded Intelligence:** Empowering sales professionals with real-time insight while maintaining 100% data auditability and zero hallucinations.
2. **Effortless Omnichannel Data Ingestion:** Eliminating manual data entry by automatically connecting customer emails, calls, and chat channels.
3. **Enterprise Resilience & Sovereignty:** Uncompromising multi-tenant security, tenant isolation, compliance certifications, and localized hosting.

---

## 2. Phased Roadmap Horizon

```
┌───────────────────────────────┐     ┌───────────────────────────────┐     ┌───────────────────────────────┐
│     Horizon 1 (Q1–Q2 2027)    │     │     Horizon 2 (Q3–Q4 2027)    │     │     Horizon 3 (2028+)         │
├───────────────────────────────┤     ├───────────────────────────────┤     ├───────────────────────────────┤
│ • Realtime WebSocket Sync     │     │ • WhatsApp Business API       │     │ • Visual Workflow Automation  │
│ • 2-Way Email Sync (OAuth)    │     │ • Mobile PWA Offline Cache    │     │ • Multi-Speaker Voice Notes   │
│ • Custom Report Builder       │     │ • Multi-Pipeline Support      │     │ • Enterprise SAML/SSO & SCIM  │
│ • Custom Custom Fields Engine │     │ • Quota & Billing Self-Serve  │     │ • AI Agent Autonomous Actions │
└───────────────────────────────┘     └───────────────────────────────┘     └───────────────────────────────┘
```

---

## 3. Horizon 1: Collaborative Speed & Omnichannel Foundation (Q1–Q2 2027)

### 1.1 Real-Time WebSocket Collaboration
- **Objective:** Enable multi-user live sync across the sales pipeline and activity feed without page reloads.
- **Architecture:** Subscribe to Supabase Realtime PostgreSQL CDC (`supabase.channel('public:deals')`) with tenant-isolated filtering.
- **Impact:** When a colleague moves a deal card or logs a call, every member sees the transition instantaneously.

### 1.2 Two-Way Email Sync (Google Workspace & Microsoft 365)
- **Objective:** Automatically associate incoming client emails with contact records and surface them in the activity timeline.
- **Architecture:** Secure OAuth 2.0 integration with webhook notifications (`pushNotifications`) for incoming threads.

### 1.3 Custom Dynamic Fields
- **Objective:** Allow workspace owners to define custom properties on contacts and deals (e.g., "Industry", "Contract Renewal Date", "Lead Rating").
- **Architecture:** Stored as validated JSONB columns (`custom_attributes`) backed by workspace schema definitions.

---

## 4. Horizon 2: Mobility & Direct Messaging (Q3–Q4 2027)

### 2.1 WhatsApp Business API Integration
- **Objective:** Send follow-up messages and receive customer replies directly within the FlowCRM contact detail drawer.
- **Architecture:** Official Meta Cloud API webhook integration with message template approval workflows.

### 2.2 Offline PWA & Push Notifications
- **Objective:** Provide field sales representatives with offline contact lookup and background sync when connectivity resumes.
- **Architecture:** Service worker caching, IndexedDB mutation queues, and Web Push notifications for scheduled task alerts.

### 2.3 Multiple Sales Pipelines
- **Objective:** Enable businesses running diverse revenue streams (e.g. "B2B Software", "Consulting Services", "Support Renewals") to configure distinct pipelines with unique stages.

---

## 5. Horizon 3: Autonomous Workflows & Enterprise Scale (2028+)

### 3.1 Visual Workflow Automation Builder
- **Objective:** No-code trigger-action builder (e.g., "When deal reaches Proposal Sent, create follow-up task 3 days later and notify account executive").

### 3.2 Real-Time Voice Call Diarization
- **Objective:** Ingest recorded phone calls, transcribe Arabic and English speech, identify distinct speakers, and extract next steps directly into FlowCRM tasks.

### 3.3 Enterprise Governance, SAML/SSO & Audit Logging
- **Objective:** Comply with SOC 2 Type II and ISO 27001 standards via Okta/Azure AD single sign-on and tamper-proof immutable audit logs.
