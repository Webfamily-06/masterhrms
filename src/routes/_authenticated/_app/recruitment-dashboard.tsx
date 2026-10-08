import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/_app/recruitment-dashboard")({
  component: RecruitmentDashboardPage,
  head: () => ({
    meta: [{ title: "Recruitment Analytics | Dreams ERP" }],
  }),
});

export default function RecruitmentDashboardPage() {
  const [filterPeriod, setFilterPeriod] = useState("This Month");

  const { data: recData, isLoading } = useQuery({
    queryKey: ["dashboard-recruitment"],
    queryFn: async () => {
      const res = await api.get<any>("/dashboard/recruitment");
      return res;
    },
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExport = (format: string) => {
    toast.success(`Exporting Recruitment Analytics as ${format}...`);
  };

  return (
    <div className="p-3 lg:py-6 lg:px-0">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 lg:mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-default mb-1">
            <span>HRM</span>
            <i className="ph ph-caret-right text-[10px]"></i>
            <Link to="/hr/recruitment/job-postings" className="hover:text-primary transition-colors">
              Recruitment
            </Link>
            <i className="ph ph-caret-right text-[10px]"></i>
            <span className="text-gray-900 dark:text-slate-100 font-medium">Analytics</span>
          </div>
          <h1 className="text-gray-900 dark:text-slate-100 text-xl font-bold mb-0">Recruitment Analytics</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="btn-sm bg-white dark:bg-slate-900 border border-border-color text-gray-900 dark:text-slate-100 inline-flex items-center gap-2 hover:bg-light dark:hover:bg-slate-800 cursor-pointer shadow-xs rounded-md px-3 py-1.5 text-xs font-medium"
          >
            <i className="ph-duotone ph-printer"></i> Print
          </button>

          <div className="dropdown relative inline-flex">
            <button
              type="button"
              onClick={() => handleExport("PDF")}
              className="btn-sm bg-white dark:bg-slate-900 border border-border-color text-gray-900 dark:text-slate-100 inline-flex items-center gap-2 hover:bg-primary hover:border-primary hover:text-white transition-colors cursor-pointer shadow-xs rounded-md px-3 py-1.5 text-xs font-medium"
            >
              <i className="ph-duotone ph-file-pdf"></i> Export PDF
            </button>
          </div>

          <div className="dropdown relative inline-flex">
            <button
              type="button"
              onClick={() => handleExport("Excel")}
              className="btn-sm bg-white dark:bg-slate-900 border border-border-color text-gray-900 dark:text-slate-100 inline-flex items-center gap-2 hover:bg-primary hover:border-primary hover:text-white transition-colors cursor-pointer shadow-xs rounded-md px-3 py-1.5 text-xs font-medium"
            >
              <i className="ph-duotone ph-file-xls"></i> Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
        {/* Card 1: Active Job Openings */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-default mb-2">Open Job Positions</p>
              <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">{recData?.openJobs ?? 0}</h2>
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded mt-1 inline-block font-medium">
                Active Requisitions
              </span>
            </div>
            <div className="size-9 rounded-md bg-info-transparent flex items-center justify-center">
              <i className="ph-duotone ph-briefcase text-info text-lg"></i>
            </div>
          </div>
        </div>

        {/* Card 2: Total Candidates */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-default mb-2">Total Candidates</p>
              <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">{recData?.totalCandidates ?? 0}</h2>
              <span className="text-[10px] bg-success-transparent text-success px-1.5 py-0.5 rounded mt-1 inline-block font-medium">
                Active in pipeline
              </span>
            </div>
            <div className="size-9 rounded-md bg-success-transparent flex items-center justify-center">
              <i className="ph-duotone ph-users text-success text-lg"></i>
            </div>
          </div>
        </div>

        {/* Card 3: Hired Candidates */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-default mb-2">Hired Candidates</p>
              <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">{recData?.hiredCandidates ?? 0}</h2>
              <span className="text-[10px] bg-purple-transparent text-purple px-1.5 py-0.5 rounded mt-1 inline-block font-medium">
                Successfully Placed
              </span>
            </div>
            <div className="size-9 rounded-md bg-purple-transparent flex items-center justify-center">
              <i className="ph-duotone ph-seal-check text-purple text-lg"></i>
            </div>
          </div>
        </div>

        {/* Card 4: Placement Rate */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-default mb-2">Placement Rate</p>
              <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">
                {recData?.totalCandidates ? `${Math.round(((recData?.hiredCandidates || 0) / recData.totalCandidates) * 100)}%` : "0%"}
              </h2>
              <span className="text-[10px] bg-success-transparent text-success px-1.5 py-0.5 rounded mt-1 inline-block font-medium">
                Hires vs applicants
              </span>
            </div>
            <div className="size-9 rounded-md bg-warning-transparent flex items-center justify-center">
              <i className="ph-duotone ph-chart-line-up text-warning text-lg"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Funnel + Source Effectiveness */}
      <div className="grid grid-cols-12 gap-3 mb-3">
        {/* Left Column: Hiring Funnel */}
        <div className="col-span-12 lg:col-span-5">
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 h-full shadow-xs">
            <h3 className="text-lg font-bold text-title mb-3">Hiring Funnel</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-slate-200">Applied</span>
                  <span className="text-sm text-default font-medium">486</span>
                </div>
                <div className="h-1.5 w-full bg-light-500 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: "100%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-slate-200">Screened</span>
                  <span className="text-sm text-default font-medium">312</span>
                </div>
                <div className="h-1.5 w-full bg-light-500 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-info rounded-full transition-all" style={{ width: "64%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-slate-200">Interviewed</span>
                  <span className="text-sm text-default font-medium">148</span>
                </div>
                <div className="h-1.5 w-full bg-light-500 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-warning rounded-full transition-all" style={{ width: "30%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-slate-200">Offered</span>
                  <span className="text-sm text-default font-medium">40</span>
                </div>
                <div className="h-1.5 w-full bg-light-500 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple rounded-full transition-all" style={{ width: "8%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-slate-200">Hired</span>
                  <span className="text-sm text-default font-medium">35</span>
                </div>
                <div className="h-1.5 w-full bg-light-500 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full transition-all" style={{ width: "7%" }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Source Effectiveness Table */}
        <div className="col-span-12 lg:col-span-7">
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 pb-0 h-full shadow-xs">
            <h3 className="text-lg font-bold text-title mb-3">Source Effectiveness</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-sm text-default border-b border-border-color">
                    <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-slate-200">Source</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-slate-200">Applicants</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-slate-200">Hires</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-slate-200">Conversion</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-slate-200">Cost per Hire</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-slate-200">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border-color">
                    <td className="py-2.5 px-2 text-sm font-semibold text-title">LinkedIn</td>
                    <td className="py-2.5 px-2 text-sm text-default text-right">230</td>
                    <td className="py-2.5 px-2 text-sm text-default text-right">12</td>
                    <td className="py-2.5 px-2 text-sm text-default text-right">5.2%</td>
                    <td className="py-2.5 px-2 text-sm text-gray-900 dark:text-slate-200 text-right">$725</td>
                    <td className="py-2.5 px-2">
                      <span className="text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded font-medium">Strong</span>
                    </td>
                  </tr>
                  <tr className="border-b border-border-color">
                    <td className="py-2.5 px-2 text-sm font-semibold text-title">Indeed</td>
                    <td className="py-2.5 px-2 text-sm text-default text-right">148</td>
                    <td className="py-2.5 px-2 text-sm text-default text-right">8</td>
                    <td className="py-2.5 px-2 text-sm text-default text-right">5.4%</td>
                    <td className="py-2.5 px-2 text-sm text-gray-900 dark:text-slate-200 text-right">$630</td>
                    <td className="py-2.5 px-2">
                      <span className="text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded font-medium">Strong</span>
                    </td>
                  </tr>
                  <tr className="border-b border-border-color">
                    <td className="py-2.5 px-2 text-sm font-semibold text-title">Referral</td>
                    <td className="py-2.5 px-2 text-sm text-default text-right">64</td>
                    <td className="py-2.5 px-2 text-sm text-default text-right">11</td>
                    <td className="py-2.5 px-2 text-sm text-default text-right">17.2%</td>
                    <td className="py-2.5 px-2 text-sm text-gray-900 dark:text-slate-200 text-right">$220</td>
                    <td className="py-2.5 px-2">
                      <span className="text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded font-medium">Strong</span>
                    </td>
                  </tr>
                  <tr className="border-0">
                    <td className="py-2.5 px-2 text-sm font-semibold text-title">Job Fair</td>
                    <td className="py-2.5 px-2 text-sm text-default text-right">64</td>
                    <td className="py-2.5 px-2 text-sm text-default text-right">3</td>
                    <td className="py-2.5 px-2 text-sm text-default text-right">4.7%</td>
                    <td className="py-2.5 px-2 text-sm text-gray-900 dark:text-slate-200 text-right">$915</td>
                    <td className="py-2.5 px-2">
                      <span className="text-[11px] bg-warning-transparent text-warning px-2 py-0.5 rounded font-medium">Watch</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Open Requisitions by Department Table */}
      <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 pb-0 shadow-xs">
        <h3 className="text-lg font-bold text-title mb-3">Open Requisitions by Department</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-sm text-default border-b border-border-color">
                <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-slate-200">Department</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-slate-200">Open Roles</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-slate-200">Applicants</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-slate-200">Avg Time to Hire</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-slate-200">Offer Acceptance</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-slate-200">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border-color">
                <td className="py-2.5 px-2 text-sm font-semibold text-title">Engineering</td>
                <td className="py-2.5 px-2 text-sm text-default text-right">5</td>
                <td className="py-2.5 px-2 text-sm text-default text-right">198</td>
                <td className="py-2.5 px-2 text-sm text-default text-right">28 days</td>
                <td className="py-2.5 px-2 text-sm text-default text-right">90%</td>
                <td className="py-2.5 px-2">
                  <span className="text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded font-medium">On Track</span>
                </td>
              </tr>
              <tr className="border-b border-border-color">
                <td className="py-2.5 px-2 text-sm font-semibold text-title">Sales</td>
                <td className="py-2.5 px-2 text-sm text-default text-right">3</td>
                <td className="py-2.5 px-2 text-sm text-default text-right">112</td>
                <td className="py-2.5 px-2 text-sm text-default text-right">21 days</td>
                <td className="py-2.5 px-2 text-sm text-default text-right">82%</td>
                <td className="py-2.5 px-2">
                  <span className="text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded font-medium">On Track</span>
                </td>
              </tr>
              <tr className="border-b border-border-color">
                <td className="py-2.5 px-2 text-sm font-semibold text-title">Design</td>
                <td className="py-2.5 px-2 text-sm text-default text-right">2</td>
                <td className="py-2.5 px-2 text-sm text-default text-right">88</td>
                <td className="py-2.5 px-2 text-sm text-default text-right">19 days</td>
                <td className="py-2.5 px-2 text-sm text-default text-right">95%</td>
                <td className="py-2.5 px-2">
                  <span className="text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded font-medium">On Track</span>
                </td>
              </tr>
              <tr className="border-b border-border-color">
                <td className="py-2.5 px-2 text-sm font-semibold text-title">Finance</td>
                <td className="py-2.5 px-2 text-sm text-default text-right">1</td>
                <td className="py-2.5 px-2 text-sm text-default text-right">31</td>
                <td className="py-2.5 px-2 text-sm text-default text-right">34 days</td>
                <td className="py-2.5 px-2 text-sm text-default text-right">75%</td>
                <td className="py-2.5 px-2">
                  <span className="text-[11px] bg-warning-transparent text-warning px-2 py-0.5 rounded font-medium">Delayed</span>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-2 text-sm font-semibold text-title">HR</td>
                <td className="py-2.5 px-2 text-sm text-default text-right">1</td>
                <td className="py-2.5 px-2 text-sm text-default text-right">35</td>
                <td className="py-2.5 px-2 text-sm text-default text-right">40 days</td>
                <td className="py-2.5 px-2 text-sm text-default text-right">70%</td>
                <td className="py-2.5 px-2">
                  <span className="text-[11px] bg-danger-transparent text-danger px-2 py-0.5 rounded font-medium">At Risk</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Recent Candidate Pipeline Table */}
      <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 mt-3 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-title">Recent Database Candidate Pipeline</h3>
          <Link to="/hr/recruitment/candidates" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
            <span>View All Candidates</span>
            <i className="ph ph-arrow-right"></i>
          </Link>
        </div>

        {recData?.recentCandidates?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-sm text-default border-b border-border-color">
                  <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-slate-200">Candidate</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-slate-200">Role / Posting</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-slate-200">Stage</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-slate-200">Applied Date</th>
                </tr>
              </thead>
              <tbody>
                {recData.recentCandidates.map((c: any) => (
                  <tr key={c.id} className="border-b border-border-color">
                    <td className="py-2.5 px-2">
                      <div className="font-semibold text-title">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                    </td>
                    <td className="py-2.5 px-2 text-default">{c.jobTitle}</td>
                    <td className="py-2.5 px-2">
                      <span className="text-xs px-2 py-0.5 rounded capitalize bg-primary/10 text-primary font-medium">
                        {c.stage}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right text-default text-xs">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <i className="ph-duotone ph-user-list text-3xl mb-1 block"></i>
            No candidate applications recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
