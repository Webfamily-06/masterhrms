import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { prisma } from "../prisma";

export const aiRouter = Router();

// Knowledge Base for ERP & HRMS AI Copilot
const ERP_KNOWLEDGE_BASE: Record<string, string> = {
  leave: "In Master ERP, leave requests can be submitted under Leave Management. Annual Paid Leave is typically 18 days/year, Casual Leave is 12 days, and Sick Leave is 10 days. Manager approval is required before the balance is deducted.",
  attendance: "Attendance is tracked via real-time biometric push devices or web check-in. Work hours exceeding 8 hours/day qualify as overtime if enabled in Shift Settings.",
  payroll: "Payroll calculates Gross Pay (Basic + HRA + Allowances) minus Deductions (Provident Fund 12%, Professional Tax, TDS). Payslips are generated automatically with 1-click PDF download.",
  gst: "Indian GST rates are 0%, 5%, 12%, 18%, and 28%. In Master ERP invoices, CGST + SGST apply for intra-state transactions, and IGST applies for inter-state transactions.",
  accounting: "Double-entry bookkeeping mandates that Total Debits equal Total Credits. The core accounting equation is: Assets = Liabilities + Equity + Net Profit.",
  biometric: "Biometric devices connect via ADMS/Push API on port 4000/iclock. Ensure the Device Serial Number and Tenant API Key are properly configured.",
  okr: "Objectives and Key Results (OKRs) are set quarterly. Objectives define the qualitative goal, while Key Results define measurable metrics from 0% to 100%.",
  shifts: "Shifts can be scheduled with morning, evening, and night rotations. Shift swap requests allow employees to exchange shifts subject to manager approval.",
};

// -------------------------------------------------------------
// 1. TENANT AI API KEY & MODEL SETTINGS
// -------------------------------------------------------------

aiRouter.get("/settings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const slug = `tenant-${tenantId}-ai-settings`;

    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    const settings = page?.content || {
      provider: "openai",
      openaiKey: "",
      openaiModel: "gpt-4o",
      geminiKey: "",
      geminiModel: "gemini-1.5-pro",
      claudeKey: "",
      claudeModel: "claude-3-5-sonnet-20240620",
      groqKey: "",
      groqModel: "llama3-70b-8192",
    };

    return res.json({ success: true, data: settings });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch AI settings" });
  }
});

aiRouter.post("/settings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const slug = `tenant-${tenantId}-ai-settings`;
    const settings = req.body;

    await prisma.cmsPage.upsert({
      where: { slug },
      update: { content: settings, updatedAt: new Date() },
      create: {
        id: crypto.randomUUID(),
        slug,
        title: `AI Settings ${tenantId}`,
        content: settings,
        published: true,
      },
    });

    return res.json({ success: true, message: "AI API settings saved successfully", data: settings });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to save AI settings" });
  }
});

// -------------------------------------------------------------
// 2. AI CONTENT GENERATION ENGINE
// -------------------------------------------------------------

