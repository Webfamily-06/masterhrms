"use client";

import React, { useState } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

interface OptionItem {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

export default function FormSelect2Page() {
  const [singleSelect, setSingleSelect] = useState("eng");
  const [selectedTags, setSelectedTags] = useState<string[]>(["React", "Node.js", "TypeScript"]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<OptionItem>({
    id: "1",
    name: "John Doe",
    role: "Senior Engineering Lead",
    avatar: "/assets/img/avatar/avatar-02.jpg",
  });

  const employees: OptionItem[] = [
    { id: "1", name: "John Doe", role: "Senior Engineering Lead", avatar: "/assets/img/avatar/avatar-02.jpg" },
    { id: "2", name: "Sarah Connor", role: "UI/UX Architect", avatar: "/assets/img/avatar/avatar-04.jpg" },
    { id: "3", name: "Michael Chang", role: "DevOps Specialist", avatar: "/assets/img/avatar/avatar-06.jpg" },
    { id: "4", name: "Elena Rostova", role: "HR Operations Lead", avatar: "/assets/img/avatar/avatar-08.jpg" },
  ];

  const removeTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  const addTag = (tag: string) => {
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Select2 & Tag Comboboxes</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rich searchable selects, multi-select taggers, avatar templated dropdowns, and category selectors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Forms Component
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 1. Templated Avatar Select */}
        <PreviewCard
          title="Templated Employee Select"
          description="Select options enriched with employee avatar photos and job designations."
          code={`<select onChange={handleSelect}>
  {employees.map(e => (
    <option key={e.id} value={e.id}>{e.name} - {e.role}</option>
  ))}
</select>`}
        >
          <div className="p-2 space-y-3">
            <label className="text-xs font-semibold text-foreground block">
              Assign Project Manager
            </label>
            <div className="p-2.5 border border-border rounded-lg bg-card shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={selectedEmployee.avatar}
                  alt={selectedEmployee.name}
                  className="size-8 rounded-full object-cover border border-border"
                />
                <div>
                  <p className="text-xs font-bold text-foreground leading-none">{selectedEmployee.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{selectedEmployee.role}</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-primary px-2 py-0.5 rounded bg-primary/10">
                Selected
              </span>
            </div>

            <div className="space-y-1 pt-1">
              <span className="text-[11px] text-muted-foreground block">Switch Assignee:</span>
              <div className="grid grid-cols-2 gap-2">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => setSelectedEmployee(emp)}
                    className={`p-2 rounded-md border text-left flex items-center gap-2 cursor-pointer transition-colors ${
                      selectedEmployee.id === emp.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <img src={emp.avatar} alt={emp.name} className="size-6 rounded-full object-cover" />
                    <span className="text-xs font-medium truncate text-foreground">{emp.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PreviewCard>

        {/* 2. Multi-Select Tag Input */}
        <PreviewCard
          title="Multi-Select Tag Combobox"
          description="Interactive tag cloud with removal badges and instant tag insertion."
          code={`<div className="flex flex-wrap gap-1.5 p-2 border rounded-md">
  {tags.map(tag => (
    <span key={tag} className="badge bg-primary/10 text-primary">
      {tag} <button onClick={() => remove(tag)}>×</button>
    </span>
  ))}
</div>`}
        >
          <div className="p-2 space-y-3">
            <label className="text-xs font-semibold text-foreground block">
              Required Employee Skills / Certifications
            </label>
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-muted/20 border border-border rounded-lg min-h-[48px]">
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-rose-600 transition-colors cursor-pointer"
                    aria-label={`Remove ${tag}`}
                  >
                    <i className="ph ph-x text-xs" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type skill & press Add (e.g. Next.js, Docker, Payroll Compliance)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(searchTerm.trim());
                    setSearchTerm("");
                  }
                }}
                className="flex-1 p-2 text-xs bg-muted/20 border border-border rounded-md text-foreground focus:outline-hidden focus:border-primary"
              />
              <button
                type="button"
                onClick={() => {
                  addTag(searchTerm.trim());
                  setSearchTerm("");
                }}
                className="bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-4 rounded-md transition-colors cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
