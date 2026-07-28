
-- Extend addons with detail fields
ALTER TABLE public.addons
  ADD COLUMN IF NOT EXISTS long_description text,
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS screenshots jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS docs_url text,
  ADD COLUMN IF NOT EXISTS version text DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS gallery_video text;

-- Seed CMS pages (idempotent upserts)
INSERT INTO public.cms_pages (slug, title, meta_description, content, published) VALUES
('footer', 'Site footer',  'Global footer content', '{
  "logo_text": "Master HRMS",
  "tagline": "The all-in-one HRMS platform for modern teams.",
  "socials": {
    "facebook": "https://facebook.com/",
    "instagram": "https://instagram.com/",
    "whatsapp": "https://wa.me/",
    "linkedin": "https://linkedin.com/"
  },
  "app_store_url": "https://apps.apple.com/",
  "play_store_url": "https://play.google.com/",
  "app_store_image": "https://developer.apple.com/app-store/marketing/guidelines/images/badge-download-on-the-app-store.svg",
  "play_store_image": "https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg",
  "contact": { "location": "Chennai, India", "phone": "+91 00000 00000", "email": "hello@masterhrms.com" },
  "copyright": "© 2026 Webfamily Tech Solutions. All rights reserved.",
  "legal_links": [
    {"label":"Terms and Conditions","to":"/legal/terms"},
    {"label":"Privacy Policy","to":"/legal/privacy"},
    {"label":"Refund Policy","to":"/legal/refund"},
    {"label":"DPA Policy","to":"/legal/dpa"},
    {"label":"Security Policy","to":"/legal/security"},
    {"label":"Cookies Policy","to":"/legal/cookies"},
    {"label":"Acceptable Use Policy","to":"/legal/acceptable-use"},
    {"label":"Service Level Agreement","to":"/legal/sla"},
    {"label":"Compliance Statement","to":"/legal/compliance"}
  ]
}'::jsonb, true)
ON CONFLICT (slug) DO NOTHING;

-- Legal pages
INSERT INTO public.cms_pages (slug, title, meta_description, content, published) VALUES
('legal-terms',           'Terms and Conditions', 'Terms and conditions for Master HRMS', '{"body":"These are the standard Terms and Conditions for using Master HRMS. Update this content from the super-admin CMS."}'::jsonb, true),
('legal-privacy',          'Privacy Policy', 'Privacy policy for Master HRMS', '{"body":"This Privacy Policy explains how Master HRMS collects, uses, and safeguards your data."}'::jsonb, true),
('legal-refund',           'Refund Policy', 'Refund policy for Master HRMS', '{"body":"Refunds are handled according to the plan you subscribed to. Full details editable from CMS."}'::jsonb, true),
('legal-dpa',              'Data Processing Agreement', 'DPA for Master HRMS', '{"body":"Data Processing Agreement (DPA) governing the handling of personal data."}'::jsonb, true),
('legal-security',         'Security Policy', 'Security policy for Master HRMS', '{"body":"Our security policy covering encryption, access, incident response and audits."}'::jsonb, true),
('legal-cookies',          'Cookies Policy', 'Cookies policy for Master HRMS', '{"body":"How Master HRMS uses cookies and similar technologies."}'::jsonb, true),
('legal-acceptable-use',   'Acceptable Use Policy', 'Acceptable use policy', '{"body":"Rules for acceptable use of the Master HRMS platform."}'::jsonb, true),
('legal-sla',              'Service Level Agreement', 'SLA for Master HRMS', '{"body":"Master HRMS SLA including uptime commitments and support response times."}'::jsonb, true),
('legal-compliance',       'Compliance Statement', 'Compliance statement', '{"body":"Compliance statement covering GDPR, SOC 2, ISO 27001 and related standards."}'::jsonb, true)
ON CONFLICT (slug) DO NOTHING;

