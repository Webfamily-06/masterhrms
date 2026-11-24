"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface CustomQuestionItem {
  id: string;
  question: string;
  required: boolean;
  selected: boolean;
}

export const DEFAULT_CUSTOM_QUESTIONS: CustomQuestionItem[] = [
  { id: "q1", question: "What is your expected salary range?", required: true, selected: true },
  { id: "q2", question: "Do you have any previous experience in this field?", required: true, selected: true },
  { id: "q3", question: "Are you willing to relocate for this position?", required: false, selected: true },
  { id: "q4", question: "What are your career goals for the next 5 years?", required: false, selected: false },
  { id: "q5", question: "Do you have any certifications relevant to this role?", required: false, selected: false },
  { id: "q6", question: "What is your notice period in your current job?", required: true, selected: false },
  { id: "q7", question: "Are you comfortable working in a team environment?", required: true, selected: false },
  { id: "q8", question: "Do you have any questions about the company culture?", required: false, selected: false },
];

function formatDateInput(val?: string | Date | null): string {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

interface RichTextFieldProps {
  label: string;
  required?: boolean;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function RichTextField({ label, required, value, onChange, placeholder }: RichTextFieldProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef<string>(value);

  useEffect(() => {
    if (editorRef.current && value !== lastHtmlRef.current) {
      editorRef.current.innerHTML = value || "";
      lastHtmlRef.current = value || "";
    }
  }, [value]);

  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML && value) {
      editorRef.current.innerHTML = value;
      lastHtmlRef.current = value;
    }
  }, []);

  const exec = (cmd: string, arg?: string) => {
    editorRef.current?.focus();
    try {
      if (cmd === "createLink") {
        const url = window.prompt("Enter URL:");
        if (url) document.execCommand(cmd, false, url);
      } else {
        document.execCommand(cmd, false, arg);
      }
    } catch {
      // ignore unsupported command
    }
    if (editorRef.current) {
      lastHtmlRef.current = editorRef.current.innerHTML;
      onChange(editorRef.current.innerHTML);
    }
  };

  const toolbarButtons = [
    { icon: "ph-text-b", title: "Bold", cmd: "bold" },
    { icon: "ph-text-italic", title: "Italic", cmd: "italic" },
    { icon: "ph-text-strikethrough", title: "Strikethrough", cmd: "strikeThrough" },
    { icon: "ph-text-align-left", title: "Align Left", cmd: "justifyLeft" },
    { icon: "ph-text-align-center", title: "Align Center", cmd: "justifyCenter" },
    { icon: "ph-text-align-right", title: "Align Right", cmd: "justifyRight" },
    { icon: "ph-list-bullets", title: "Bullet List", cmd: "insertUnorderedList" },
    { icon: "ph-list-numbers", title: "Numbered List", cmd: "insertOrderedList" },
    { icon: "ph-quotes", title: "Blockquote", cmd: "formatBlock", arg: "blockquote" },
    { icon: "ph-link", title: "Insert Link", cmd: "createLink" },
    { icon: "ph-eraser", title: "Clear Formatting", cmd: "removeFormat" },
    { icon: "ph-arrow-u-up-left", title: "Undo", cmd: "undo" },
    { icon: "ph-arrow-u-up-right", title: "Redo", cmd: "redo" },
    { icon: "ph-code", title: "Code", cmd: "formatBlock", arg: "pre" },
  ];

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="rounded-lg border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
        <div className="flex flex-wrap items-center gap-1 px-2.5 py-2 border-b border-border/80 bg-muted/30">
          {toolbarButtons.map((btn) => (
            <button
              key={btn.title}
              type="button"
              title={btn.title}
              onMouseDown={(e) => {
                e.preventDefault();
                exec(btn.cmd, btn.arg);
              }}
              className="h-7 w-7 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <i className={`ph ${btn.icon} text-[15px]`} />
            </button>
          ))}
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onInput={(e) => {
            const html = e.currentTarget.innerHTML;
            lastHtmlRef.current = html;
            onChange(html);
          }}
          className="min-h-[150px] p-3.5 text-sm text-foreground outline-none prose prose-sm max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
        />
      </div>
    </div>
  );
}

