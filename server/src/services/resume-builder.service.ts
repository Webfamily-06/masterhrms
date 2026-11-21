import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
import crypto from "crypto";

const db = rawPrisma || proxiedPrisma;

export type ResumeTemplate = "MODERN" | "CLASSIC" | "TECH_EXECUTIVE" | "MINIMAL";

export interface ResumeExperience {
  id: string;
  company: string;
  role: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
  highlights: string[];
}

export interface ResumeEducation {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  grade?: string;
}

export interface ResumeSkillGroup {
  category: string;
  skills: string[];
}

export interface ResumeCertification {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
}

export interface ResumeProject {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  link?: string;
}

export interface ResumeDocument {
  id: string;
  tenantId: string;
  candidateId?: string | null;
  employeeId?: string | null;
  title: string;
  template: ResumeTemplate;
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  summary: string;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skillGroups: ResumeSkillGroup[];
  certifications: ResumeCertification[];
  projects: ResumeProject[];
  version: number;
  atsScore?: number; // 0 - 100
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export class ResumeBuilderService {
  private static async getResumesList(tenantId: string): Promise<ResumeDocument[]> {
    const setting = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "resume_builder", key: "resumes" },
    });
    if (setting && (setting.valueJson as any)?.items) {
      return (setting.valueJson as any).items;
    }
    return [];
  }

  private static async saveResumesList(tenantId: string, items: ResumeDocument[]): Promise<void> {
    const existing = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "resume_builder", key: "resumes" },
    });
    if (existing) {
      await db.setting.update({
        where: { id: existing.id },
        data: { valueJson: { items } as any, version: { increment: 1 } },
      });
    } else {
      await db.setting.create({
        data: {
          scope: "TENANT",
          scopeId: tenantId,
          group: "resume_builder",
          key: "resumes",
          valueJson: { items } as any,
          valueType: "json",
          version: 1,
        },
      });
    }
  }

  static async listResumes(
    tenantId: string,
    filters?: { candidateId?: string; employeeId?: string; search?: string }
  ): Promise<ResumeDocument[]> {
    let list = await this.getResumesList(tenantId);

    if (filters?.candidateId) {
      list = list.filter((r) => r.candidateId === filters.candidateId);
    }
    if (filters?.employeeId) {
      list = list.filter((r) => r.employeeId === filters.employeeId);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.fullName.toLowerCase().includes(q) ||
          r.summary.toLowerCase().includes(q)
      );
    }

    return list;
  }

  static async getResume(tenantId: string, id: string): Promise<ResumeDocument | null> {
    const list = await this.getResumesList(tenantId);
    return list.find((r) => r.id === id) || null;
  }

  static async createResume(
    tenantId: string,
    data: {
      title: string;
      fullName: string;
      email: string;
      phone?: string;
      location?: string;
      template?: ResumeTemplate;
      summary: string;
      candidateId?: string;
      employeeId?: string;
      experience?: ResumeExperience[];
      education?: ResumeEducation[];
      skillGroups?: ResumeSkillGroup[];
      certifications?: ResumeCertification[];
      projects?: ResumeProject[];
    },
    userId: string
  ): Promise<ResumeDocument> {
    const list = await this.getResumesList(tenantId);
    const now = new Date().toISOString();

    // Compute basic ATS completeness score
    let score = 40; // baseline
    if (data.experience && data.experience.length > 0) score += 20;
    if (data.education && data.education.length > 0) score += 15;
    if (data.skillGroups && data.skillGroups.length > 0) score += 15;
    if (data.summary && data.summary.length > 100) score += 10;

    const resume: ResumeDocument = {
      id: crypto.randomUUID(),
      tenantId,
      candidateId: data.candidateId || null,
      employeeId: data.employeeId || null,
      title: data.title.trim(),
      template: data.template || "MODERN",
      fullName: data.fullName.trim(),
      email: data.email.trim(),
      phone: data.phone?.trim(),
      location: data.location?.trim(),
      summary: data.summary.trim(),
      experience: data.experience || [],
      education: data.education || [],
      skillGroups: data.skillGroups || [],
      certifications: data.certifications || [],
      projects: data.projects || [],
      version: 1,
      atsScore: Math.min(100, score),
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    list.unshift(resume);
    await this.saveResumesList(tenantId, list);
    return resume;
  }

  static async updateResume(
    tenantId: string,
    id: string,
    updates: Partial<Omit<ResumeDocument, "id" | "tenantId" | "createdAt" | "createdBy">>
  ): Promise<ResumeDocument> {
    const list = await this.getResumesList(tenantId);
    const resume = list.find((r) => r.id === id);
    if (!resume) {
      throw new Error(`Resume '${id}' not found`);
    }

    Object.assign(resume, updates, {
      version: resume.version + 1,
      updatedAt: new Date().toISOString(),
    });

    await this.saveResumesList(tenantId, list);
    return resume;
  }

  static async deleteResume(tenantId: string, id: string): Promise<boolean> {
    let list = await this.getResumesList(tenantId);
    const prevLen = list.length;
    list = list.filter((r) => r.id !== id);
    if (list.length === prevLen) return false;

    await this.saveResumesList(tenantId, list);
    return true;
  }
}
