import { prisma } from "../src/prisma";

const canonicalPages = [
  {
    slug: "home",
    title: "Home — Next-Gen Automation SaaS",
    metaDescription: "Automate your workflows, eliminate manual tasks, and connect enterprise tools with Nexsas.",
    published: true,
    content: {
      hero: {
        eyebrow: "Next-Gen Enterprise Automation",
        title: "Automate your workflows eliminate manual tasks.",
        subtitle: "Connect your tools, design smart workflows, and automate repetitive work — so your business runs on autopilot.",
        primary_cta_text: "Start free trial",
        primary_cta_url: "/pricing",
        secondary_cta_text: "Request a demo",
        secondary_cta_url: "/contact",
      },
      about: {
        tag: "About Nexsas",
        title: "Empowering teams through intelligent automation",
        description: "Webfamily Tech Solutions helps teams automate workflows, connect apps, and ship faster without piling on complexity.",
      },
      features: {
        tag: "Features",
        title: "Real results teams experience",
        description: "From faster workflows to improved collaboration, every feature delivers real, trackable results that teams can rely on every day.",
      },
      cta: {
        title: "Ready to automate your operations?",
        subtitle: "Join over 2,000+ growing teams delivering higher velocity with Master HRMS and Nexsas.",
        button_text: "Start your free trial",
        button_url: "/pricing",
      },
    },
  },
  {
    slug: "about",
    title: "About Us — Story, Culture & Mission",
    metaDescription: "Learn how Nexsas began and the mission that drives our enterprise software innovation.",
    published: true,
    content: {
      hero: {
        eyebrow: "About Our Company",
        title: "How Nexsas began",
        subtitle: "From a small group of systems engineers passionate about eliminating friction to a global platform managing enterprise workflows.",
      },
      mission: {
        eyebrow: "Our Mission",
        title: "Building resilient operations for high-velocity teams",
        description: "We believe software should elevate people, not bury them in administrative overhead.",
      },
      stats: [
        { value: "2020", label: "Founded" },
        { value: "180+", label: "Contributors" },
        { value: "1,200+", label: "Enterprises" },
        { value: "50,000+", label: "Workforce Managed" },
      ],
      cta: {
        title: "Experience the next evolution of ERP & HRMS",
        subtitle: "Schedule a live architecture walkthrough with our engineering leadership.",
        button_text: "Contact Our Team",
        button_url: "/contact",
      },
    },
  },
  {
    slug: "team",
    title: "Our Team — Leadership & Engineers",
    metaDescription: "Meet the minds behind Nexsas and Master HRMS.",
    published: true,
    content: {
      hero: {
        eyebrow: "Our Team",
        title: "The minds behind Nexsas",
        subtitle: "Meet our diverse group of innovators, designers, and engineers dedicated to simplifying workflow automation.",
      },
      sections: [
        {
          title: "Customer-Obsessed",
          body: "Every feature begins and ends with customer empathy.",
          badge: "Core Value",
        },
        {
          title: "Speed & Rigor",
          body: "Rapid iteration paired with bulletproof reliability.",
          badge: "Engineering",
        },
        {
          title: "Autonomous Ownership",
          body: "Teams own outcomes, not tickets.",
          badge: "Culture",
        },
      ],
      cta: {
        title: "Want to join our global team?",
        subtitle: "Explore open engineering, product, and customer success positions.",
        button_text: "View Open Roles",
        button_url: "/careers",
      },
    },
  },
  {
    slug: "pricing",
    title: "Pricing Plans — Scale As You Grow",
    metaDescription: "Simple, predictable plans with no hidden fees for growing teams and global enterprises.",
    published: true,
    content: {
      hero: {
        eyebrow: "Pricing Plans",
        title: "Simple plans for growing teams",
        subtitle: "Start small with our cloud tier or scale across thousands of employees with full enterprise compliance.",
      },
      cta: {
        title: "Need a custom multi-entity deployment?",
        subtitle: "Talk with our solutions engineering team for dedicated hosting and compliance review.",
        button_text: "Contact Sales",
        button_url: "/contact",
      },
    },
  },
  {
    slug: "contact",
    title: "Contact Us — Get in Touch",
    metaDescription: "Reach our global support and solutions team for demonstrations, inquiries, or support.",
    published: true,
    content: {
      hero: {
        eyebrow: "Get in Touch",
        title: "Let's connect and build",
        subtitle: "Have questions about enterprise plans, security reviews, or migration? We're here to help.",
      },
      info: {
        email: "support@webfamily.in",
        phone: "+91 99999 88888",
        address: "Connaught Place, New Delhi, India",
        hours: "Monday - Friday: 9:00 AM - 6:00 PM IST",
      },
      cta: {
        title: "Ready to scale your business?",
        subtitle: "Get started today with automated payroll, biometric tracking, and commercial ERP.",
        button_text: "Start Free Trial",
        button_url: "/pricing",
      },
    },
  },
  {
    slug: "footer",
    title: "Footer Links",
    metaDescription: "Global footer navigation and compliance links.",
    published: true,
    content: {
      copyright: "© 2026 Master HRMS Inc. All rights reserved.",
      brand_description: "Webfamily Tech Solutions helps teams automate workflows, connect the apps they already use, and ship faster—without piling on complexity.",
      legal_links: [
        { to: "/legal/terms-of-service", label: "Terms of Service" },
        { to: "/legal/privacy-policy", label: "Privacy Policy" },
        { to: "/legal/security", label: "Security & Trust" },
        { to: "/legal/cookie-policy", label: "Cookie Policy" },
        { to: "/legal/dpa", label: "Data Processing (DPA)" },
      ],
    },
  },
];

async function seed() {
  console.log("Seeding canonical CMS pages...");
  for (const page of canonicalPages) {
    const existing = await prisma.cmsPage.findUnique({ where: { slug: page.slug } });
    if (!existing) {
      await prisma.cmsPage.create({
        data: {
          slug: page.slug,
          title: page.title,
          metaDescription: page.metaDescription,
          published: page.published,
          content: page.content,
        },
      });
      console.log(`+ Created canonical page: ${page.slug} (${page.title})`);
    } else {
      console.log(`= Page already exists: ${page.slug} (preserving existing content)`);
    }
  }
  console.log("Canonical CMS pages verification complete.");
}

seed()
  .catch((err) => {
    console.error("Failed to seed CMS pages:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
