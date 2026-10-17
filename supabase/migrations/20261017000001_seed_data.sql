-- ==============================================================================
-- FlowCRM Realistic Demo & Seed Data Migration
-- Migration: 20261017000001_seed_data.sql
-- ==============================================================================
-- Run this script in your Supabase SQL Editor to seed a complete, realistic
-- demonstration workspace ("Apex Global Ventures") with 18 contacts across
-- global markets, 19 deals across all pipeline stages, 15 actionable tasks,
-- and 18 diverse timeline activities.
-- ==============================================================================

DO $$
DECLARE
    v_ws_id UUID := 'a0000000-0000-0000-0000-000000000001';
    v_user1_id UUID;
    v_c01 UUID := 'c0000000-0000-0000-0000-000000000001';
    v_c02 UUID := 'c0000000-0000-0000-0000-000000000002';
    v_c03 UUID := 'c0000000-0000-0000-0000-000000000003';
    v_c04 UUID := 'c0000000-0000-0000-0000-000000000004';
    v_c05 UUID := 'c0000000-0000-0000-0000-000000000005';
    v_c06 UUID := 'c0000000-0000-0000-0000-000000000006';
    v_c07 UUID := 'c0000000-0000-0000-0000-000000000007';
    v_c08 UUID := 'c0000000-0000-0000-0000-000000000008';
    v_c09 UUID := 'c0000000-0000-0000-0000-000000000009';
    v_c10 UUID := 'c0000000-0000-0000-0000-000000000010';
    v_c11 UUID := 'c0000000-0000-0000-0000-000000000011';
    v_c12 UUID := 'c0000000-0000-0000-0000-000000000012';
    v_c13 UUID := 'c0000000-0000-0000-0000-000000000013';
    v_c14 UUID := 'c0000000-0000-0000-0000-000000000014';
    v_c15 UUID := 'c0000000-0000-0000-0000-000000000015';
    v_c16 UUID := 'c0000000-0000-0000-0000-000000000016';
    v_c17 UUID := 'c0000000-0000-0000-0000-000000000017';
    v_c18 UUID := 'c0000000-0000-0000-0000-000000000018';

    v_d01 UUID := 'd0000000-0000-0000-0000-000000000001';
    v_d02 UUID := 'd0000000-0000-0000-0000-000000000002';
    v_d03 UUID := 'd0000000-0000-0000-0000-000000000003';
    v_d04 UUID := 'd0000000-0000-0000-0000-000000000004';
    v_d05 UUID := 'd0000000-0000-0000-0000-000000000005';
    v_d06 UUID := 'd0000000-0000-0000-0000-000000000006';
    v_d07 UUID := 'd0000000-0000-0000-0000-000000000007';
    v_d08 UUID := 'd0000000-0000-0000-0000-000000000008';
    v_d09 UUID := 'd0000000-0000-0000-0000-000000000009';
    v_d10 UUID := 'd0000000-0000-0000-0000-000000000010';
    v_d11 UUID := 'd0000000-0000-0000-0000-000000000011';
    v_d12 UUID := 'd0000000-0000-0000-0000-000000000012';
    v_d13 UUID := 'd0000000-0000-0000-0000-000000000013';
    v_d14 UUID := 'd0000000-0000-0000-0000-000000000014';
    v_d15 UUID := 'd0000000-0000-0000-0000-000000000015';
    v_d16 UUID := 'd0000000-0000-0000-0000-000000000016';
    v_d17 UUID := 'd0000000-0000-0000-0000-000000000017';
    v_d18 UUID := 'd0000000-0000-0000-0000-000000000018';
    v_d19 UUID := 'd0000000-0000-0000-0000-000000000019';