-- Benefits & solutions consolidated page
INSERT INTO public.cms_pages (slug, title, meta_description, content, published) VALUES
('benefits', 'Benefits & Solutions', 'Why choose Master HRMS — benefits for every team', '{
  "hero": {"eyebrow":"Benefits","title":"One HRMS, every team wins","subtitle":"Discover the specific benefits Master HRMS unlocks for every role in your company."},
  "sections": [
    {"title":"Why choose us","body":"Modern, modular, and priced to scale. 500+ addons, one login."},
    {"title":"Benefits for Employees","body":"Self-service, transparency, and mobile-first workflows."},
    {"title":"Benefits for Employers","body":"Full control, real-time analytics, and compliance out of the box."},
    {"title":"For Associations & Partners","body":"White-label the platform, reseller economics, dedicated success."},
    {"title":"Benefits for Marketing Teams","body":"Employer branding, referrals, and internal comms."},
    {"title":"Benefits for HR","body":"Automate 80% of manual work. Focus on strategy, not spreadsheets."},
    {"title":"Benefits for IT Teams","body":"SSO, SCIM, granular RBAC, audit logs, API-first."},
    {"title":"Benefits for Sales Teams","body":"Faster onboarding, transparent incentives, live leaderboards."},
    {"title":"Benefits for Admin","body":"Assets, travel, expenses — all controlled from one console."},
    {"title":"Benefits for Accounts Teams","body":"Automated payroll, tax, and journal entries into your ERP."},
    {"title":"Benefits for Clients","body":"Faster response, embedded portals, transparent invoicing."}
  ]
}'::jsonb, true)
ON CONFLICT (slug) DO NOTHING;

-- Solutions & Industries pages
INSERT INTO public.cms_pages (slug, title, meta_description, content, published) VALUES
('solution-hrms',                    'HRMS Software', 'End-to-end HRMS software', '{"body":"Complete HRMS software covering the entire employee lifecycle."}'::jsonb, true),
('solution-intranet',                'Intranet', 'Modern intranet for your workforce', '{"body":"A social intranet with news, groups, and directories."}'::jsonb, true),
('solution-hr-analytics',            'HR Analytics', 'People analytics dashboards', '{"body":"Real-time people analytics and predictive insights."}'::jsonb, true),
('solution-hrm-software',            'HRM Software', 'Human resource management software', '{"body":"Human resource management for growing companies."}'::jsonb, true),
('solution-leave-attendance',        'Leave and Attendance', 'Leave and attendance management', '{"body":"Policies, balances, shift rosters and geo-attendance."}'::jsonb, true),
('solution-performance-management',  'Performance Management', 'Continuous performance management', '{"body":"OKRs, 1:1s, 360 reviews and calibration."}'::jsonb, true),
('industry-manufacturing',           'Manufacturing Industries', 'HRMS for manufacturing', '{"body":"Shift-based rosters, compliance, and factory-floor attendance."}'::jsonb, true),
('industry-technology',              'Technology', 'HRMS for technology companies', '{"body":"Scale engineering teams with modern people ops."}'::jsonb, true),
('industry-government-ngo',          'Government and NGO', 'HRMS for government and NGOs', '{"body":"Grants, project time tracking, and audit-ready records."}'::jsonb, true),
('solution-okr',                     'OKR', 'Objectives and key results', '{"body":"Align the company with transparent OKRs."}'::jsonb, true)
ON CONFLICT (slug) DO NOTHING;