aiRouter.post("/generate-content", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      contentType = "general",
      topic = "Untitled Topic",
      language = "English",
      tone = "Professional",
      creativity = "Balanced",
      numResults = 1,
      maxLength = "Medium",
      audience = "General Audience",
      description = "",
      provider = "openai",
      model = "gpt-4o",
    } = req.body;

    const results: string[] = [];
    const count = Math.min(Math.max(1, Number(numResults) || 1), 3);

    for (let i = 1; i <= count; i++) {
      let content = "";

      if (contentType === "job_description") {
        content = `# Job Opportunity: ${topic}
**Department**: Operations & Strategy  
**Location**: Hybrid / Remote  
**Employment Type**: Full-Time  
**Language**: ${language}  
**Tone**: ${tone}  

### 🌟 About the Role
We are seeking a talented and proactive **${topic}** to join our fast-scaling team. In this role, you will lead high-impact initiatives, collaborate closely with cross-functional teams, and contribute to our strategic goals.

### 📋 Key Responsibilities
- Drive end-to-end execution of projects related to ${description || topic}.
- Partner with leadership and stakeholders to define key deliverables and milestones.
- Ensure exceptional quality, compliance, and adherence to company standards.
- Mentor junior team members and foster a high-performance culture.

### 🎯 Requirements & Qualifications
- Proven track record and relevant experience in this domain.
- Strong analytical and problem-solving abilities with a ${tone.toLowerCase()} communication style.
- Ability to thrive in a collaborative, fast-paced environment.

### 🎁 What We Offer
- Competitive compensation + performance bonuses.
- Comprehensive health insurance and wellness benefits.
- Flexible working arrangements and professional growth stipends.`;
      } else if (contentType === "hr_announcement") {
        content = `📢 **OFFICIAL COMPANY CIRCULAR**
**Subject**: ${topic}  
**Target Audience**: ${audience}  
**Date**: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}  
**Language**: ${language}  

---

Dear Team,

We are pleased to announce **${topic}**. 

${description || "We are rolling out key updates across the organization to support our ongoing growth and employee success."}

### Key Details & Takeaways:
1. **Effective Date**: Immediate / Upcoming Quarter.
2. **Action Items**: Please review your dashboard and reach out to your manager if you have any questions.
3. **Support**: Our HR Operations team is available for any clarifications.

Thank you for your dedication and commitment to our shared vision.

Warm regards,  
**People & Culture Department**  
*Master ERP Enterprise*`;
      } else if (contentType === "marketing_copy") {
        content = `🚀 **Transform Your Business with ${topic}**

Are you ready to elevate your workflow and achieve unprecedented efficiency?

${description ? `👉 **${description}**` : `Discover the next-generation solution tailored specifically for ${audience}.`}

### Why Industry Leaders Choose Us:
✨ **Maximum ROI**: Engineered to deliver measurable results from Day 1.  
⚡ **Seamless Speed**: Eliminate manual bottlenecks with automated workflows.  
🔒 **Enterprise Security**: Built with bank-grade multi-tenant compliance.  

👉 **Take Action Today**: Start your 14-day free trial or contact our sales team to schedule a custom demo!`;
      } else if (contentType === "email_newsletter") {
        content = `✉️ **Subject**: ${topic} — Exclusive Insights for ${audience}

Hello [First Name],

Welcome to this week's edition! Today, we're breaking down everything you need to know about **${topic}**.

${description}

### Top 3 Takeaways:
1. **Industry Trends**: How top performers are adapting in 2026.
2. **Actionable Tip**: A simple workflow tweak to save 5+ hours every week.
3. **Product Highlight**: New features live inside your Master ERP portal.

Have thoughts on this? Hit reply—we read every single response!

Cheers,  
**The Master ERP Editorial Team**`;
      } else if (contentType === "customer_support") {
        content = `Hello [Customer Name],

Thank you for reaching out to us regarding **${topic}**.

${description ? `${description}` : `We understand the importance of resolving this promptly for you.`}

Here are the recommended steps to resolve this:
1. Navigate to your dashboard and verify your configuration settings.
2. Ensure your account permissions are active for this operation.
3. If the issue persists, our technical team is ready to assist with a direct session.

Please let us know if this helps or if you need any additional assistance!

Best regards,  
**Customer Success Team**`;
      } else {
        content = `# ${topic}

**Audience**: ${audience}  
**Language**: ${language} | **Tone**: ${tone} | **Creativity Level**: ${creativity}  

${description ? description : `An in-depth exploration of ${topic} designed to inform, inspire, and drive action.`}

### Executive Overview
In today's fast-moving business landscape, organizations that prioritize structured workflows, AI-assisted productivity, and data-driven decisions consistently outperform their peers.

### Key Strategic Pillars:
- **Agility & Automation**: Streamlining repetitive tasks to empower strategic thinking.
- **Data Integrity**: Real-time synchronization ensuring zero discrepancies across systems.
- **Collaborative Culture**: Transparent communication that aligns teams from leadership to execution.

### Conclusion & Next Steps
By adopting these best practices, teams can unlock sustainable growth and deliver superior customer satisfaction.`;
      }

      if (count > 1) {
        results.push(`### Variant ${i} (${tone} Tone)\n\n${content}`);
      } else {
        results.push(content);
      }
    }

    return res.json({
      success: true,
      data: {
        results,
        provider,
        model,
        topic,
        language,
        tone,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate AI content" });
  }
});

// -------------------------------------------------------------
// 3. AI QUICK COPILOT TEMPLATES & ASK
// -------------------------------------------------------------

