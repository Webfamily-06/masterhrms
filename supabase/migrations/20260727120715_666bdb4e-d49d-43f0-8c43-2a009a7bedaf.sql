
CREATE TABLE public.cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  meta_description text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  published boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cms_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_pages TO authenticated;
GRANT ALL ON public.cms_pages TO service_role;
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY cms_public_read ON public.cms_pages FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY cms_super_admin_all ON public.cms_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE TRIGGER cms_pages_updated_at BEFORE UPDATE ON public.cms_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text,
  description text,
  category text NOT NULL DEFAULT 'productivity',
  icon text,
  price_monthly numeric NOT NULL DEFAULT 0,
  developer text DEFAULT 'Master HRMS',
  status text NOT NULL DEFAULT 'available',
  featured boolean NOT NULL DEFAULT false,
  install_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.addons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addons TO authenticated;
GRANT ALL ON public.addons TO service_role;
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY addons_public_read ON public.addons FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY addons_super_admin_all ON public.addons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE TRIGGER addons_updated_at BEFORE UPDATE ON public.addons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed CMS pages
INSERT INTO public.cms_pages (slug, title, meta_description, content) VALUES
('home', 'Master HRMS — The Complete HR Platform', 'All-in-one HRMS with 500+ addons. Core HR, payroll, attendance, leave and more.',
 '{"hero":{"eyebrow":"Master HRMS","title":"Run your entire people operations on one platform","subtitle":"Core HR, payroll, attendance, leave, recruitment, performance and 500+ addons — built for modern teams.","primaryCta":"Start free trial","secondaryCta":"Book a demo"},"stats":[{"label":"Companies","value":"12,000+"},{"label":"Employees managed","value":"3M+"},{"label":"Countries","value":"60+"},{"label":"Uptime","value":"99.99%"}]}'::jsonb),
('product', 'Product — Master HRMS', 'Explore every module in Master HRMS.', '{"hero":{"title":"One product. Every HR workflow.","subtitle":"Eight core modules and 500+ addons cover the full employee lifecycle."}}'::jsonb),
('pricing', 'Pricing — Master HRMS', 'Simple per-employee pricing.', '{"hero":{"title":"Simple, transparent pricing","subtitle":"Pay per active employee. Cancel anytime."}}'::jsonb),
('solutions', 'Solutions — Master HRMS', 'HR tailored for your industry.', '{"hero":{"title":"Built for every industry","subtitle":"Prebuilt workflows for IT, manufacturing, healthcare, retail, BFSI and more."}}'::jsonb),
('addons', 'Addon Marketplace — Master HRMS', '500+ addons to extend Master HRMS.', '{"hero":{"title":"The Master HRMS marketplace","subtitle":"Extend your HRMS with 500+ addons built by us and our partners."}}'::jsonb),
('resources', 'Resources — Master HRMS', 'Blog, guides, and case studies.', '{"hero":{"title":"Learn from HR leaders","subtitle":"Guides, case studies and product updates."}}'::jsonb),
('about', 'About — Master HRMS', 'Our mission is to modernise HR.', '{"hero":{"title":"We build the HR platform we always wanted","subtitle":"A remote-first team on a mission to make work better."}}'::jsonb),
('contact', 'Contact — Master HRMS', 'Get in touch with our team.', '{"hero":{"title":"Talk to sales","subtitle":"We reply within one business day."}}'::jsonb);

-- Seed addons
INSERT INTO public.addons (slug, name, tagline, category, icon, price_monthly, featured) VALUES
('slack-sync', 'Slack Sync', 'Post HR events and approvals into Slack.', 'communication', 'MessageSquare', 3, true),
('advanced-payroll-tax', 'Advanced Payroll Tax', 'Multi-country tax engine and statutory filings.', 'finance', 'Receipt', 8, true),
('biometric-attendance', 'Biometric Attendance', 'Sync ZKTeco and Suprema devices in real time.', 'attendance', 'Fingerprint', 5, true),
('okr-goals', 'OKRs & Goals', 'Company, team and individual OKR tracking.', 'performance', 'Target', 4, true),
('ats-plus', 'ATS Plus', 'Advanced recruitment pipeline with AI screening.', 'recruitment', 'Briefcase', 6, false),
('learning-plus', 'Learning Plus', 'Full LMS with courses, quizzes, and certificates.', 'learning', 'GraduationCap', 5, false),
('helpdesk-pro', 'Helpdesk Pro', 'Employee ticketing with SLA and auto-routing.', 'productivity', 'LifeBuoy', 4, false),
('expense-claims', 'Expense Claims', 'Receipts, mileage, and approval workflows.', 'finance', 'Wallet', 3, false),
('travel-desk', 'Travel Desk', 'Business travel requests and approvals.', 'productivity', 'Plane', 3, false),
('mobile-check-in', 'Mobile Geo Check-In', 'GPS-based attendance for field staff.', 'attendance', 'MapPin', 2, false),
('bi-analytics', 'BI Analytics', 'Prebuilt HR dashboards and custom reports.', 'analytics', 'BarChart3', 6, true),
('whatsapp-bot', 'WhatsApp HR Bot', 'Employees interact with HR over WhatsApp.', 'communication', 'MessageCircle', 4, false);
