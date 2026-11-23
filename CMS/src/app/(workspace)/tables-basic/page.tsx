"use client";

import React from "react";
import { PreviewCard } from "@/components/ui/preview-card";

export default function TablesBasicPage() {
  const employees = [
    { id: "EMP-001", name: "Sarah Connor", role: "UI/UX Architect", dept: "Product Design", status: "Active", salary: "₹ 125,000" },
    { id: "EMP-002", name: "Alex Morgan", role: "Full Stack Engineer", dept: "Engineering", status: "Active", salary: "₹ 110,000" },
    { id: "EMP-003", name: "David Kim", role: "Financial Analyst", dept: "Finance", status: "On Leave", salary: "₹ 95,000" },
    { id: "EMP-004", name: "Elena Rostova", role: "Talent Acquisition", dept: "HR", status: "Active", salary: "₹ 85,000" },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Basic Tables</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Semantic HTML tabular layouts for records, salaries, shifts, and departmental breakdowns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Tables Component
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. Basic & Hoverable Table */}
        <PreviewCard
          title="Basic Striped & Hoverable Table"
          description="High-clarity data table with alternating row striping and interactive hover elevation."
          code={`<table className="w-full text-xs text-left">
  <thead>
    <tr><th>ID</th><th>Employee</th><th>Department</th><th>Status</th><th>CTC</th></tr>
  </thead>
  <tbody>
    <!-- Rows -->
  </tbody>
</table>`}
        >
          <div className="overflow-x-auto border border-border/80 rounded-lg">
            <table className="w-full text-xs text-left text-foreground">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Employee Name</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Monthly CTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {employees.map((emp, idx) => (
                  <tr key={emp.id} className={idx % 2 === 0 ? "bg-card hover:bg-muted/40 transition-colors" : "bg-muted/20 hover:bg-muted/40 transition-colors"}>
                    <td className="p-3 font-mono font-semibold text-primary">{emp.id}</td>
                    <td className="p-3 font-semibold text-foreground">{emp.name}</td>
                    <td className="p-3 text-muted-foreground">{emp.role}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted border border-border">
                        {emp.dept}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                          emp.status === "Active"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-medium">{emp.salary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PreviewCard>

        {/* 2. Bordered Card Table */}
        <PreviewCard
          title="Bordered Table with Inline Action Buttons"
          description="Contained cell borders with quick management triggers."
          code={`<td className="border p-2">
  <button className="text-primary hover:underline">Edit</button>
</td>`}
        >
          <div className="overflow-x-auto border border-border/80 rounded-lg">
            <table className="w-full text-xs text-left text-foreground border-collapse">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/80">
                <tr>
                  <th className="p-3 border-r border-border/60">Module Component</th>
                  <th className="p-3 border-r border-border/60">Status</th>
                  <th className="p-3 border-r border-border/60">Version</th>
                  <th className="p-3 text-center">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr className="hover:bg-muted/30">
                  <td className="p-3 border-r border-border/60 font-semibold">Core Attendance Engine</td>
                  <td className="p-3 border-r border-border/60 text-emerald-600 font-semibold">Healthy</td>
                  <td className="p-3 border-r border-border/60 font-mono text-[11px]">v4.2.0</td>
                  <td className="p-3 text-center">
                    <button type="button" className="text-primary hover:underline font-semibold cursor-pointer">
                      Inspect
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="p-3 border-r border-border/60 font-semibold">Biometrics WebPush Syncer</td>
                  <td className="p-3 border-r border-border/60 text-emerald-600 font-semibold">Healthy</td>
                  <td className="p-3 border-r border-border/60 font-mono text-[11px]">v2.1.8</td>
                  <td className="p-3 text-center">
                    <button type="button" className="text-primary hover:underline font-semibold cursor-pointer">
                      Inspect
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
