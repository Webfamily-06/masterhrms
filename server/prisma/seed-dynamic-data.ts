import { rawPrisma as prismaClient } from "../src/prisma";
const prisma: any = prismaClient;

export async function seedDynamicDatabase() {
  console.log("🌱 Starting dynamic database seeding...");

  const defaultTenantId = "tenant-default-001";

  // 1. Seed Subscription Plans (Relational MySQL Table)
  const plans = [
    {
      id: "starter",
      name: "Starter Cloud",
      description: "Ideal for small teams automating biometric attendance and payroll.",
      priceMonthly: 199,
      priceAnnual: 1990,
      maxEmployees: 50,
      maxUsers: 10,
      isPopular: false,
      features: [
        "Up to 50 Employees",
        "Biometric Attendance & Leave",
        "Employee Portal",
        "Automated Payslip Generation",
        "Standard Email Support",
      ],
    },
    {
      id: "growth",
      name: "Growth Enterprise",
      description: "Complete autonomous operating system for scaling multi-branch companies.",
      priceMonthly: 399,
      priceAnnual: 3990,
      maxEmployees: 250,
      maxUsers: 50,
      isPopular: true,
      features: [
        "Complete 16-Module HRM Suite",
        "Financials & Double-Entry Ledger",
        "Global Autonomous Payroll",
        "Commercial CRM & Deals",
        "POS Cashier Terminals",
        "500+ Ecosystem Addons",
        "Priority 24/7 SLA Support",
      ],
    },
    {
      id: "sovereign",
      name: "Enterprise Sovereign",
      description: "Dedicated pod architecture with high-security zero-trust isolation.",
      priceMonthly: 799,
      priceAnnual: 7990,
      maxEmployees: 1000,
      maxUsers: 250,
      isPopular: false,
      features: [
        "Dedicated MySQL Database Pod",
        "Custom Single Sign-On (SAML / Okta)",
        "White-Label Custom Domain & Branding",
        "99.999% SLA Uptime Guarantee",
        "Dedicated Enterprise Account Architect",
      ],
    },
  ];

  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        name: p.name,
        description: p.description,
        priceMonthly: p.priceMonthly,
        priceAnnual: p.priceAnnual,
        maxEmployees: p.maxEmployees,
        maxUsers: p.maxUsers,
        isPopular: p.isPopular,
        features: p.features,
      },
      update: {
        name: p.name,
        description: p.description,
        priceMonthly: p.priceMonthly,
        priceAnnual: p.priceAnnual,
        maxEmployees: p.maxEmployees,
        maxUsers: p.maxUsers,
        isPopular: p.isPopular,
        features: p.features,
      },
    });
  }
  console.log(`✅ Subscription Plans seeded (${plans.length} tiers)`);

  // Sync CMS monetization catalog
  await prisma.cmsPage.upsert({
    where: { slug: "system-monetization-plans" },
    create: {
      id: "cms-monetization-plans",
      slug: "system-monetization-plans",
      title: "Monetization Plans & Bank Transfers",
      published: true,
      content: {
        plans: plans.map((p) => ({
          id: p.id,
          name: p.name,
          price_monthly: p.priceMonthly,
          price_annual: p.priceAnnual,
          max_employees: p.maxEmployees,
          max_users: p.maxUsers,
          popular: p.isPopular,
          features: p.features,
        })),
      },
    },
    update: {
      content: {
        plans: plans.map((p) => ({
          id: p.id,
          name: p.name,
          price_monthly: p.priceMonthly,
          price_annual: p.priceAnnual,
          max_employees: p.maxEmployees,
          max_users: p.maxUsers,
          popular: p.isPopular,
          features: p.features,
        })),
      },
    },
  });

  // 2. Seed Ecosystem Addons (Relational MySQL Table)
  const addons = [
    {
      name: "WhatsApp Business Automations",
      slug: "whatsapp-alerts",
      tagline: "Automated payslip, attendance & shift WhatsApp notifications",
      description: "Direct WhatsApp Cloud API gateway sending interactive notification templates, approval buttons, and clock-in reminders to workforce numbers.",
      category: "Communication",
      priceMonthly: 49,
      icon: "MessageSquare",
      features: ["Instant Payslip Dispatch", "Shift Broadcasts", "Late Clock-in Alerts"],
      featured: true,
    },
    {
      name: "Biometric Device Cloud Sync",
      slug: "biometric-sync",
      tagline: "Real-time push gateway for ZKTeco, eSSL, Realtime & Hikvision",
      description: "Plug-and-play ADMS push protocol gateway streaming hardware punch logs directly to payroll ledgers in sub-100ms latency.",
      category: "Hardware",
      priceMonthly: 79,
      icon: "Fingerprint",
      features: ["Live ADMS Push Listener", "Auto-punch Reconciliation", "Geofence Verification"],
      featured: true,
    },
    {
      name: "Neural AI OCR Invoice Reader",
      slug: "ai-ocr",
      tagline: "Extract paper bills and supplier invoices into MySQL ledgers",
      description: "Computer vision and LLM parsing extracting vendor GST, line items, and taxes with automatic general ledger double-entry posting.",
      category: "AI & Automation",
      priceMonthly: 99,
      icon: "Sparkles",
      features: ["Document Drag-and-Drop", "Automatic PO Creation", "Ledger Auto-Posting"],
      featured: true,
    },
    {
      name: "Point of Sale (POS) Retail Suite",
      slug: "pos",
      tagline: "Fast barcode checkout, cash registers & receipt printers",
      description: "High-speed retail counter interface with thermal receipt printing, cash register shifts, barcode scanning, and multi-warehouse stock decrementing.",
      category: "Commerce",
      priceMonthly: 69,
      icon: "Store",
      features: ["Barcode Scanning", "Thermal Printing", "Cash Register Audits"],
      featured: true,
    },
    {
      name: "TallyPrime XML Data Bridge",
      slug: "tally-importer",
      tagline: "Bi-directional ledger & voucher sync with Tally ERP 9 / Prime",
      description: "Import vouchers, customer accounts, and trial balances seamlessly from desktop Tally installations into cloud ledgers.",
      category: "Accounting",
      priceMonthly: 59,
      icon: "Layers",
      features: ["XML Schema Mapping", "Voucher Validation", "Zero Duplicate Safeguard"],
      featured: false,
    },
    {
      name: "Multi-Currency Financials",
      slug: "multi-currency",
      tagline: "Real-time FX rates and foreign currency general ledger accounts",
      description: "Transact globally in 140+ currencies with automatic daily forex revaluation and realized/unrealized gain-loss calculations.",
      category: "Finance",
      priceMonthly: 89,
      icon: "Landmark",
      features: ["140+ Currencies", "Auto FX Sync", "Unrealized Gain Ledgers"],
      featured: false,
    },
  ];

  for (const a of addons) {
    const existing = await prisma.addon.findUnique({ where: { slug: a.slug } });
    if (!existing) {
      await prisma.addon.create({
        data: {
          name: a.name,
          slug: a.slug,
          tagline: a.tagline,
          description: a.description,
          category: a.category,
          priceMonthly: a.priceMonthly,
          icon: a.icon,
          features: a.features,
          featured: a.featured,
          status: "active",
        },
      });
    }
  }
  console.log(`✅ Addons catalog seeded (${addons.length} addons)`);

  // 3. Seed CMS System Landing Page
  const landingContent = {
    appName: "Master ERP & HRMS",
    headline: "One Unified Cloud Platform for Workforce, Finance & Scale.",
    subheadline: "Unify global payroll runs, biometric attendance, double-entry ledgers, POS cashiers, sales CRM pipelines, and 500+ ecosystem addons in one reliable workspace.",
    suites: [
      {
        id: "workforce",
        title: "Workforce & Autonomous Payroll",
        badge: "16 HRM Modules",
        headline: "Automate global payroll, biometric attendance, and workforce lifecycle.",
        desc: "Process multi-currency payroll in under 2 minutes with automated statutory deductions, direct tax computation, and employee self-service payslips.",
        stats: [
          { label: "Processing Speed", value: "< 2 min" },
          { label: "Attendance Precision", value: "99.99%" },
          { label: "Compliance Rate", value: "100% Auto" },
        ],
        features: [
          "Biometric, GPS & mobile clock-in integration",
          "Configurable leave workflows & PTO balance ledgers",
          "Automated salary slip generation with PDF export",
          "Recruitment ATS pipelines and onboarding checklists",
        ],
      },
      {
        id: "finance",
        title: "Financials & Point of Sale",
        badge: "Double-Entry Ledgers",
        headline: "Real-time general ledgers, multi-currency invoicing, and cashflow analytics.",
        desc: "Complete visibility into corporate financials with automated bank reconciliation, double-entry accounting, GST/VAT compliant digital client billing, and POS terminals.",
        stats: [
          { label: "Reconciliation", value: "Real-time" },
          { label: "Currencies", value: "140+ Supported" },
          { label: "Audit Accuracy", value: "100% Verifiable" },
        ],
        features: [
          "Automated balance sheets, profit & loss, and trial balance",
          "Point of Sale checkout with barcode scanning & receipt printing",
          "Recurring subscription invoicing with automatic reminders",
          "Multi-branch cash register tracking and daily closing audits",
        ],
      },
      {
        id: "crm",
        title: "Commercial CRM & Deals",
        badge: "Revenue Velocity",
        headline: "Accelerate quote-to-close with interactive visual pipelines.",
        desc: "Track client relationships from prospecting to signed proposals. Monitor win-rates, automate follow-ups, and generate executive revenue forecasts.",
        stats: [
          { label: "Deal Velocity", value: "+42% MoM" },
          { label: "Quote-to-Close", value: "3.4 Days" },
          { label: "Pipeline Visibility", value: "360° Real-time" },
        ],
        features: [
          "Visual drag-and-drop opportunity Kanban stages",
          "Commercial proposals with digital e-signatures",
          "Lead scoring and automated team assignment rules",
          "Customer lifetime value and churn risk indicators",
        ],
      },
      {
        id: "security",
        title: "Enterprise Multi-Tenancy",
        badge: "Zero-Trust Partitioning",
        headline: "Isolated database architecture with granular role-based access.",
        desc: "Engineered for compliance and scale. Every tenant operates in a cryptographically isolated schema with automatic snapshot backups and sub-20ms edge querying.",
        stats: [
          { label: "Cluster Uptime", value: "99.99%" },
          { label: "Edge Latency", value: "< 18ms" },
          { label: "Data Encryption", value: "AES-256" },
        ],
        features: [
          "Dedicated tenant schema isolation powered by MySQL 8.0 & Prisma",
          "Super Admin 1-click passwordless tenant impersonation",
          "Full audit logging of administrative and financial actions",
          "Automated point-in-time database snapshot recovery",
        ],
      },
    ],
    enterpriseMetrics: [
      { value: "99.99%", label: "Guaranteed SLA Uptime", sub: "Enterprise Cluster Stability" },
      { value: "< 18ms", label: "Average API Latency", sub: "Optimized MySQL Database Engine" },
      { value: "16+", label: "Integrated HRM Modules", sub: "From Hire to Retire" },
      { value: "500+", label: "Ecosystem Addons", sub: "Modular Marketplace Catalog" },
    ],
    testimonials: [
      {
        quote: "Master ERP unified our payroll across 4 regional branches into a 5-minute automated run. The level of speed and UI craftsmanship is unmatched.",
        author: "Priya Sharma",
        title: "Chief Operating Officer",
        company: "Apex Global Technologies",
        avatar: "PS",
      },
      {
        quote: "Replacing three fragmented tools for HR, POS, and Invoicing saved our accounting department over 35 hours every month. The multi-tenant architecture is rock solid.",
        author: "Marcus Vance",
        title: "VP of Enterprise Finance",
        company: "Novus Industries",
        avatar: "MV",
      },
      {
        quote: "The clean design system and real-time attendance clock-in made onboarding 400+ employees effortless. Our team actually enjoys using it every day.",
        author: "Elena Rostova",
        title: "Head of People & Culture",
        company: "Vanguard Mobility",
        avatar: "ER",
      },
    ],
  };

  await prisma.cmsPage.upsert({
    where: { slug: "system-landing-page" },
    create: {
      id: "cms-landing-page",
      slug: "system-landing-page",
      title: "System Landing Page Data",
      published: true,
      content: landingContent,
    },
    update: {
      content: landingContent,
    },
  });
  console.log("✅ Dynamic Landing Page content seeded");

  // 4. Seed Dynamic Holidays for Tenant
  const holidays = [
    { name: "New Year's Day", date: new Date("2026-01-01"), type: "public", description: "Global holiday" },
    { name: "Republic Day", date: new Date("2026-01-26"), type: "public", description: "National holiday" },
    { name: "Labour Day", date: new Date("2026-05-01"), type: "public", description: "International Workers' Day" },
    { name: "Independence Day", date: new Date("2026-08-15"), type: "public", description: "National holiday" },
    { name: "Gandhi Jayanti", date: new Date("2026-10-02"), type: "public", description: "National holiday" },
    { name: "Diwali Deepavali", date: new Date("2026-11-08"), type: "public", description: "Festival of Lights" },
    { name: "Christmas Day", date: new Date("2026-12-25"), type: "public", description: "Christmas celebration" },
  ];

  if (prisma.holiday) {
    for (const h of holidays) {
      const existing = await prisma.holiday.findFirst({
        where: { tenantId: defaultTenantId, name: h.name },
      });
      if (!existing) {
        await prisma.holiday.create({
          data: {
            tenantId: defaultTenantId,
            name: h.name,
            date: h.date,
            type: h.type,
            description: h.description,
          },
        });
      }
    }
    console.log(`✅ Holidays seeded (${holidays.length} holidays)`);
  }

  // 5. Seed Designations for Tenant
  const designations = [
    "Chief Technology Officer",
    "Senior Full Stack Engineer",
    "Frontend Developer",
    "Backend Developer",
    "DevOps Architect",
    "Product Manager",
    "HR Operations Director",
    "Financial Controller",
    "Sales Account Executive",
    "QA Automation Lead",
  ];

  for (const d of designations) {
    const existing = await prisma.designation.findFirst({
      where: { tenantId: defaultTenantId, name: d },
    });
    if (!existing) {
      await prisma.designation.create({
        data: {
          tenantId: defaultTenantId,
          name: d,
          description: `Corporate role: ${d}`,
        },
      });
    }
  }
  console.log(`✅ Designations seeded (${designations.length} roles)`);

  // 6. Seed CRM Contacts & Companies for Tenant
  const companies = [
    { name: "Apex Technologies", industry: "Information Technology", website: "https://apextech.io", location: "Bengaluru, India", employeesCount: "250-500", notes: "Enterprise IT Client" },
    { name: "Vanguard Logistics", industry: "Supply Chain", website: "https://vanguardlogistics.com", location: "Mumbai, India", employeesCount: "500-1000", notes: "National Logistics Provider" },
    { name: "Horizon Health Labs", industry: "Healthcare", website: "https://horizonlabs.org", location: "Chennai, India", employeesCount: "100-250", notes: "Diagnostics and Research Partner" },
  ];

  for (const c of companies) {
    const existing = await prisma.crmCompany.findFirst({
      where: { tenantId: defaultTenantId, name: c.name },
    });
    if (!existing) {
      await prisma.crmCompany.create({
        data: {
          tenantId: defaultTenantId,
          ...c,
        },
      });
    }
  }

  const contacts = [
    { name: "Rajesh Kumar", email: "rajesh@apextech.io", phone: "+91 98450 11223", company: "Apex Technologies", role: "VP Engineering", status: "active" },
    { name: "Ananya Deshmukh", email: "ananya@vanguardlogistics.com", phone: "+91 97120 44556", company: "Vanguard Logistics", role: "Procurement Head", status: "active" },
    { name: "Dr. Vikram Seth", email: "vseth@horizonlabs.org", phone: "+91 94440 77889", company: "Horizon Health Labs", role: "Managing Director", status: "active" },
  ];

  for (const c of contacts) {
    const existing = await prisma.crmContact.findFirst({
      where: { tenantId: defaultTenantId, email: c.email },
    });
    if (!existing) {
      await prisma.crmContact.create({
        data: {
          tenantId: defaultTenantId,
          ...c,
        },
      });
    }
  }
  console.log(`✅ CRM Companies & Contacts seeded`);

  // 7. Seed Todo Items for Tenant
  const todos = [
    { title: "Review monthly payroll statutory deductions", completed: false, priority: "high", dueDate: new Date("2026-10-05") },
    { title: "Audit biometric ADMS hardware push gateway", completed: true, priority: "medium", dueDate: new Date("2026-09-30") },
    { title: "Approve pending annual leave requests", completed: false, priority: "high", dueDate: new Date("2026-10-02") },
    { title: "Reconcile double-entry general ledger", completed: false, priority: "medium", dueDate: new Date("2026-10-10") },
  ];

  if (prisma.todoItem) {
    for (const t of todos) {
      const existing = await prisma.todoItem.findFirst({
        where: { tenantId: defaultTenantId, title: t.title },
      });
      if (!existing) {
        await prisma.todoItem.create({
          data: {
            tenantId: defaultTenantId,
            title: t.title,
            completed: t.completed,
            priority: t.priority,
            dueDate: t.dueDate,
          },
        });
      }
    }
    console.log(`✅ Workspace Todo Items seeded`);
  }

  // 8. Seed Automation Workflows & WhatsApp Rules
  const workflows = [
    {
      name: "Automated Welcome Onboarding Email",
      trigger: "employee_created",
      conditions: { department: "all" },
      actions: [{ type: "send_email", template: "welcome_onboarding" }],
      isActive: true,
    },
    {
      name: "Late Clock-in Attendance Alert",
      trigger: "attendance_late",
      conditions: { graceMinutes: 15 },
      actions: [{ type: "send_whatsapp", template: "late_punch_reminder" }],
      isActive: true,
    },
    {
      name: "High Value Invoice General Ledger Notification",
      trigger: "invoice_created",
      conditions: { minAmount: 100000 },
      actions: [{ type: "notify_manager", channel: "in_app" }],
      isActive: true,
    },
  ];

  if (prisma.automationWorkflow) {
    for (const w of workflows) {
      const existing = await prisma.automationWorkflow.findFirst({
        where: { tenantId: defaultTenantId, name: w.name },
      });
      if (!existing) {
        await prisma.automationWorkflow.create({
          data: {
            tenantId: defaultTenantId,
            name: w.name,
            trigger: w.trigger,
            conditions: w.conditions,
            actions: w.actions,
            isActive: w.isActive,
          },
        });
      }
    }
  }

  if (prisma.whatsappRule) {
    for (const r of whatsappRules) {
      const existing = await prisma.whatsappRule.findFirst({
        where: { tenantId: defaultTenantId, triggerEvent: r.triggerEvent },
      });
      if (!existing) {
        await prisma.whatsappRule.create({
          data: {
            tenantId: defaultTenantId,
            triggerEvent: r.triggerEvent,
            template: r.template,
            recipientType: r.recipientType,
            isActive: r.isActive,
          },
        });
      }
    }
    console.log(`✅ Workflows & WhatsApp Alert Rules seeded`);
  }

  // 9. Seed Custom Domains for Tenant
  const domains = [
    { domain: "portal.tsvsolutions.com", sslStatus: "active", dnsVerified: true, status: "active" },
    { domain: "hrms.tsvsolutions.com", sslStatus: "active", dnsVerified: true, status: "active" },
  ];

  if (prisma.customDomain) {
    for (const d of domains) {
      await prisma.customDomain.upsert({
        where: { domain: d.domain },
        create: {
          tenantId: defaultTenantId,
          domain: d.domain,
          sslStatus: d.sslStatus,
          dnsVerified: d.dnsVerified,
          status: d.status,
        },
        update: {},
      });
    }
    console.log(`✅ Custom Domains seeded`);
  }

  console.log("🎉 Complete Dynamic Database Seeding finished successfully!");
}

seedDynamicDatabase()
  .then(() => {
    console.log("Seeding complete!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  });
