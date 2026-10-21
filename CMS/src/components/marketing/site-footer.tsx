import { Link } from "@/lib/router-compat";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MessageCircle, Mail, Phone, MapPin } from "lucide-react";
import type { CSSProperties, SVGProps, ComponentType } from "react";

type FooterLink = { label: string; to: string; external?: boolean };
type FooterColumn = { title: string; links: FooterLink[] };

type FooterStyle = {
  background?: string;
  foreground?: string;
  muted_foreground?: string;
  heading?: string;
  accent?: string;
  border?: string;
  bar_background?: string;
  bar_foreground?: string;
  padding_y?: string;
};

type FooterContent = {
  logo_text?: string;
  tagline?: string;
  socials?: { facebook?: string; instagram?: string; whatsapp?: string; linkedin?: string };
  app_store_url?: string;
  play_store_url?: string;
  app_store_image?: string;
  play_store_image?: string;
  contact?: { location?: string; phone?: string; email?: string };
  copyright?: string;
  legal_links?: FooterLink[];
  columns?: FooterColumn[]; // Row 1 (cols 2-4) + Row 2 (cols 2-4) — up to 6 total
  style?: FooterStyle;
};

const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    title: "ERP Enterprise Suite",
    links: [
      { label: "Financials & Accounting", to: "/product#financials" },
      { label: "Sales & CRM Pipeline", to: "/product#crm" },
      { label: "Supply Chain & Stock", to: "/product#inventory" },
      { label: "Procurement & POs", to: "/product#procurement" },
      { label: "BI Enterprise Analytics", to: "/product#bi" },
      { label: "Project & Time Billing", to: "/product#projects" },
      { label: "Assets Management", to: "/product#assets" },
      { label: "Multi-Entity Consolidation", to: "/product#financials" },
    ],
  },
  {
    title: "HRMS & Workforce Suite",
    links: [
      { label: "Core HR & Directory", to: "/product#core-hr" },
      { label: "Global Payroll & Tax", to: "/product#payroll" },
      { label: "Time & Geo-Attendance", to: "/product#attendance" },
      { label: "Leave & Expense Claims", to: "/product#leave" },
      { label: "ATS & Recruitment", to: "/product#recruitment" },
      { label: "OKRs & Performance", to: "/product#performance" },
      { label: "LMS & Certifications", to: "/product#lms" },
      { label: "Helpdesk & Service SLA", to: "/product#helpdesk" },
    ],
  },
  {
    title: "Marketplace & Addons",
    links: [
      { label: "500+ Addon Store", to: "/addons" },
      { label: "WhatsApp Alerts Engine", to: "/addons" },
      { label: "Biometric Device Sync", to: "/addons" },
      { label: "QuickBooks & Tally Sync", to: "/addons" },
      { label: "Stripe & PayPal Sync", to: "/addons" },
      { label: "Google Workspace & Slack SSO", to: "/addons" },
      { label: "REST API & Webhooks", to: "/addons" },
      { label: "GDPR & SOC-2 Compliance", to: "/addons" },
    ],
  },
  {
    title: "Industries & Solutions",
    links: [
      { label: "Manufacturing & MES", to: "/solutions#manufacturing" },
      { label: "Technology & Software", to: "/solutions#tech" },
      { label: "Retail & E-Commerce", to: "/solutions#retail" },
      { label: "BFSI & Financial Services", to: "/solutions#finance" },
      { label: "Healthcare & Life Sciences", to: "/solutions#healthcare" },
      { label: "Education & Public Sector", to: "/solutions#education" },
      { label: "Construction & Real Estate", to: "/solutions" },
      { label: "Global Enterprises", to: "/solutions" },
    ],
  },
  {
    title: "Enterprise Platform",
    links: [
      { label: "Platform Overview", to: "/product" },
      { label: "Pricing in INR (₹)", to: "/pricing" },
      { label: "Compare ERP Systems", to: "/p/compare" },
      { label: "Security & Compliance", to: "/about" },
      { label: "Developer API & Docs", to: "/resources#help" },
      { label: "Tenant Workspace Sign In", to: "/auth" },
    ],
  },
  {
    title: "Resources & Support",
    links: [
      { label: "ERP & HR Insights Blog", to: "/resources#blog" },
      { label: "Enterprise Case Studies", to: "/resources#stories" },
      { label: "Implementation Playbook", to: "/resources#guides" },
      { label: "Helpdesk Ticket Portal", to: "/resources#help" },
      { label: "Contact ERP Specialist", to: "/contact" },
      { label: "Super Admin Console", to: "/super" },
    ],
  },
];