BEGIN
    -- Determine the executing or first existing user from profiles, or leave NULL
    SELECT id INTO v_user1_id FROM public.profiles LIMIT 1;

    -- 1. Create or ensure Demo Workspace exists
    INSERT INTO public.workspaces (id, name, slug)
    VALUES (v_ws_id, 'Apex Global Ventures', 'apex-global')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

    -- If a user exists, attach them as owner
    IF v_user1_id IS NOT NULL THEN
        INSERT INTO public.workspace_members (workspace_id, user_id, role)
        VALUES (v_ws_id, v_user1_id, 'owner')
        ON CONFLICT (workspace_id, user_id) DO NOTHING;
    END IF;

    -- 2. Seed 18 Realistic Contacts
    INSERT INTO public.contacts (id, workspace_id, full_name, email, phone, company, job_title, lead_source, status, notes)
    VALUES
        (v_c01, v_ws_id, 'Elena Rostova', 'e.rostova@hyperioncloud.com', '+1 (415) 890-2134', 'Hyperion Cloud Systems', 'Chief Technology Officer', 'linkedin', 'customer', 'Primary decision maker for enterprise cloud infrastructure migration.'),
        (v_c02, v_ws_id, 'Zaid Al-Harbi', 'z.harbi@desertfintech.sa', '+966 50 123 4567', 'Desert Fintech Solutions', 'Head of Strategic Partnerships', 'conference', 'prospect', 'Met at Riyadh Fintech Summit. Interested in high-volume payment routing integration.'),
        (v_c03, v_ws_id, 'Marcus Vance', 'marcus@vancecap.io', '+1 (212) 555-0199', 'Vance Capital Partners', 'Managing Director', 'referral', 'prospect', 'Referred by advisory board. Evaluating modern CRM & data visibility tools.'),
        (v_c04, v_ws_id, 'Layla Al-Qadi', 'layla@qadilogistics.ae', '+971 4 321 9876', 'Al-Qadi Regional Logistics', 'Operations Director', 'website', 'lead', 'Inbound demo request through main website form.'),
        (v_c05, v_ws_id, 'David Chen', 'dchen@nexustech.org', '+1 (650) 412-8877', 'Nexus Robotics', 'VP of Product Engineering', 'outreach', 'customer', 'Annual contract closed last quarter. Reviewing expansion tier.'),
        (v_c06, v_ws_id, 'Sophia Martinez', 'sophia@luminahealth.com', '+1 (312) 789-6543', 'Lumina Health Intelligence', 'Director of Procurement', 'partner', 'churned', 'Postponed CRM integration due to internal healthcare restructuring.'),
        (v_c07, v_ws_id, 'Dr. Fahad Al-Subaie', 'f.subaie@saudicleantech.sa', '+966 54 889 0011', 'Saudi CleanTech Innovations', 'Chief Executive Officer', 'conference', 'customer', 'Pioneering solar grid optimization projects across NEOM & Red Sea.'),
        (v_c08, v_ws_id, 'Amira Khalil', 'amira.khalil@nileretail.eg', '+20 100 234 5678', 'Nile Retail & E-Commerce', 'VP of Digital Transformation', 'referral', 'prospect', 'Expanding omnichannel retail network across North Africa and the Gulf.'),
        (v_c09, v_ws_id, 'Arthur Pendleton', 'pendleton@thamesre.co.uk', '+44 20 7946 0912', 'Thames Global Reinsurance', 'Chief Risk Officer', 'linkedin', 'prospect', 'Evaluating compliance audit trail and granular workspace permissions.'),
        (v_c10, v_ws_id, 'Noura Al-Zahrani', 'noura@redseaports.sa', '+966 55 901 2345', 'Red Sea Port Logistics Authority', 'Head of Port Operations Strategy', 'website', 'prospect', 'Seeking unified maritime dispatch and contract tracking dashboard.'),
        (v_c11, v_ws_id, 'Liam O''Connor', 'liam@emerald-dc.ie', '+353 1 496 0123', 'Emerald Data Centres Ltd', 'VP of Infrastructure Operations', 'outreach', 'customer', 'European green tier-4 data center network partner.'),
        (v_c12, v_ws_id, 'Huda Al-Masri', 'huda.masri@levantedtech.com', '+962 6 567 8901', 'Levant EdTech Accelerators', 'Co-Founder & COO', 'partner', 'lead', 'Providing interactive learning software to 40+ educational institutions.'),
        (v_c13, v_ws_id, 'Karim Benali', 'k.benali@atlasventures.ma', '+212 522 34 56 78', 'Atlas Venture Builders', 'Managing Partner', 'referral', 'lead', 'Incubating deep-tech and agritech startups across Morocco and West Africa.'),
        (v_c14, v_ws_id, 'Beatrice Dubois', 'b.dubois@hexagonaviation.fr', '+33 1 42 68 55 00', 'Hexagon Aviation Spares', 'Procurement Director', 'cold_call', 'churned', 'Decided to renew with legacy supplier following corporate merger.'),
        (v_c15, v_ws_id, 'Sultan Al-Otaibi', 'sultan@otaibigroup.sa', '+966 11 478 9900', 'Al-Otaibi Industrial Group', 'Commercial Director', 'conference', 'prospect', 'Heavy manufacturing and industrial valves supplier for oil & gas operators.'),
        (v_c16, v_ws_id, 'Charlotte Ward', 'charlotte.ward@horizonsaas.com', '+1 (415) 672-9100', 'Horizon SaaS Solutions', 'VP of Global Alliances', 'linkedin', 'customer', 'Channel partnership agreement for co-marketing and API connectors.'),
        (v_c17, v_ws_id, 'Youssef El-Husseini', 'youssef@cairomedtech.eg', '+20 2 2794 3321', 'Cairo MedTech Supplies', 'Head of Regional Distribution', 'website', 'lead', 'Supplying hospital equipment and diagnostic kits in Greater Cairo.'),
        (v_c18, v_ws_id, 'Rachel Goldberg', 'rachel@apexproptech.co', '+1 (305) 914-7260', 'Apex PropTech Analytics', 'Director of Growth', 'referral', 'prospect', 'Automating commercial real estate leasing leads and tenant scoring.')
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        company = EXCLUDED.company,
        job_title = EXCLUDED.job_title,
        status = EXCLUDED.status;

    -- 3. Seed 19 Deals Across All 6 Stages
    INSERT INTO public.deals (id, workspace_id, contact_id, title, value, currency, stage, expected_close_date, notes)
    VALUES
        -- Won
        (v_d01, v_ws_id, v_c01, 'Enterprise Platform Migration & Custom SLA', 78000, 'USD', 'won', CURRENT_DATE - 20, 'Multi-year contract signed. Implementation ongoing.'),
        (v_d05, v_ws_id, v_c05, 'Nexus Autonomous Fleet Sensor Pipeline', 94000, 'USD', 'won', CURRENT_DATE - 30, 'Delivered initial batch license. Telemetry verified.'),
        (v_d16, v_ws_id, v_c11, 'Emerald Data Centres Infrastructure Telemetry Hub', 165000, 'USD', 'won', CURRENT_DATE - 15, 'Signed 3-year enterprise SLA agreement covering 8 Dublin facilities.'),
        (v_d17, v_ws_id, v_c16, 'Horizon SaaS Global Co-Selling & Integration', 88000, 'USD', 'won', CURRENT_DATE - 8, 'Channel revenue share and native API connector approved.'),

        -- Negotiation
        (v_d02, v_ws_id, v_c02, 'Fintech API Gateway & Real-Time Sync', 52000, 'USD', 'negotiation', CURRENT_DATE + 10, 'Pricing terms submitted; pending legal sign-off on regional data residency clauses.'),
        (v_d14, v_ws_id, v_c15, 'Al-Otaibi Industrial Heavy Asset Tracking', 140000, 'USD', 'negotiation', CURRENT_DATE + 14, 'Contract draft sent. Final security audit in progress.'),
        (v_d15, v_ws_id, v_c09, 'Thames Reinsurance Real-Time Compliance Audit Suite', 125000, 'USD', 'negotiation', CURRENT_DATE + 18, 'Executive board presentation completed. Finalizing licensing tiers.'),

        -- Proposal
        (v_d03, v_ws_id, v_c03, 'Vance Capital Portfolio CRM Rollout', 110000, 'USD', 'proposal', CURRENT_DATE + 25, 'Comprehensive technical RFP submitted to investment committee.'),
        (v_d12, v_ws_id, v_c08, 'Nile Retail Omnichannel Sales Engine', 68000, 'USD', 'proposal', CURRENT_DATE + 22, 'Commercial proposal sent for POS and web store unification.'),
        (v_d13, v_ws_id, v_c10, 'Red Sea Port Automated Dispatch Hub', 95000, 'USD', 'proposal', CURRENT_DATE + 30, 'Detailed scope of work submitted to port authority technology council.'),

        -- Qualified
        (v_d04, v_ws_id, v_c04, 'Regional Fleet Workflow Optimization', 36000, 'USD', 'qualified', CURRENT_DATE + 35, 'Completed qualification audit. Budget and timeline confirmed.'),
        (v_d10, v_ws_id, v_c07, 'Saudi CleanTech Solar Telemetry Grid', 85000, 'USD', 'qualified', CURRENT_DATE + 40, 'Qualification call completed. Technical feasibility validated.'),
        (v_d11, v_ws_id, v_c18, 'Apex PropTech Real-Time Tenant Portal', 44000, 'USD', 'qualified', CURRENT_DATE + 28, 'Confirmed 2,400 active rental units require automated onboarding.'),

        -- New
        (v_d06, v_ws_id, NULL, 'Inbound Pilot Engagement — GCC Retail Chain', 24000, 'USD', 'new', CURRENT_DATE + 45, 'Initial contact made via website contact form.'),
        (v_d08, v_ws_id, v_c12, 'Levant EdTech Cloud Licensing Pilot', 18500, 'USD', 'new', CURRENT_DATE + 50, 'Inbound inquiry from educational symposium in Amman.'),
        (v_d09, v_ws_id, v_c17, 'Cairo MedTech Supply Chain Visibility', 32000, 'USD', 'new', CURRENT_DATE + 60, 'Contacted through referral network; needs cold-chain shipment alerts.'),

        -- Lost
        (v_d07, v_ws_id, v_c06, 'Lumina Patient Record Integration', 45000, 'USD', 'lost', CURRENT_DATE - 50, 'Lost to incumbent healthcare ERP vendor due to compliance freeze.'),
        (v_d18, v_ws_id, v_c14, 'Hexagon Aviation MRO Tooling Bid', 58000, 'USD', 'lost', CURRENT_DATE - 60, 'Client decided to keep legacy proprietary tool following budget reduction.'),
        (v_d19, v_ws_id, v_c13, 'Atlas Venture Seed Accelerator Batch CRM', 22000, 'USD', 'lost', CURRENT_DATE - 40, 'Postponed until next investment cohort in Q4.')
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        value = EXCLUDED.value,
        stage = EXCLUDED.stage;

    -- 4. Seed 15 Actionable Tasks
    INSERT INTO public.tasks (workspace_id, contact_id, deal_id, title, description, due_date, priority, status)
    VALUES
        -- Due Today
        (v_ws_id, v_c02, v_d02, 'Send revised commercial terms to Zaid Al-Harbi', 'Ensure regional data localization clause is properly cited in Annex B.', NOW() + INTERVAL '3 hours', 'urgent', 'pending'),
        (v_ws_id, v_c15, v_d14, 'Finalize SLA addendum for Al-Otaibi Industrial Group', 'Confirm 99.99% uptime guarantees for manufacturing telemetry sensors.', NOW() + INTERVAL '5 hours', 'high', 'pending'),
        (v_ws_id, v_c09, v_d15, 'Review Thames Reinsurance security whitepaper response', 'Validate SOC2 Type II compliance mapping against UK PRA regulations.', NOW() + INTERVAL '7 hours', 'high', 'in_progress'),
        (v_ws_id, v_c07, v_d10, 'Schedule architecture call with Dr. Fahad Al-Subaie', 'Coordinate with engineering team for solar grid API webhook integration.', NOW() + INTERVAL '2 hours', 'medium', 'pending'),

        -- Overdue
        (v_ws_id, v_c01, v_d01, 'Follow-up call on Hyperion SLA onboarding', 'Check in with Elena regarding engineering sandbox deployment.', NOW() - INTERVAL '36 hours', 'high', 'pending'),
        (v_ws_id, v_c08, v_d12, 'Dispatch product pricing tiers to Amira Khalil', 'Send revised multi-store tier sheet for Nile Retail branches.', NOW() - INTERVAL '20 hours', 'urgent', 'pending'),
        (v_ws_id, v_c10, v_d13, 'Send port logistics integration benchmark to Noura Al-Zahrani', 'Include case study on container turn-around acceleration.', NOW() - INTERVAL '48 hours', 'medium', 'pending'),

        -- Upcoming
        (v_ws_id, v_c03, v_d03, 'Finalize presentation deck for Vance Capital', 'Incorporate revenue projection slides and Q3 roadmap benchmarks.', NOW() + INTERVAL '48 hours', 'high', 'in_progress'),
        (v_ws_id, v_c04, v_d04, 'Conduct initial discovery call with Layla Al-Qadi', 'Map out current dispatch software bottlenecks for regional fleet.', NOW() + INTERVAL '72 hours', 'medium', 'pending'),
        (v_ws_id, v_c16, v_d17, 'Draft co-marketing webinar deck with Charlotte Ward', 'Outline key joint product features and integration benefits.', NOW() + INTERVAL '96 hours', 'low', 'pending'),
        (v_ws_id, v_c18, v_d11, 'Prepare tenant scoring demonstration for Rachel Goldberg', 'Configure demo sandbox with 500 mock commercial leases.', NOW() + INTERVAL '120 hours', 'medium', 'in_progress'),
        (v_ws_id, v_c17, v_d09, 'Reach out to Youssef El-Husseini regarding cold-chain pilot', 'Confirm timeline for Cairo hospital supply chain requirements.', NOW() + INTERVAL '144 hours', 'low', 'pending'),

        -- Completed
        (v_ws_id, v_c05, v_d05, 'Archive contract documentation for Nexus Robotics', 'Upload signed master agreement to secure compliance vault.', NOW() - INTERVAL '10 days', 'low', 'completed'),
        (v_ws_id, v_c11, v_d16, 'Execute Emerald Data Centres telemetry audit', 'Confirmed low latency metrics across European edge nodes.', NOW() - INTERVAL '12 days', 'high', 'completed'),
        (v_ws_id, NULL, NULL, 'Deliver quarterly sales forecast to executive leadership', 'Compiled win rates, average deal size, and sales cycle duration.', NOW() - INTERVAL '8 days', 'medium', 'completed');

    -- 5. Seed 18 Timeline Activities
    INSERT INTO public.activities (workspace_id, contact_id, deal_id, type, description, occurred_at)
    VALUES
        (v_ws_id, v_c01, v_d01, 'meeting', 'Quarterly architecture review and security certification check with Elena Rostova.', NOW() - INTERVAL '2 hours'),
        (v_ws_id, v_c02, v_d02, 'email', 'Sent updated pricing quotation for 500,000 monthly API calls to Zaid Al-Harbi.', NOW() - INTERVAL '5 hours'),
        (v_ws_id, v_c02, v_d02, 'stage_change', 'Opportunity "Fintech API Gateway" moved from Proposal to Negotiation.', NOW() - INTERVAL '14 hours'),
        (v_ws_id, v_c03, v_d03, 'call', 'Brief check-in call with Marcus Vance regarding board feedback on CRM deployment.', NOW() - INTERVAL '26 hours'),
        (v_ws_id, v_c04, v_d04, 'note', 'Client expressed preference for Arabic interface support and localized invoice formats.', NOW() - INTERVAL '40 hours'),
        (v_ws_id, v_c07, v_d10, 'meeting', 'Technical deep-dive on solar farm edge gateway protocols with Dr. Fahad Al-Subaie.', NOW() - INTERVAL '48 hours'),
        (v_ws_id, v_c15, v_d14, 'stage_change', 'Opportunity "Al-Otaibi Industrial Heavy Asset Tracking" moved from Proposal to Negotiation.', NOW() - INTERVAL '54 hours'),
        (v_ws_id, v_c08, v_d12, 'call', 'Discussion with Amira Khalil on omnichannel inventory sync for Nile Retail.', NOW() - INTERVAL '60 hours'),
        (v_ws_id, v_c09, v_d15, 'meeting', 'Compliance and data residency presentation with Arthur Pendleton in London.', NOW() - INTERVAL '72 hours'),
        (v_ws_id, v_c10, v_d13, 'email', 'Sent port container tracking architecture proposal to Noura Al-Zahrani.', NOW() - INTERVAL '84 hours'),
        (v_ws_id, v_c11, v_d16, 'stage_change', 'Opportunity "Emerald Data Centres Infrastructure Telemetry Hub" moved to Won.', NOW() - INTERVAL '96 hours'),
        (v_ws_id, v_c12, v_d08, 'call', 'Introductory scoping call with Huda Al-Masri for EdTech school licensing.', NOW() - INTERVAL '110 hours'),
        (v_ws_id, v_c13, NULL, 'note', 'Atlas Ventures indicated interest in rolling out FlowCRM across 8 portfolio startups.', NOW() - INTERVAL '120 hours'),
        (v_ws_id, v_c16, v_d17, 'meeting', 'Strategic partnership kickoff with Charlotte Ward for Horizon SaaS integration.', NOW() - INTERVAL '140 hours'),
        (v_ws_id, v_c18, v_d11, 'email', 'Shared commercial proposal deck and security whitepaper with Rachel Goldberg.', NOW() - INTERVAL '160 hours'),
        (v_ws_id, v_c17, v_d09, 'call', 'Cold-chain shipment telemetry inquiry with Youssef El-Husseini.', NOW() - INTERVAL '180 hours'),
        (v_ws_id, v_c06, v_d07, 'note', 'Post-mortem on lost deal Lumina Health: recommended adding HIPAA BAA compliance checklist.', NOW() - INTERVAL '200 hours'),
        (v_ws_id, v_c14, v_d18, 'note', 'Post-mortem on Hexagon Aviation bid: customer prioritizes legacy aerospace certifications.', NOW() - INTERVAL '220 hours');

END $$;
