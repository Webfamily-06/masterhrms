"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { resolveCareerTenantSlug } from "@/lib/career-tenant";
import { CountrySelect } from "@/components/ui/country-select";
import { getStatesByCountry } from "@/lib/address/india-states";
import { useFormDraft } from "@/src/hooks/use-form-draft";

const DEFAULT_SOURCES = [
  "Company Website",
  "LinkedIn",
  "Indeed",
  "Employee Referral",
  "Glassdoor",
  "Campus Drive",
  "Other",
];

const FALLBACK_QUESTIONS = [
  { question: "What is your expected salary range?", required: true },
  { question: "Do you have any previous experience in this field?", required: true },
];

function formatEmploymentType(raw?: string | null): string {
  if (!raw) return "Full-time";
  const map: Record<string, string> = {
    full_time: "Full-time",
    part_time: "Part-time",
    contract: "Contract",
    temporary: "Temporary",
    freelance: "Freelance",
    internship: "Internship",
    remote: "Remote",
    hybrid: "Hybrid",
  };
  return map[raw.toLowerCase()] || raw;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function PublicCareerApplyContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const explicitTenant = searchParams.get("tenant");
  const tenantSlug = useMemo(() => resolveCareerTenantSlug(explicitTenant), [explicitTenant]);
  const tenantQuerySuffix = explicitTenant ? `?tenant=${encodeURIComponent(explicitTenant)}` : "";

  const resumeInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<{ name: string; dataUrl: string } | null>(null);
  const [coverFile, setCoverFile] = useState<{ name: string; dataUrl: string } | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const {
    state: answers,
    setState: setAnswers,
    clearDraft: clearAnswersDraft,
  } = useFormDraft<Record<number, string>>(
    `career-apply-answers::${tenantSlug || "default"}::${id || "job"}`,
    {}
  );

  const {
    state: form,
    setState: setForm,
    hasRestoredDraft,
    clearDraft: clearFormDraft,
  } = useFormDraft(`career-apply-form::${tenantSlug || "default"}::${id || "job"}`, {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    gender: "Male",
    dateOfBirth: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "India",
    currentPosition: "",
    currentCompany: "",
    yearsOfExperience: "",
    currentSalary: "",
    expectedSalary: "",
    coverLetter: "",
    sourceName: "Company Website",
    acceptedTerms: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["public-career-job-detail", tenantSlug, id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res: any = await api.get(
        `/public/jobs/${encodeURIComponent(tenantSlug || "default")}/${encodeURIComponent(id)}`
      );
      return res?.data || res;
    },
  });

  const tenant = data?.tenant || null;
  const job = data?.job || null;
  const apiSources: any[] = Array.isArray(data?.sources) ? data.sources : [];

  const sourceOptions = useMemo(() => {
    const set = new Set<string>(DEFAULT_SOURCES);
    apiSources.forEach((s: any) => {
      if (s?.name) set.add(s.name);
    });
    return Array.from(set);
  }, [apiSources]);

  const questions: { question: string; required: boolean }[] = useMemo(() => {
    if (Array.isArray(job?.customQuestions) && job.customQuestions.length > 0) {
      return job.customQuestions
        .map((q: any) =>
          typeof q === "string"
            ? { question: q, required: true }
            : { question: String(q.question || q.text || ""), required: q.required !== false }
        )
        .filter((q: any) => q.question.trim().length > 0);
    }
    return FALLBACK_QUESTIONS;
  }, [job]);

  useEffect(() => {
    if (job?.title) {
      document.title = `Apply for ${job.title} — ${tenant?.name || "Careers"}`;
    }
  }, [job, tenant]);

  const handleFilePick = async (
    file: File | undefined | null,
    target: "resume" | "cover"
  ) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5 MB");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (target === "resume") setResumeFile({ name: file.name, dataUrl });
      else setCoverFile({ name: file.name, dataUrl });
    } catch {
      toast.error("Could not read selected file");
    }
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = "First name is required.";
    if (!form.lastName.trim()) errs.lastName = "Last name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = "Please enter a valid email address.";
    }
    if (form.phone.trim().replace(/[^0-9]/g, "").length < 7) {
      errs.phone = "Please enter a valid phone number.";
    }
    if (!form.address.trim()) errs.address = "Street address is required.";
    if (!form.city.trim()) errs.city = "City is required.";
    if (!form.state.trim()) errs.state = "State is required.";
    if (!form.zipCode.trim()) errs.zipCode = "ZIP / Postal code is required.";
    if (!form.country.trim()) errs.country = "Country is required.";
    if (!form.currentPosition.trim()) errs.currentPosition = "Current position is required.";
    if (!form.currentCompany.trim()) errs.currentCompany = "Current company is required.";
    if (form.yearsOfExperience === "" || Number(form.yearsOfExperience) < 0) {
      errs.yearsOfExperience = "Enter valid years of experience.";
    }
    if (form.currentSalary === "" || Number(form.currentSalary) < 0) {
      errs.currentSalary = "Enter a valid current salary.";
    }
    if (form.expectedSalary === "" || Number(form.expectedSalary) < 0) {
      errs.expectedSalary = "Enter a valid expected salary.";
    }
    if (!form.coverLetter.trim()) errs.coverLetter = "Cover letter message is required.";
    questions.forEach((q, idx) => {
      if (q.required && !(answers[idx] || "").trim()) {
        errs[`q_${idx}`] = "This question is required.";
      }
    });
    if (!form.acceptedTerms) {
      errs.acceptedTerms = "You must accept the terms and conditions.";
    }
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error(Object.values(errs)[0]);
      return false;
    }
    return true;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!validateForm()) {
        throw new Error("Please fix the highlighted validation errors.");
      }

      const matchedSource = apiSources.find(
        (s: any) => String(s.name || "").toLowerCase() === form.sourceName.toLowerCase()
      );

      const screeningAnswers = questions.map((q, idx) => ({
        question: q.question,
        answer: (answers[idx] || "").trim(),
      }));

      const res: any = await api.post(`/public/jobs/${job.id}/apply`, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        fullName: `${form.firstName.trim()} ${form.lastName.trim()}`,
        email: form.email.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth || null,
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zipCode: form.zipCode.trim(),
        country: form.country,
        currentPosition: form.currentPosition.trim(),
        currentCompany: form.currentCompany.trim(),
        yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : 0,
        currentSalary: form.currentSalary ? Number(form.currentSalary) : null,
        expectedSalary: form.expectedSalary ? Number(form.expectedSalary) : null,
        resumeUrl: resumeFile?.dataUrl || null,
        resumeFileName: resumeFile?.name || null,
        coverLetterUrl: coverFile?.dataUrl || null,
        coverLetterFileName: coverFile?.name || null,
        coverLetter: form.coverLetter.trim(),
        sourceId: matchedSource?.id || null,
        sourceName: form.sourceName,
        screeningAnswers,
        acceptedTerms: form.acceptedTerms,
      });
      return res?.data || res;
    },
    onSuccess: (res: any) => {
      clearFormDraft(false);
      clearAnswersDraft(false);
      toast.success("Application submitted successfully!");
      setSubmittedRef(res?.candidateId || "SUBMITTED");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to submit application");
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-5">
        <div className="h-24 rounded-2xl border border-border bg-card animate-pulse" />
        <div className="h-96 rounded-2xl border border-border bg-card animate-pulse" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-foreground">Job opening not found</h1>
        <Link
          href={`/careers${tenantQuerySuffix}`}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
        >
          Back to All Jobs
        </Link>
      </div>
    );
  }

  const branchName = job.branch?.name || tenant?.name || "Main Office";
  const locationName = job.jobLocation?.name || job.location || "Remote";
  const typeName = job.type?.name || formatEmploymentType(job.employmentType);

  if (submittedRef) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="rounded-2xl border border-border/80 bg-card p-8 shadow-xs text-center space-y-5">
          <div className="h-14 w-14 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
            <i className="ph-fill ph-check-circle text-3xl" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-foreground">Application Submitted!</h1>
            <p className="text-xs text-muted-foreground">
              Thank you for applying for <span className="font-semibold text-foreground">{job.title}</span> at{" "}
              <span className="font-semibold text-foreground">{tenant?.name || branchName}</span>. Our hiring team will review your profile shortly.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-muted text-xs text-foreground">
            Reference ID: {submittedRef}
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href={`/careers${tenantQuerySuffix}`}
              className="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              Browse More Jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border/80 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
          <Link href={`/careers${tenantQuerySuffix}`} className="flex items-center gap-3">
            {tenant?.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt={tenant.name}
                className="h-9 w-9 rounded-lg object-contain border border-border bg-background p-1"
              />
            ) : (
              <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                {(tenant?.name || "C").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">
                {tenant?.name || "Company Careers"}
              </p>
              <p className="text-[11px] text-muted-foreground">Job Application</p>
            </div>
          </Link>
        </div>
      </header>

      <main data-draft-managed="true" className="flex-1 max-w-4xl w-full mx-auto px-4 lg:px-6 py-8 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/careers/${job.id}${tenantQuerySuffix}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
          >
            <i className="ph ph-arrow-left text-sm" />
            Back to Job Details
          </Link>
          {hasRestoredDraft && (
            <button
              type="button"
              onClick={() => {
                clearFormDraft(true);
                clearAnswersDraft(true);
                toast.info("Saved application draft cleared.");
              }}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 text-xs font-semibold hover:bg-rose-500/20 transition-colors cursor-pointer"
            >
              <i className="ph ph-trash" />
              Clear Saved Draft
            </button>
          )}
        </div>

        {/* Title Banner Card */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Apply for {job.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {branchName} • {locationName} • {typeName}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitMutation.mutate();
          }}
          className="space-y-5"
        >
          {/* Personal Information */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <i className="ph ph-user text-base" />
              <span>Personal Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                  placeholder="Enter your first name"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.lastName}
                  onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                  placeholder="Enter your last name"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="your.email@example.com"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:border-emerald-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Date of Birth</label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Street address"
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Country <span className="text-rose-500">*</span>
                </label>
                <CountrySelect
                  value={form.country}
                  onValueChange={(val) =>
                    setForm((p) => ({
                      ...p,
                      country: val,
                      state: p.country !== val ? "" : p.state,
                    }))
                  }
                  placeholder="Select country..."
                  className="h-10 text-xs"
                />
                {formErrors.country && <p className="text-[11px] text-rose-600">{formErrors.country}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  State <span className="text-rose-500">*</span>
                </label>
                {getStatesByCountry(form.country).length > 0 ? (
                  <select
                    required
                    value={form.state}
                    onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:border-emerald-500"
                  >
                    <option value="">Select State</option>
                    {getStatesByCountry(form.country).map((st) => (
                      <option key={st.code} value={st.name}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={form.state}
                    onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                    placeholder="State / Province"
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:border-emerald-500"
                  />
                )}
                {formErrors.state && <p className="text-[11px] text-rose-600">{formErrors.state}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  City <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  placeholder="City"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:border-emerald-500"
                />
                {formErrors.city && <p className="text-[11px] text-rose-600">{formErrors.city}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  ZIP Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.zipCode}
                  onChange={(e) => setForm((p) => ({ ...p, zipCode: e.target.value }))}
                  placeholder="12345"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:border-emerald-500"
                />
                {formErrors.zipCode && <p className="text-[11px] text-rose-600">{formErrors.zipCode}</p>}
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-foreground">Professional Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Current Position <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.currentPosition}
                  onChange={(e) => setForm((p) => ({ ...p, currentPosition: e.target.value }))}
                  placeholder="e.g., Software Engineer"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Current Company <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.currentCompany}
                  onChange={(e) => setForm((p) => ({ ...p, currentCompany: e.target.value }))}
                  placeholder="e.g., Tech Corp"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Years of Experience <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  required
                  value={form.yearsOfExperience}
                  onChange={(e) => setForm((p) => ({ ...p, yearsOfExperience: e.target.value }))}
                  placeholder="e.g., 2.5"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Current Salary <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={form.currentSalary}
                  onChange={(e) => setForm((p) => ({ ...p, currentSalary: e.target.value }))}
                  placeholder="e.g., 60000"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Expected Salary <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={form.expectedSalary}
                  onChange={(e) => setForm((p) => ({ ...p, expectedSalary: e.target.value }))}
                  placeholder="e.g., 80000"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <i className="ph ph-file-text text-base" />
              <span>Documents</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Resume/CV <span className="text-rose-500">*</span>
              </label>
              <input
                ref={resumeInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => handleFilePick(e.target.files?.[0], "resume")}
              />
              <div
                onClick={() => resumeInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFilePick(e.dataTransfer.files?.[0], "resume");
                }}
                className="rounded-xl border-2 border-dashed border-border hover:border-blue-500/60 p-7 text-center cursor-pointer transition-colors space-y-2"
              >
                <i className="ph ph-upload-simple text-2xl text-muted-foreground" />
                {resumeFile ? (
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700">
                    <i className="ph ph-file-pdf text-base" />
                    <span>{resumeFile.name}</span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    <span className="text-blue-600 font-semibold">Upload your resume</span> or drag and drop
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Cover Letter <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <input
                ref={coverInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => handleFilePick(e.target.files?.[0], "cover")}
              />
              <div
                onClick={() => coverInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFilePick(e.dataTransfer.files?.[0], "cover");
                }}
                className="rounded-xl border-2 border-dashed border-border hover:border-blue-500/60 p-7 text-center cursor-pointer transition-colors space-y-2"
              >
                <i className="ph ph-upload-simple text-2xl text-muted-foreground" />
                {coverFile ? (
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700">
                    <i className="ph ph-file-text text-base" />
                    <span>{coverFile.name}</span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    <span className="text-blue-600 font-semibold">Upload cover letter</span> or drag and drop
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-foreground">Additional Information</h2>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Cover Letter Message <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={form.coverLetter}
                onChange={(e) => setForm((p) => ({ ...p, coverLetter: e.target.value }))}
                placeholder="Tell us why you're interested in this position..."
                className="w-full p-3 rounded-lg border border-border bg-background text-xs outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                How did you hear about this position? <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.sourceName}
                onChange={(e) => setForm((p) => ({ ...p, sourceName: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:border-emerald-500"
              >
                {sourceOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Additional Questions */}
          {questions.length > 0 && (
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-foreground">Additional Questions</h2>
              {questions.map((q, idx) => (
                <div key={idx} className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {q.question} {q.required && <span className="text-rose-500">*</span>}
                  </label>
                  <textarea
                    rows={3}
                    required={q.required}
                    value={answers[idx] || ""}
                    onChange={(e) => setAnswers((p) => ({ ...p, [idx]: e.target.value }))}
                    placeholder="Your answer..."
                    className="w-full p-3 rounded-lg border border-border bg-background text-xs outline-none focus:border-emerald-500"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Terms & Conditions */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
            <label className="flex items-center gap-3 cursor-pointer text-xs text-foreground">
              <input
                type="checkbox"
                checked={form.acceptedTerms}
                onChange={(e) => setForm((p) => ({ ...p, acceptedTerms: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-emerald-600"
              />
              <span>I accept the terms and conditions for this position</span>
            </label>
          </div>

          {/* Submit Footer */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.push(`/careers/${job.id}${tenantQuerySuffix}`)}
              className="h-10 px-5 rounded-lg border border-border bg-card hover:bg-muted/60 text-xs font-semibold text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitMutation.isPending || !form.acceptedTerms}
              className="h-10 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-xs"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function PublicCareerApplyPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="h-96 rounded-2xl border border-border bg-card animate-pulse" />
        </div>
      }
    >
      <PublicCareerApplyContent />
    </Suspense>
  );
}