-- Features list pages
INSERT INTO public.cms_pages (slug, title, meta_description, content, published) VALUES
('feature-hcm',                            'Human Capital Management (HCM)', 'HCM features', '{"body":"Complete HCM covering records, org chart, and lifecycle."}'::jsonb, true),
('feature-payroll-expenses',               'Payroll & Expenses', 'Payroll and expenses', '{"body":"Automated pay runs, statutory filings, and expense reimbursements."}'::jsonb, true),
('feature-talent-acquisition',             'Talent Acquisition Hub', 'ATS and hiring', '{"body":"Job posts, pipelines, interview kits and offers."}'::jsonb, true),
('feature-performance-management',         'Performance Management', 'Performance', '{"body":"OKRs, reviews, 1:1s, calibration."}'::jsonb, true),
('feature-project-timesheet',              'Project & Timesheet', 'Project time tracking', '{"body":"Projects, tasks, billable hours and utilization."}'::jsonb, true),
('feature-employee-experience',            'Employee Experience Platform', 'Employee experience', '{"body":"Engagement, surveys, recognition, and comms."}'::jsonb, true),
('feature-lms',                            'E-learning Management System', 'LMS', '{"body":"Courses, tracks, certifications and quizzes."}'::jsonb, true),
('feature-leaves-attendance',              'Leaves & Attendance', 'Leaves and attendance', '{"body":"Time-off, shift schedules, and biometric integration."}'::jsonb, true),
('feature-workflow-automations',           'Workflow Automations', 'Workflows', '{"body":"No-code approvals, triggers, and integrations."}'::jsonb, true),
('feature-probation-confirmation',         'Probation Confirmation Software', 'Probation', '{"body":"Automate probation reviews and confirmations."}'::jsonb, true),
('feature-workforce-management',           'Workforce Management', 'Workforce management', '{"body":"Capacity planning, rosters, and headcount analytics."}'::jsonb, true),
('feature-contact-management',             'Contact Management Suite', 'Contacts', '{"body":"Unified contact directory for people and partners."}'::jsonb, true),
('feature-predictive-analytics-studio',    'Predictive Analytics Studio', 'Predictive analytics', '{"body":"Attrition, hiring, and cost forecasts."}'::jsonb, true)
ON CONFLICT (slug) DO NOTHING;

-- Compare section
INSERT INTO public.cms_pages (slug, title, meta_description, content, published) VALUES
('compare', 'Compare Master HRMS', 'How Master HRMS compares', '{
  "hero": {"eyebrow":"Compare","title":"See how Master HRMS stacks up","subtitle":"Feature-by-feature comparison against leading HRMS vendors."},
  "vendors": [
    {"name":"Master HRMS","us":true,"notes":"500+ addons, one workspace, transparent pricing"},
    {"name":"Legacy HRMS A","us":false,"notes":"Older UI, add-on fees"},
    {"name":"Legacy HRMS B","us":false,"notes":"Rigid workflows, limited API"}
  ]
}'::jsonb, true)
ON CONFLICT (slug) DO NOTHING;

-- Resources pages
INSERT INTO public.cms_pages (slug, title, meta_description, content, published) VALUES
('resource-ebrochure',      'E-Brochure', 'Master HRMS e-brochure', '{"body":"Download the Master HRMS e-brochure."}'::jsonb, true),
('resource-blogs',          'Blogs', 'HR blogs', '{"body":"Insights and trends from HR leaders."}'::jsonb, true),
('resource-chro',           'CHRO', 'CHRO resources', '{"body":"For Chief Human Resource Officers."}'::jsonb, true),
('resource-case-studies',   'Case Studies', 'Customer case studies', '{"body":"Success stories from Master HRMS customers."}'::jsonb, true),
('resource-hr-calculator',  'HR Calculator', 'HR calculators', '{"body":"Salary, gratuity, PF and other HR calculators."}'::jsonb, true),
('resource-wikis',          'Wikis', 'HR wikis', '{"body":"Community wikis and knowledge base."}'::jsonb, true),
('resource-app-store',      'App Store', 'Master HRMS App Store', '{"body":"Discover and install addons from the marketplace."}'::jsonb, true),
('resource-api-docs',       'API Documentation', 'Master HRMS API docs', '{"body":"REST API reference for Master HRMS."}'::jsonb, true),
('resource-whitepaper',     'Whitepaper', 'HR whitepapers', '{"body":"In-depth research from Master HRMS."}'::jsonb, true),
('resource-podcasts',       'Podcasts', 'HR podcasts', '{"body":"Conversations with HR leaders."}'::jsonb, true),
('resource-hr-tools',       'HR Tools', 'Free HR tools', '{"body":"Free HR tools to help your team."}'::jsonb, true),
('resource-hr-glossary',    'HR Glossary', 'Glossary of HR terms', '{"body":"A-Z HR glossary."}'::jsonb, true),
('resource-guide',          'Guide', 'HR guides', '{"body":"Playbooks and step-by-step guides."}'::jsonb, true),
('resource-checklist',      'Checklist', 'HR checklists', '{"body":"Ready-to-use HR checklists."}'::jsonb, true)
ON CONFLICT (slug) DO NOTHING;