interface JobPostingWizardProps {
  mode: "create" | "edit";
  jobId?: string;
}

export function JobPostingWizard({ mode, jobId }: JobPostingWizardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [skillInput, setSkillInput] = useState("");
  const [hydrated, setHydrated] = useState(mode === "create");

  const [form, setForm] = useState({
    title: "",
    jobCode: "",
    typeId: "",
    employmentType: "",
    locationId: "",
    location: "",
    branchId: "",
    departmentId: "",
    priority: "Low",
    skills: [] as string[],
    startDate: new Date().toISOString().slice(0, 10),
    closingDate: "",
    jobApplicationType: "Existing Link",
    applicationUrl: typeof window !== "undefined" ? `${window.location.origin}/careers` : "/careers",
    openingsCount: "1",
    status: "draft",
    featuredJob: false,
    minExperience: "0.0",
    maxExperience: "2.0",
    salaryMin: "",
    salaryMax: "",
    description: "",
    requirements: "",
    benefits: "",
    customQuestions: DEFAULT_CUSTOM_QUESTIONS,
    needToAsk: { gender: false, dateOfBirth: false },
    needToShowOption: { coverLetter: false, termsAndConditions: false },
  });

  // Fetch masters
  const { data: jobTypes = [] } = useQuery({
    queryKey: ["hr-recruitment-job-types"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/job-types").catch(() => []);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const { data: jobLocations = [] } = useQuery({
    queryKey: ["hr-recruitment-job-locations"],
    queryFn: async () => {
      const res: any = await api.get("/hr/recruitment/job-locations").catch(() => []);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["org-branches-all"],
    queryFn: async () => {
      const res: any = await api.get("/hr/organization/branches", { params: { limit: 100 } }).catch(() => []);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["org-departments-all"],
    queryFn: async () => {
      const res: any = await api.get("/hr/organization/departments", { params: { limit: 100 } }).catch(() => []);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  // Fetch existing job posting when editing
  const { data: existingJob, isLoading: isLoadingJob } = useQuery({
    queryKey: ["hr-job-posting-detail", jobId],
    enabled: mode === "edit" && Boolean(jobId),
    queryFn: async () => {
      const res: any = await api.get(`/hr/recruitment/job-postings/${jobId}`);
      return res?.data || res;
    },
  });

  useEffect(() => {
    if (mode === "edit" && existingJob && !hydrated) {
      const savedQuestions: CustomQuestionItem[] =
        Array.isArray(existingJob.customQuestions) && existingJob.customQuestions.length > 0
          ? DEFAULT_CUSTOM_QUESTIONS.map((dq) => {
              const found = existingJob.customQuestions.find(
                (sq: any) => sq.id === dq.id || sq.question === dq.question
              );
              return found ? { ...dq, selected: found.selected !== false } : { ...dq, selected: false };
            })
          : DEFAULT_CUSTOM_QUESTIONS.map((dq) => ({ ...dq, selected: false }));

      setForm({
        title: existingJob.title || "",
        jobCode: existingJob.jobCode || "",
        typeId: existingJob.typeId || "",
        employmentType: existingJob.type?.name || existingJob.employmentType || "Full-time",
        locationId: existingJob.locationId || "",
        location: existingJob.jobLocation?.name || existingJob.location || "",
        branchId: existingJob.branchId || "",
        departmentId: existingJob.departmentId || "",
        priority: existingJob.priority || "Low",
        skills: Array.isArray(existingJob.skills) ? existingJob.skills : [],
        startDate: formatDateInput(existingJob.startDate || existingJob.createdAt),
        closingDate: formatDateInput(existingJob.closingDate),
        jobApplicationType: existingJob.jobApplicationType || "Existing Link",
        applicationUrl:
          existingJob.applicationUrl ||
          (typeof window !== "undefined" ? `${window.location.origin}/careers` : "/careers"),
        openingsCount: String(existingJob.openingsCount ?? 1),
        status: String(existingJob.status || "draft").toLowerCase(),
        featuredJob: Boolean(existingJob.featuredJob),
        minExperience:
          existingJob.minExperience !== undefined && existingJob.minExperience !== null
            ? Number(existingJob.minExperience).toFixed(1)
            : "0.0",
        maxExperience:
          existingJob.maxExperience !== undefined && existingJob.maxExperience !== null
            ? Number(existingJob.maxExperience).toFixed(1)
            : "2.0",
        salaryMin: existingJob.salaryMin !== null && existingJob.salaryMin !== undefined ? String(existingJob.salaryMin) : "",
        salaryMax: existingJob.salaryMax !== null && existingJob.salaryMax !== undefined ? String(existingJob.salaryMax) : "",
        description: existingJob.description || "",
        requirements: existingJob.requirements || "",
        benefits: existingJob.benefits || "",
        customQuestions: savedQuestions,
        needToAsk: existingJob.needToAsk || { gender: false, dateOfBirth: false },
        needToShowOption: existingJob.needToShowOption || { coverLetter: false, termsAndConditions: false },
      });
      setHydrated(true);
    }
  }, [mode, existingJob, hydrated]);

  // Cascading Branch -> Department filter
  const filteredDepartments = useMemo(() => {
    if (!form.branchId) return departments;
    const matched = departments.filter((d: any) => d.branchId === form.branchId);
    return matched.length > 0 ? matched : departments;
  }, [departments, form.branchId]);

  const addSkill = (raw: string) => {
    const clean = raw.trim().replace(/,+$/, "").trim();
    if (!clean) return;
    if (!form.skills.includes(clean)) {
      setForm((prev) => ({ ...prev, skills: [...prev.skills, clean] }));
    }
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setForm((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skill) }));
  };

  const validateStep1 = (): boolean => {
    if (!form.title.trim()) {
      toast.error("Job Title is required.");
      return false;
    }
    if (!form.employmentType.trim()) {
      toast.error("Job Type is required.");
      return false;
    }
    if (!form.location.trim()) {
      toast.error("Location is required.");
      return false;
    }
    if (!form.closingDate) {
      toast.error("Application Deadline is required.");
      return false;
    }
    const pos = Number(form.openingsCount);
    if (!Number.isFinite(pos) || pos < 1) {
      toast.error("Number of Positions must be at least 1.");
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    const minExp = Number(form.minExperience);
    const maxExp = Number(form.maxExperience);
    if (Number.isNaN(minExp) || minExp < 0) {
      toast.error("Min Experience must be 0 or greater.");
      return false;
    }
    if (Number.isNaN(maxExp) || maxExp < minExp) {
      toast.error("Max Experience must be greater than or equal to Min Experience.");
      return false;
    }
    if (form.salaryMin && form.salaryMax && Number(form.salaryMax) < Number(form.salaryMin)) {
      toast.error("Max Salary must be greater than or equal to Min Salary.");
      return false;
    }
    return true;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const stripHtml = (s: string) => s.replace(/<[^>]*>/g, "").trim();
      if (!stripHtml(form.description)) {
        throw new Error("Job Description is required.");
      }

      const payload = {
        title: form.title.trim(),
        jobCode: form.jobCode || undefined,
        typeId: form.typeId || null,
        employmentType: form.employmentType,
        locationId: form.locationId || null,
        location: form.location.trim() || "Remote",
        branchId: form.branchId || null,
        departmentId: form.departmentId || null,
        priority: form.priority,
        skills: form.skills,
        startDate: form.startDate || null,
        closingDate: form.closingDate || null,
        jobApplicationType: form.jobApplicationType,
        applicationUrl: form.applicationUrl,
        openingsCount: Number(form.openingsCount) || 1,
        status: form.status,
        featuredJob: form.featuredJob,
        minExperience: Number(form.minExperience) || 0,
        maxExperience: Number(form.maxExperience) || 0,
        salaryMin: form.salaryMin !== "" ? Number(form.salaryMin) : null,
        salaryMax: form.salaryMax !== "" ? Number(form.salaryMax) : null,
        description: form.description,
        requirements: form.requirements,
        benefits: form.benefits,
        customQuestions: form.customQuestions.filter((q) => q.selected),
        needToAsk: form.needToAsk,
        needToShowOption: form.needToShowOption,
      };

      if (mode === "edit" && jobId) {
        return await api.put(`/hr/recruitment/job-postings/${jobId}`, payload);
      }
      return await api.post("/hr/recruitment/job-postings", payload);
    },
    onSuccess: () => {
      toast.success(mode === "edit" ? "Job posting updated successfully" : "Job posting created successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-job-postings"] });
      if (jobId) {
        queryClient.invalidateQueries({ queryKey: ["hr-job-posting-detail", jobId] });
      }
      router.push("/hr/recruitment/job-postings");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save job posting");
    },
  });

  const steps = [
    { num: 1 as const, label: "Basic Information" },
    { num: 2 as const, label: "Experience & Salary" },
    { num: 3 as const, label: "Job Details" },
  ];

  const typeOptions = useMemo(() => {
    const names = new Set<string>();
    const list: { id: string; name: string }[] = [];
    for (const t of jobTypes) {
      if (t?.isActive === false) continue;
      if (t?.name && !names.has(t.name)) {
        names.add(t.name);
        list.push({ id: t.id, name: t.name });
      }
    }
    return list;
  }, [jobTypes]);

  const activeLocations = useMemo(
    () => jobLocations.filter((l: any) => l?.isActive !== false),
    [jobLocations]
  );

  if (mode === "edit" && isLoadingJob) {
    return (
      <div className="p-4 lg:p-6 w-full space-y-5">
        <div className="h-10 w-64 rounded bg-muted animate-pulse" />
        <div className="h-96 rounded-xl border border-border bg-card animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {mode === "edit" ? "Edit Job Posting" : "Create Job Posting"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {mode === "edit"
              ? "Update the details of an existing job posting."
              : "Create a new job posting and publish open positions for your organization."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/hr/recruitment/job-postings")}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted/60 transition-colors self-start sm:self-auto"
        >
          <i className="ph ph-arrow-left text-sm" />
          Back
        </button>
      </div>

      {/* Main Wizard Outer Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs p-5 lg:p-6 space-y-6">
        {/* 3-Step Horizontal Stepper */}
        <div className="flex items-center justify-between gap-2 px-1">
          {steps.map((s, idx) => {
            const isCompleted = step > s.num;
            const isActive = step === s.num;
            return (
              <React.Fragment key={s.num}>
                <button
                  type="button"
                  onClick={() => {
                    if (s.num < step) setStep(s.num);
                    else if (s.num === 2 && validateStep1()) setStep(2);
                    else if (s.num === 3 && validateStep1() && validateStep2()) setStep(3);
                  }}
                  className="flex items-center gap-2.5 shrink-0 focus:outline-none"
                >
                  <span
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                      isCompleted
                        ? "bg-emerald-500 text-white"
                        : isActive
                          ? "border-2 border-emerald-500 text-emerald-600 bg-emerald-500/5"
                          : "border border-border text-muted-foreground bg-background"
                    }`}
                  >
                    {isCompleted ? <i className="ph-bold ph-check text-xs" /> : s.num}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      isActive
                        ? "text-emerald-600"
                        : isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
                {idx < steps.length - 1 && (
                  <div
                    className={`h-[1.5px] flex-1 mx-2 transition-colors ${
                      step > s.num ? "bg-emerald-500" : "bg-border"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* STEP 1: Basic Information */}
        {step === 1 && (
          <div className="rounded-xl border border-border/80 bg-background overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/80">
              <h2 className="text-sm font-bold text-foreground">Basic Information</h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* Job Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Job Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Customer Support Representative"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                />
              </div>

              {/* Job Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Job Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.employmentType}
                  onChange={(e) => {
                    const name = e.target.value;
                    const matched = typeOptions.find((t) => t.name === name);
                    setForm((p) => ({ ...p, employmentType: name, typeId: matched?.id || "" }));
                  }}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-emerald-500"
                >
                  <option value="">
                    {typeOptions.length === 0 ? "No active Job Types found" : "Select Job Type"}
                  </option>
                  {typeOptions.map((t) => (
                    <option key={t.id || t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                  {form.employmentType && !typeOptions.some((t) => t.name === form.employmentType) && (
                    <option value={form.employmentType}>{form.employmentType}</option>
                  )}
                </select>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Location <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.location}
                  onChange={(e) => {
                    const name = e.target.value;
                    const matched = activeLocations.find((l: any) => l.name === name);
                    setForm((p) => ({ ...p, location: name, locationId: matched?.id || "" }));
                  }}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-emerald-500"
                >
                  <option value="">
                    {activeLocations.length === 0 ? "No active Job Locations found" : "Select Location"}
                  </option>
                  {activeLocations.map((l: any) => (
                    <option key={l.id} value={l.name}>
                      {l.name}
                    </option>
                  ))}
                  {form.location && !activeLocations.some((l: any) => l.name === form.location) && (
                    <option value={form.location}>{form.location}</option>
                  )}
                </select>
              </div>

              {/* Branch */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Branch <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.branchId}
                  onChange={(e) => {
                    const nextBranch = e.target.value;
                    setForm((p) => ({
                      ...p,
                      branchId: nextBranch,
                      departmentId: "",
                    }));
                  }}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-emerald-500"
                >
                  <option value="">Select Branch</option>
                  {branches.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department (Cascading from Branch) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.departmentId}
                  onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-emerald-500"
                >
                  <option value="">Select Department</option>
                  {filteredDepartments.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Priority <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-emerald-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              {/* Required Skills Tag Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Required Skills <span className="text-rose-500">*</span>
                </label>
                <div className="min-h-[36px] px-2 py-1 rounded-lg border border-border bg-background flex flex-wrap items-center gap-1.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15">
                  {form.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs font-medium text-foreground border border-border/70"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="text-muted-foreground hover:text-rose-600 leading-none"
                      >
                        <i className="ph ph-x text-[10px]" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addSkill(skillInput);
                      } else if (e.key === "Backspace" && !skillInput && form.skills.length > 0) {
                        removeSkill(form.skills[form.skills.length - 1]);
                      }
                    }}
                    onBlur={() => {
                      if (skillInput.trim()) addSkill(skillInput);
                    }}
                    placeholder={form.skills.length === 0 ? "Type skill & press Enter..." : "Add skill..."}
                    className="flex-1 min-w-[110px] text-xs bg-transparent outline-none text-foreground py-0.5 px-1"
                  />
                </div>
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              {/* Application Deadline */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Application Deadline <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.closingDate}
                  onChange={(e) => setForm((p) => ({ ...p, closingDate: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              {/* Job Application */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Job Application <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.jobApplicationType}
                  onChange={(e) => setForm((p) => ({ ...p, jobApplicationType: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-emerald-500"
                >
                  <option value="Existing Link">Existing Link</option>
                  <option value="Custom URL">Custom URL</option>
                  <option value="Internal Form">Internal Form</option>
                </select>
              </div>

              {/* Application URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Application URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  value={form.applicationUrl}
                  onChange={(e) => setForm((p) => ({ ...p, applicationUrl: e.target.value }))}
                  placeholder="https://company.com/careers"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              {/* Number of Positions */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Number of Positions <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.openingsCount}
                  onChange={(e) => setForm((p) => ({ ...p, openingsCount: e.target.value.replace(/[^0-9]/g, "") }))}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-emerald-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {/* Featured Job Checkbox */}
              <div className="md:col-span-2 pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.featuredJob}
                    onChange={(e) => setForm((p) => ({ ...p, featuredJob: e.target.checked }))}
                    className="h-4 w-4 rounded border-emerald-500 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                  />
                  <span className="text-xs font-semibold text-foreground">Featured Job</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Experience & Salary */}
        {step === 2 && (
          <div className="rounded-xl border border-border/80 bg-background overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/80">
              <h2 className="text-sm font-bold text-foreground">Experience &amp; Salary</h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Min Experience (Years) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  value={form.minExperience}
                  onChange={(e) => setForm((p) => ({ ...p, minExperience: e.target.value }))}
                  placeholder="0.0"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Max Experience (Years) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  value={form.maxExperience}
                  onChange={(e) => setForm((p) => ({ ...p, maxExperience: e.target.value }))}
                  placeholder="2.0"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Min Salary <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.salaryMin}
                  onChange={(e) => setForm((p) => ({ ...p, salaryMin: e.target.value }))}
                  placeholder="25000.00"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Max Salary <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.salaryMax}
                  onChange={(e) => setForm((p) => ({ ...p, salaryMax: e.target.value }))}
                  placeholder="35000.00"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Job Details */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="rounded-xl border border-border/80 bg-background overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/80">
                <h2 className="text-sm font-bold text-foreground">Job Details</h2>
              </div>
              <div className="p-5 space-y-5">
                <RichTextField
                  label="Job Description"
                  required
                  value={form.description}
                  onChange={(val) => setForm((p) => ({ ...p, description: val }))}
                  placeholder="Provide a clear summary of the role and responsibilities..."
                />
                <RichTextField
                  label="Requirements"
                  required
                  value={form.requirements}
                  onChange={(val) => setForm((p) => ({ ...p, requirements: val }))}
                  placeholder="List education, experience, and skills required..."
                />
                <RichTextField
                  label="Benefits"
                  required
                  value={form.benefits}
                  onChange={(val) => setForm((p) => ({ ...p, benefits: val }))}
                  placeholder="Highlight perks, health benefits, training, and career growth..."
                />
              </div>
            </div>

            {/* Custom Questions Card */}
            <div className="rounded-xl border border-border/80 bg-background overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/80">
                <h2 className="text-sm font-bold text-foreground">Custom Questions</h2>
              </div>
              <div className="p-5 space-y-3">
                {form.customQuestions.map((q) => (
                  <label key={q.id} className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={q.selected}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          customQuestions: p.customQuestions.map((item) =>
                            item.id === q.id ? { ...item, selected: e.target.checked } : item
                          ),
                        }))
                      }
                      className="h-4 w-4 rounded border-emerald-500 text-emerald-600 accent-emerald-600"
                    />
                    <span className="text-xs font-medium text-foreground">
                      {q.question}
                      {q.required && <span className="text-rose-500 ml-1">*</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Need to Ask? & Need to Show Option? */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-xl border border-border/80 bg-background overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border/80">
                  <h2 className="text-sm font-bold text-foreground">Need to Ask?</h2>
                </div>
                <div className="p-5 space-y-3">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.needToAsk.gender}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, needToAsk: { ...p.needToAsk, gender: e.target.checked } }))
                      }
                      className="h-4 w-4 rounded border-emerald-500 text-emerald-600 accent-emerald-600"
                    />
                    <span className="text-xs font-medium text-foreground">Gender</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.needToAsk.dateOfBirth}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, needToAsk: { ...p.needToAsk, dateOfBirth: e.target.checked } }))
                      }
                      className="h-4 w-4 rounded border-emerald-500 text-emerald-600 accent-emerald-600"
                    />
                    <span className="text-xs font-medium text-foreground">Date Of Birth</span>
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-background overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border/80">
                  <h2 className="text-sm font-bold text-foreground">Need to Show Option?</h2>
                </div>
                <div className="p-5 space-y-3">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.needToShowOption.coverLetter}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          needToShowOption: { ...p.needToShowOption, coverLetter: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-emerald-500 text-emerald-600 accent-emerald-600"
                    />
                    <span className="text-xs font-medium text-foreground">Cover Letter</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.needToShowOption.termsAndConditions}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          needToShowOption: { ...p.needToShowOption, termsAndConditions: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-emerald-500 text-emerald-600 accent-emerald-600"
                    />
                    <span className="text-xs font-medium text-foreground">Terms And Conditions</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border bg-background text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors"
              >
                <i className="ph ph-arrow-left text-sm" />
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && validateStep1()) setStep(2);
                  else if (step === 2 && validateStep2()) setStep(3);
                }}
                className="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                Next
                <i className="ph ph-arrow-right text-sm" />
              </button>
            ) : (
              <button
                type="button"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                className="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                {saveMutation.isPending ? (
                  <>
                    <i className="ph ph-spinner animate-spin text-sm" />
                    Saving...
                  </>
                ) : mode === "edit" ? (
                  "Update Job Posting"
                ) : (
                  "Create Job Posting"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