function isExternal(to: string) {
  return /^(https?:)?\/\//.test(to) || to.startsWith("mailto:") || to.startsWith("tel:");
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function SiteFooter() {
  const { data } = useQuery({
    queryKey: ["cms-footer"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/footer");
        return (page?.content ?? {}) as FooterContent;
      } catch {
        return {} as FooterContent;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const f = data ?? {};
  const socials = f.socials ?? {};
  const columns = (f.columns && f.columns.length ? f.columns : DEFAULT_COLUMNS).slice(0, 6);
  const row1 = columns.slice(0, 3); // 3 columns beside brand
  const row2 = columns.slice(3, 6); // 3 columns beside contact

  // Style tokens → CSS variables scoped to the footer element.
  const s = f.style ?? {};
  const styleVars: CSSProperties = {
    ["--ft-bg" as string]: s.background ?? "color-mix(in oklab, var(--secondary) 30%, transparent)",
    ["--ft-fg" as string]: s.foreground ?? "var(--foreground)",
    ["--ft-muted" as string]: s.muted_foreground ?? "var(--muted-foreground)",
    ["--ft-heading" as string]: s.heading ?? "var(--foreground)",
    ["--ft-accent" as string]: s.accent ?? "var(--primary)",
    ["--ft-border" as string]: s.border ?? "var(--border)",
    ["--ft-bar-bg" as string]: s.bar_background ?? "transparent",
    ["--ft-bar-fg" as string]: s.bar_foreground ?? "var(--muted-foreground)",
    ["--ft-py" as string]: s.padding_y ?? "3.5rem",
  };

  return (
    <footer
      aria-label="Site footer"
      className="border-t"
      style={{
        ...styleVars,
        background: "var(--ft-bg)",
        color: "var(--ft-fg)",
        borderColor: "var(--ft-border)",
      }}
    >
      <div
        className="mx-auto w-full max-w-7xl px-4 sm:px-6"
        style={{ paddingTop: "var(--ft-py)", paddingBottom: "var(--ft-py)" }}
      >
        {/* Row 1: brand + up to 3 CMS columns */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <BrandCol f={f} socials={socials} />
          {row1.map((col) => (
            <FooterCol key={col.title} column={col} />
          ))}
        </div>

        {/* Row 2: contact + up to 3 CMS columns */}
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <ContactCol f={f} />
          {row2.map((col) => (
            <FooterCol key={col.title} column={col} />
          ))}
        </div>

        {/* Copyright + legal */}
        <div
          className="mt-10 sm:mt-12 pt-6 flex flex-col gap-4 text-xs lg:flex-row lg:items-center lg:justify-between"
          style={{
            borderTop: "1px solid var(--ft-border)",
            background: "var(--ft-bar-bg)",
            color: "var(--ft-bar-fg)",
          }}
        >
          <span>{f.copyright ?? "© 2026 Webfamily Tech Solutions. All rights reserved."}</span>
          <nav aria-label="Legal">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 lg:justify-end">
              {((f.legal_links && f.legal_links.length > 0) ? f.legal_links : [
                { label: "Terms of Service", to: "/legal/terms-of-service" },
                { label: "Privacy Policy", to: "/legal/privacy-policy" },
                { label: "Security & Trust", to: "/legal/security" },
                { label: "Cookie Policy", to: "/legal/cookie-policy" },
                { label: "Data Processing (DPA)", to: "/legal/dpa" },
              ]).map((l) => (
                <li key={l.label}>
                  <FooterLinkA
                    link={l}
                    className="rounded-sm hover:text-[color:var(--ft-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ft-accent)]"
                  />
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}

function BrandCol({
  f,
  socials,
}: {
  f: FooterContent;
  socials: NonNullable<FooterContent["socials"]>;
}) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains("dark"));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const { data: platformSettings } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-platform-settings");
        return page?.content || null;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  let cachedLogo = "";
  try {
    if (typeof window !== "undefined") {
      cachedLogo = isDark
        ? localStorage.getItem("master_hrms_logo_dark") ||
          localStorage.getItem("master_hrms_logo_light") ||
          ""
        : localStorage.getItem("master_hrms_logo_light") ||
          localStorage.getItem("master_hrms_logo_dark") ||
          "";
    }
  } catch (e) {}

  const activeLogo = isDark
    ? platformSettings?.logoDarkUrl || cachedLogo || "/white-logo.webp"
    : platformSettings?.logoLightUrl || cachedLogo || "/logo.webp";

  const appName = platformSettings?.appName || f.logo_text || "Master HRMS";

  return (
    <div className="min-w-0">
      <Link
        to="/"
        aria-label={`${appName} — Home`}
        className="flex items-center gap-2 font-bold text-lg rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ft-accent)]"
      >
        {activeLogo ? (
          <img
            src={activeLogo}
            alt={appName}
            className="h-9 max-h-11 max-w-[170px] object-contain transition-all duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src = isDark ? "/white-logo.webp" : "/logo.webp";
            }}
            loading="lazy"
          />
        ) : (
          <div className="flex items-center gap-2">
            <div
              className="size-8 shrink-0 rounded-lg bg-primary text-primary-foreground grid place-items-center"
              aria-hidden="true"
            >
              M
            </div>
            <span className="truncate">{appName}</span>
          </div>
        )}
      </Link>
      <p className="mt-3 text-sm" style={{ color: "var(--ft-muted)" }}>
        {f.tagline ?? "The all-in-one HRMS platform for modern teams."}
      </p>
      {(socials.facebook || socials.instagram || socials.whatsapp || socials.linkedin) && (
        <nav aria-label="Social links" className="mt-4">
          <ul className="flex flex-wrap gap-2">
            {socials.facebook && (
              <SocialIcon href={socials.facebook} label="Facebook" Icon={FacebookIcon} />
            )}
            {socials.instagram && (
              <SocialIcon href={socials.instagram} label="Instagram" Icon={InstagramIcon} />
            )}
            {socials.whatsapp && (
              <SocialIcon href={socials.whatsapp} label="WhatsApp" Icon={MessageCircle} />
            )}
            {socials.linkedin && (
              <SocialIcon href={socials.linkedin} label="LinkedIn" Icon={LinkedinIcon} />
            )}
          </ul>
        </nav>
      )}
      {(f.app_store_url || f.play_store_url) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {f.app_store_url && (
            <a
              href={f.app_store_url}
              target="_blank"
              rel="noreferrer"
              aria-label="Download on the App Store"
              className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ft-accent)]"
            >
              <img
                src={
                  f.app_store_image ??
                  "https://developer.apple.com/app-store/marketing/guidelines/images/badge-download-on-the-app-store.svg"
                }
                alt="Download on the App Store"
                className="h-10 w-auto"
                loading="lazy"
              />
            </a>
          )}
          {f.play_store_url && (
            <a
              href={f.play_store_url}
              target="_blank"
              rel="noreferrer"
              aria-label="Get it on Google Play"
              className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ft-accent)]"
            >
              <img
                src={
                  f.play_store_image ??
                  "https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                }
                alt="Get it on Google Play"
                className="h-10 w-auto"
                loading="lazy"
              />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function FacebookIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function LinkedinIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );
}

function SocialIcon({ href, label, Icon }: { href: string; label: string; Icon: ComponentType<{ className?: string }> }) {
  return (
    <li>
      <a
        href={href}
        aria-label={label}
        target="_blank"
        rel="noreferrer"
        className="inline-grid size-11 place-items-center rounded-lg border hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ft-accent)]"
        style={{ borderColor: "var(--ft-border)" }}
      >
        <Icon className="size-4" />
      </a>
    </li>
  );
}

function ContactCol({ f }: { f: FooterContent }) {
  const c = f.contact ?? {};
  const headingId = "footer-contact-heading";
  return (
    <div className="min-w-0">
      <h2 id={headingId} className="text-sm font-semibold" style={{ color: "var(--ft-heading)" }}>
        Contact Us
      </h2>
      <ul
        aria-labelledby={headingId}
        className="mt-4 space-y-3 text-sm"
        style={{ color: "var(--ft-muted)" }}
      >
        {c.location && (
          <li className="flex gap-2">
            <MapPin className="size-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span className="break-words">{c.location}</span>
          </li>
        )}
        {c.phone && (
          <li className="flex gap-2">
            <Phone className="size-4 mt-0.5 shrink-0" aria-hidden="true" />
            <a
              href={`tel:${c.phone}`}
              className="break-words rounded-sm hover:text-[color:var(--ft-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ft-accent)]"
            >
              {c.phone}
            </a>
          </li>
        )}
        {c.email && (
          <li className="flex gap-2">
            <Mail className="size-4 mt-0.5 shrink-0" aria-hidden="true" />
            <a
              href={`mailto:${c.email}`}
              className="break-all rounded-sm hover:text-[color:var(--ft-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ft-accent)]"
            >
              {c.email}
            </a>
          </li>
        )}
        <li className="pt-1">
          <Link
            to="/contact"
            className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ft-accent)]"
            style={{ color: "var(--ft-accent)" }}
          >
            Send a message →
          </Link>
        </li>
      </ul>
    </div>
  );
}

function FooterCol({ column }: { column: FooterColumn }) {
  const headingId = `footer-col-${slugify(column.title)}`;
  return (
    <div className="min-w-0">
      <h2 id={headingId} className="text-sm font-semibold" style={{ color: "var(--ft-heading)" }}>
        {column.title}
      </h2>
      <nav aria-labelledby={headingId} className="mt-4">
        <ul className="space-y-2.5">
          {column.links.map((l) => (
            <li key={`${l.label}-${l.to}`}>
              <FooterLinkA
                link={l}
                className="text-sm rounded-sm hover:text-[color:var(--ft-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ft-accent)]"
                style={{ color: "var(--ft-muted)" }}
              />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function FooterLinkA({
  link,
  className,
  style,
}: {
  link: FooterLink;
  className?: string;
  style?: CSSProperties;
}) {
  if (link.external || isExternal(link.to)) {
    return (
      <a href={link.to} target="_blank" rel="noreferrer" className={className} style={style}>
        {link.label}
      </a>
    );
  }
  return (
    <Link to={link.to} className={className} style={style}>
      {link.label}
    </Link>
  );
}