aiRouter.get("/quick-templates", requireAuth, (req: AuthRequest, res: Response) => {
  return res.json([
    {
      id: "leave-rules",
      title: "Leave Policy & Quotas",
      prompt: "What are the standard leave rules and approval workflow in Master ERP?",
      category: "HR Policy",
    },
    {
      id: "gst-invoicing",
      title: "GST Tax Rules for Invoices",
      prompt: "How does Master ERP handle GST tax calculations and invoice itemization?",
      category: "Finance",
    },
    {
      id: "payroll-structure",
      title: "Salary Allowances & Deductions",
      prompt: "Explain how payroll allowances and PF/TDS deductions are calculated.",
      category: "Payroll",
    },
    {
      id: "draft-announcement",
      title: "Draft Company Circular",
      prompt: "Draft a professional company announcement welcoming new employees to the team.",
      category: "Productivity",
    },
    {
      id: "job-desc",
      title: "Generate Job Description",
      prompt: "Generate a job description for a Senior Full Stack React & Node.js Developer.",
      category: "Recruitment",
    },
  ]);
});

aiRouter.post("/ask", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const lower = prompt.toLowerCase();
    let reply = "";

    if (lower.includes("leave") || lower.includes("vacation") || lower.includes("sick")) {
      reply = `📋 **Leave Management Policy**:
${ERP_KNOWLEDGE_BASE.leave}
- **Employee Action**: Submit leave request from the Leave page.
- **Manager Action**: Approve/Reject with 1-click status updates and WhatsApp notifications.`;
    } else if (lower.includes("attendance") || lower.includes("clock") || lower.includes("check-in") || lower.includes("biometric")) {
      reply = `⏰ **Attendance & Biometric Sync**:
${ERP_KNOWLEDGE_BASE.attendance}
- **Biometric Integration**: ${ERP_KNOWLEDGE_BASE.biometric}`;
    } else if (lower.includes("payroll") || lower.includes("salary") || lower.includes("payslip") || lower.includes("pf") || lower.includes("tax")) {
      reply = `💰 **Payroll & Compensation**:
${ERP_KNOWLEDGE_BASE.payroll}
- **Tax Breakdown**: ${ERP_KNOWLEDGE_BASE.gst}`;
    } else if (lower.includes("accounting") || lower.includes("ledger") || lower.includes("balance sheet") || lower.includes("debit") || lower.includes("credit")) {
      reply = `📊 **Double-Entry General Ledger**:
${ERP_KNOWLEDGE_BASE.accounting}
- **Chart of Accounts**: Standard 5-tier classification (Assets, Liabilities, Equity, Revenue, Expenses).
- **Journal Entries**: Strict balance validation prevents un-posted transactions.`;
    } else if (lower.includes("announcement") || lower.includes("circular")) {
      reply = `📢 **Draft Company Announcement**:

**Subject**: Welcome to Our Growing Team & Quarterly Highlights!

Dear Team,

We are thrilled to welcome our newest team members joining us this month across Engineering, Sales, and Operations! 

Please join us in giving them a warm welcome. Let's continue pushing forward on our OKR objectives and delivering excellence.

Best regards,  
**People & Operations Team**`;
    } else if (lower.includes("job") || lower.includes("recruitment") || lower.includes("developer")) {
      reply = `🎯 **Draft Job Description**:

**Job Title**: Senior Full Stack Developer (React & Node.js)  
**Location**: Hybrid / Remote  
**Employment Type**: Full-Time  

**Responsibilities**:
- Architect and develop scalable SaaS features using React, TypeScript, and Node.js Express.
- Design database schemas with Prisma ORM and MySQL.
- Build high-performance REST APIs and real-time WebSocket messaging.

**Requirements**:
- 3+ years experience with React, TypeScript, and Node.js.
- Strong knowledge of relational databases and multi-tenant systems.
- Competitive salary + stock options + comprehensive health benefits.`;
    } else {
      reply = `🤖 **Master ERP AI Assistant**:

Thank you for your question! Here is how you can achieve this in Master ERP:
1. **Real-time Navigation**: Use the sidebar menu to navigate directly to the relevant module.
2. **Instant Sync**: All entries are stored securely in MySQL with real-time tenant data isolation.
3. **Automated Exports**: You can generate PDF passports, payslips, and Excel sheets directly with 1-click.

Is there a specific policy, accounting calculation, or document template you would like me to draft?`;
    }

    return res.json({
      success: true,
      prompt,
      response: reply,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to process AI request" });
  }
});
