import { prisma } from "../prisma";

export interface LegalDocDefinition {
  slug: string;
  title: string;
  metaDescription: string;
  body: string;
}

export const AUTHORITATIVE_LEGAL_DOCS: Record<string, LegalDocDefinition> = {
  "legal-terms-of-service": {
    slug: "legal-terms-of-service",
    title: "Terms of Service",
    metaDescription: "Authoritative MasterHRMS SaaS Terms of Service, Acceptable Use, Service Levels, and Multi-Tenant Enterprise Agreements.",
    body: `MASTERHRMS ENTERPRISE CLOUD SERVICE AGREEMENT

Last Updated: October 2026
Effective Date: October 2026

1. Acceptance of Terms & Enterprise Scope
By accessing, provisioning, or utilizing the MasterHRMS cloud enterprise platform ("Service", "Platform", or "System"), provided by Webfamily Solutions ("Provider", "we", "us", or "our"), you ("Customer", "Tenant", or "Enterprise Subscriber") agree to be bound unconditionally by these Terms of Service. If you are entering into this agreement on behalf of an organization or corporate entity, you represent and warrant that you hold full administrative and legal authority to bind such entity to these terms.

2. Cloud Platform Architecture & Autonomous Modules
MasterHRMS provides an integrated, multi-tenant Enterprise Resource Planning (ERP) and Human Resource Management System (HRMS) delivered as a high-availability software-as-a-service application. Platform capabilities include:
- Core Human Resources: Global employee master registry, organizational hierarchies, role-based workflows, and digital document vaults.
- Autonomous Payroll & Statutory Compliance: Multi-entity payroll calculation, tax withholding (TDS, PF, ESI, Professional Tax), direct bank disbursement integrations, and compliance reporting.
- Smart Time, Biometric & Geo-Attendance: Web and mobile punch mechanisms, physical biometric device synchronization (ZKTeco / TCP-IP protocols), geofencing, shift roster management, and overtime regularization.
- Leave & Expense Claims Management: Configurable leave entitlements, multi-tier approval chains, receipt OCR capture, and reimbursement settlements.
- Recruitment & Applicant Tracking (ATS): Career portal hosting, candidate pipeline tracking, interviewer scorecards, offer letter generation, and onboarding workflows.
- Performance & OKRs: Objective Key Results frameworks, 360-degree appraisal cycles, continuous feedback, and performance-to-payroll linkages.
- Learning Management System (LMS): Enterprise training tracks, mandatory compliance modules, video coursework, and automated certification issuance.
- Commercial ERP & Ecosystem Addons: Invoicing, dual-entry accounting ledgers, Point of Sale (POS) cashier terminals, inventory management, and 500+ ecosystem integrations.

3. Tenant Isolation, Account Security & Access Control
- Multi-Tenant Isolation: MasterHRMS implements strict logical separation and tenant-boundary isolation at both application and database layers. Customer data is strictly segregated using cryptographic tenant tokens and database schema boundaries.
- Authentication & SSO: Customer is responsible for configuring access policies, password strength parameters, and Multi-Factor Authentication (MFA). Super Admin credentials and tenant administrator privileges must be protected with enterprise-grade safeguards.
- Credential Security: The Customer is fully responsible for all actions conducted under authenticated user sessions provisioned within its tenant workspace.

4. Subscription Tiers, Billing & Payment Terms
- Subscription Plans: Service access is provisioned under selected subscription tiers (Starter Cloud, Growth Enterprise, or Enterprise Sovereign) on monthly or annual billing cycles.
- Seat Licensing & Expansion: Subscriptions include allocated quotas for active employee seats, user administrative seats, and storage quotas. Employee headcounts exceeding subscription limits are billed at the prevailing rate card.
- Invoicing & Currency: Invoices are issued electronically in Indian Rupees (INR) or specified contract currencies, inclusive of applicable Goods and Services Tax (GST).
- Default & Suspension: Failure to cure invoice delinquency within fifteen (15) calendar days of statutory notice may result in tenant workspace suspension. Data remains archived and preserved during suspension periods.

5. Data Ownership, Privacy & Security Safeguards
- Customer Data Ownership: The Customer retains exclusive and unencumbered ownership of all employee records, corporate data, financial entries, and documents uploaded to the platform. MasterHRMS claims no proprietary interest in Customer Data.
- Enterprise Security & Encryption: Provider implements industry-standard technical and operational safeguards, including TLS 1.3 encryption in transit, AES-256 encryption at rest, regular vulnerability assessments, and automated disaster-recovery failover.
- Statutory Data Protection: Processing of personal information is governed by the MasterHRMS Privacy Policy and Data Processing Addendum (DPA), compliant with applicable data protection statutes including the Digital Personal Data Protection Act (DPDP) and GDPR.

6. Service Level Agreement (SLA) & Maintenance
- Platform Availability: Provider targets 99.9% monthly platform availability, excluding scheduled maintenance windows notified at least 48 hours in advance.
- Redundancy & Backups: System databases undergo continuous transactional replication and daily encrypted off-site snapshots retained according to disaster recovery policies.

7. Acceptable Use & Operational Restrictions
Customer agrees not to:
- Reverse engineer, decompile, or disassemble any portion of the MasterHRMS source codebase, Next.js frontend, or API architecture.
- Circumvent or attempt to tamper with tenant isolation mechanisms, RBAC permission matrices, or subscription enforcement tiers.
- Transmit malicious code, unauthorized scanners, or denial-of-service payloads against the platform infrastructure.
- Use the platform for any unlawful, fraudulent, or harassing activities.

8. Term, Termination & Data Portability
- Term: This agreement remains active for the duration of any active subscription term.
- Termination for Cause: Either party may terminate immediately upon written notice if the other party commits a material breach and fails to cure within thirty (30) days.
- Data Retrieval Guarantee: Upon termination, Customer retains thirty (30) calendar days to export all employee records, payroll histories, and financial ledgers via standardized CSV, Excel, or JSON formats before secure data decommissioning.

9. Limitation of Liability & Indemnification
To the maximum extent permitted by applicable law, neither party shall be liable for indirect, incidental, consequential, punitive, or special damages. Provider's cumulative liability arising out of or related to this agreement shall not exceed the total fees paid by Customer during the twelve (12) months preceding the incident.

10. Governing Law, Dispute Resolution & Jurisdiction
These Terms shall be governed by and construed in accordance with the laws of India. Any dispute, claim, or controversy arising out of or relating to this agreement shall be submitted to binding arbitration in accordance with the Arbitration and Conciliation Act, conducted in English, with exclusive jurisdiction situated in the competent courts of New Delhi, India.

11. Contact & Notices
For legal inquiries, notices, or inquiries regarding these Terms of Service, contact:
Legal Operations Department
Webfamily Solutions / MasterHRMS Platform
Email: legal@webfamily.in | Phone: +91 99999 88888`
  },
  "legal-privacy-policy": {
    slug: "legal-privacy-policy",
    title: "Privacy Policy",
    metaDescription: "MasterHRMS Global Privacy Policy, Employee Data Processing Standards, DPDP & GDPR Compliance Safeguards.",
    body: `MASTERHRMS GLOBAL PRIVACY POLICY & DATA PROTECTION NOTICE

Last Updated: October 2026
Effective Date: October 2026

1. Introduction & Overview
Webfamily Solutions ("MasterHRMS", "we", "our", or "us") is deeply committed to protecting the privacy, confidentiality, and security of personal and organizational data. This Privacy Policy details how we collect, process, store, and safeguard personal information when you interact with the MasterHRMS platform, applications, and web services.

2. Information We Process
We process information in two primary capacities:
A. Customer & Account Administrator Data (Data Controller):
   - Identity & Contact Information: Name, business email, telephone number, corporate designation, and company name.
   - Authentication Details: Hashed credentials, session tokens, audit logs, and Multi-Factor Authentication factors.
   - Billing & Transaction Information: Billing addresses, GST/tax identification numbers, transaction identifiers, and payment status records.

B. Tenant Workforce Data (Data Processor):
   - Employee Profiles: Full legal names, employee identification numbers, dates of birth, blood groups, marital status, and emergency contacts.
   - Compensation & Financial Data: Salary structures, bank account numbers, tax exemptions, PF/ESI registration numbers, and deductions.
   - Time, Attendance & Biometrics: Device punch timestamps, geofenced GPS coordinates (where authorized by employer), and hardware biometric attendance logs.
   - Performance & Talent Records: Appraisals, OKR progress, certifications, leave requests, and training transcripts.

3. Purpose & Legal Basis for Processing
We process personal information under the following legal bases:
- Performance of Contract: To deliver core ERP and HRMS features, calculate automated payroll, manage attendance, and facilitate administrative workflows.
- Compliance with Legal Obligations: To generate statutory tax returns, PF/ESI registers, and maintain audit records required under prevailing labor legislation.
- Legitimate Business Interests: To protect platform security, prevent unauthorized intrusion, detect system fraud, and enhance platform ergonomics.
- Explicit Consent: Where employees voluntarily opt into optional features such as mobile geo-tracking or wellness surveys.

4. Multi-Tenant Segregation & Security Standards
- Multi-Tenant Isolation: MasterHRMS uses strict programmatic barriers, row-level tenant identification keys, and cryptographically verified session headers to ensure that zero commingling of customer data can ever occur.
- Encryption Architecture: All data in transit is encrypted using TLS 1.3 / HTTPS. All sensitive data at rest is encrypted using AES-256 standards.
- Audit Logging: Every modification to employee salary, attendance regularization, or administrative permission generates an immutable audit log entry.

5. Data Sharing & Third-Party Processors
We do NOT sell, rent, or trade personal data. We disclose data solely to:
- Sub-Processors: Vetted cloud infrastructure providers (AWS, Google Cloud, Cloudflare) and transactional messaging gateways operating under strict data processing agreements.
- Authorized Integrations: Third-party services explicitly connected by the Customer administrator.
- Statutory Authorities: Only when strictly required by a valid legal subpoena, court order, or mandatory statutory disclosure request.

6. International Data Transfers & Sovereign Storage
MasterHRMS supports localized data residency. For enterprises operating within India, primary data pods and disaster recovery mirrors reside exclusively within domestic tier-4 data centers adhering to Indian Data Localization requirements. For global enterprises, regional data hosting pods are provisioned in the EU, US, and APAC respectively.

7. Retention & Deletion Schedule
- Active Subscriptions: Data is retained for the duration of the enterprise subscription and in accordance with the Customer's configurable data retention policies.
- Post-Termination Deletion: Following subscription cancellation, data is retained in a soft-deleted status for thirty (30) days, after which all tenant records are permanently expunged.

8. Individual Rights & Data Subject Requests
Under applicable data privacy frameworks (including GDPR, UK GDPR, and India DPDP Act), individuals hold rights to access, review, rectify, or request deletion of their records subject to statutory labor regulations.

9. Data Protection Officer & Contact Information
For privacy questions, compliance audits, or data rights inquiries:
Data Protection Officer (DPO)
MasterHRMS Privacy & Compliance Group
Email: privacy@webfamily.in | Address: Webfamily Solutions, Technology Park, New Delhi, India`
  },
  "legal-security": {
    slug: "legal-security",
    title: "Security & Trust Statement",
    metaDescription: "MasterHRMS Platform Security, Multi-Tenant Architecture, SOC 2 / ISO 27001 Alignment, and Infrastructure Safeguards.",
    body: `MASTERHRMS SECURITY, COMPLIANCE & TRUST FRAMEWORK

Last Updated: October 2026
Effective Date: October 2026

1. Security Philosophy & Architecture
MasterHRMS is built from the ground up on zero-trust principles to protect mission-critical workforce data, financial records, and operational infrastructure. Our defense-in-depth model encompasses application-level hardening, cryptographically isolated tenant pods, continuous automated testing, and comprehensive vulnerability management.

2. Infrastructure & Physical Security
- Tier-4 Cloud Facilities: MasterHRMS services are hosted in enterprise data centers providing 24/7/365 physical security, biometric access control, video surveillance, and redundant uninterruptible power systems.
- High Availability & Fault Tolerance: Production workloads operate across multi-zone active-passive clusters with automated failover and zero-downtime rolling deployments.
- Continuous Backups: Automated point-in-time recovery (PITR) backups are generated continuously, cryptographically encrypted with AES-256, and replicated to geographically separated disaster recovery pods.

3. Cryptographic Standards & Data Protection
- Encryption in Transit: All communications enforce TLS 1.3 with modern cipher suites. Insecure HTTP connections are automatically redirected to HTTPS with HSTS preloading enabled.
- Encryption at Rest: Database volumes, object storage buckets, and backup archives are protected with AES-256 encryption.

4. Multi-Tenant Isolation & Zero Trust
- Logical Boundary Enforcement: Every database query executed by the application pipeline incorporates tenant identification constraints. Cross-tenant data leakage is prevented via programmatic middleware guards.
- Role-Based Access Control (RBAC): Granular role-based permissions ensure employees only view data strictly required for their operational duties.
- Session Management & MFA: System sessions utilize secure HTTP-only cookies with SameSite strict controls, session timeout policies, and native support for MFA and SAML/SSO.

5. Vulnerability Management & Incident Response
- Automated SAST/DAST testing in continuous integration pipelines.
- Web Application Firewall (WAF) and DDoS mitigation layers.
- Annual independent third-party penetration testing.
- 24/7 Incident Response protocol with 72-hour statutory notification commitments.

6. Responsible Disclosure
Security reports should be submitted to security@webfamily.in with detailed reproduction steps.`
  },
  "legal-cookie-policy": {
    slug: "legal-cookie-policy",
    title: "Cookie & Tracking Policy",
    metaDescription: "MasterHRMS Cookie Usage, Session Storage, Tracking Technologies, and Preference Management.",
    body: `MASTERHRMS COOKIE & STORAGE TECHNOLOGIES POLICY

Last Updated: October 2026
Effective Date: October 2026

1. Purpose of This Policy
This Cookie Policy explains how MasterHRMS uses cookies, local storage, session storage, and similar web technologies across our marketing websites and application interfaces.

2. Categories of Cookies We Use
A. Strictly Necessary & Security Cookies:
   - Essential for the technical operation and security of MasterHRMS.
   - Purpose: User authentication, CSRF attack prevention, session token validation, and tenant subdomain routing.
   - Cannot be disabled without breaking application functionality.

B. Functional & Preference Cookies:
   - Remember user interface configurations: Dark/Light theme toggles, collapsed sidebar state, language localization preferences, and table pagination settings.

C. Performance & Diagnostic Cookies:
   - Help us diagnose technical bottlenecks, memory consumption, and client-side page load latency. Anonymized and aggregated.

D. Marketing & Analytics Cookies:
   - Deployed strictly on public marketing pages. Absolutely NO third-party marketing or tracking cookies are ever loaded inside authenticated tenant workspaces.

3. Managing Your Cookie Preferences
You can manage or disable cookie preferences directly through your browser settings. Note that disabling strictly necessary cookies will prevent you from signing in to your MasterHRMS workspace.

4. Contact
Email: privacy@webfamily.in`
  },
  "legal-dpa": {
    slug: "legal-dpa",
    title: "Data Processing Addendum (DPA)",
    metaDescription: "MasterHRMS Enterprise Data Processing Addendum, Standard Contractual Clauses, and Sub-processor Agreements.",
    body: `MASTERHRMS DATA PROCESSING ADDENDUM (DPA)

Last Updated: October 2026
Effective Date: October 2026

1. Scope & Applicability
This Data Processing Addendum ("DPA") supplements the MasterHRMS Enterprise Cloud Service Agreement between Webfamily Solutions ("Processor") and the Customer ("Controller").

2. Roles & Instructions
- Customer is the Data Controller of all employee and corporate records processed within its tenant workspace.
- MasterHRMS is the Data Processor acting strictly upon documented instructions from Customer.

3. Processor Commitments
- Process Personal Data solely in accordance with Customer's documented instructions.
- Ensure all authorized personnel have executed confidentiality agreements.
- Implement comprehensive technical and physical security measures.
- Notify Customer within 48 hours of any confirmed security breach affecting its workspace.
- Assist Customer with data subject access requests and statutory compliance audits.
- Decommission and securely overwrite Customer data following thirty (30) days of subscription termination.`
  }
};

export async function ensureAuthoritativeLegalDocs() {
  for (const doc of Object.values(AUTHORITATIVE_LEGAL_DOCS)) {
    await prisma.cmsPage.upsert({
      where: { slug: doc.slug },
      create: {
        slug: doc.slug,
        title: doc.title,
        metaDescription: doc.metaDescription,
        content: { body: doc.body },
        published: true,
      },
      update: {}, // Preserve any admin edits in MySQL
    });
  }
}
