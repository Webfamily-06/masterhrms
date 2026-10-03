import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Chart = lazy(() => import("react-apexcharts"));

export const Route = createFileRoute("/_authenticated/_app/payroll-dashboard")({
  component: PayrollDashboardPage,
  head: () => ({
    meta: [
      { title: "Payroll Register & Analytics | Dreams ERP" },
      { name: "description", content: "Comprehensive payroll calculations, payslips, deductions, and salary distribution." },
    ],
  }),
});

interface PayrollRecord {
  id: string;
  employeeId: string;
  name: string;
  avatar: string;
  designation: string;
  department: string;
  basic: number;
  bonus: number;
  deductions: number;
  netPay: number;
  paymentDate: string;
  status: "Paid" | "Pending" | "Processing";
}

const INITIAL_PAYROLL: PayrollRecord[] = [
  {
    id: "#PR0020",
    employeeId: "EMP-001",
    name: "Ethan Walker",
    avatar: "/ui-assets/avatar-03.jpg",
    designation: "Engineering Manager",
    department: "Engineering",
    basic: 6500,
    bonus: 500,
    deductions: 200,
    netPay: 6800,
    paymentDate: "30 Jun 2026",
    status: "Paid",
  },
  {
    id: "#PR0019",
    employeeId: "EMP-002",
    name: "Madison Clark",
    avatar: "/ui-assets/avatar-04.jpg",
    designation: "Lead Product Designer",
    department: "Design",
    basic: 4800,
    bonus: 300,
    deductions: 150,
    netPay: 4950,
    paymentDate: "30 Jun 2026",
    status: "Paid",
  },
  {
    id: "#PR0018",
    employeeId: "EMP-003",
    name: "James Harris",
    avatar: "/ui-assets/avatar-05.jpg",
    designation: "Senior Full Stack Dev",
    department: "Engineering",
    basic: 5200,
    bonus: 400,
    deductions: 180,
    netPay: 5420,
    paymentDate: "30 Jun 2026",
    status: "Processing",
  },
  {
    id: "#PR0017",
    employeeId: "EMP-004",
    name: "Avery Thompson",
    avatar: "/ui-assets/avatar-06.jpg",
    designation: "Operations Lead",
    department: "Operations",
    basic: 4100,
    bonus: 250,
    deductions: 120,
    netPay: 4230,
    paymentDate: "30 Jun 2026",
    status: "Paid",
  },
  {
    id: "#PR0016",
    employeeId: "EMP-005",
    name: "Benjamin Wright",
    avatar: "/ui-assets/avatar-07.jpg",
    designation: "HR Business Partner",
    department: "Human Resources",
    basic: 3900,
    bonus: 200,
    deductions: 110,
    netPay: 3990,
    paymentDate: "30 Jun 2026",
    status: "Pending",
  },
  {
    id: "#PR0015",
    employeeId: "EMP-006",
    name: "Sophia Martinez",
    avatar: "/ui-assets/avatar-08.jpg",
    designation: "Financial Analyst",
    department: "Finance",
    basic: 4600,
    bonus: 350,
    deductions: 140,
    netPay: 4810,
    paymentDate: "30 Jun 2026",
    status: "Paid",
  },
];

export default function PayrollDashboardPage() {
  const queryClient = useQueryClient();
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"register" | "analytics">("register");

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [records, setRecords] = useState<PayrollRecord[]>(INITIAL_PAYROLL);

  // Modal States
  const [runPayrollOpen, setRunPayrollOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  // Form State
  const [newRunMonth, setNewRunMonth] = useState("June 2026");
  const [newRunCutoff, setNewRunCutoff] = useState("2026-06-25");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Real DB Query for payroll
  const { data: dbPayroll = [] } = useQuery<any[]>({
    queryKey: ["payroll-register-data"],
    queryFn: async () => {
      try {
        const res = await api.get("/payroll");
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  // KPI Calculations
  const totalGross = useMemo(() => records.reduce((acc, r) => acc + r.basic + r.bonus, 0), [records]);
  const totalNet = useMemo(() => records.reduce((acc, r) => acc + r.netPay, 0), [records]);
  const totalDeductions = useMemo(() => records.reduce((acc, r) => acc + r.deductions, 0), [records]);
  const pendingApprovalsCount = useMemo(() => records.filter((r) => r.status === "Pending" || r.status === "Processing").length, [records]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDept = departmentFilter === "All" || r.department === departmentFilter;
      const matchStatus = statusFilter === "All" || r.status === statusFilter;
      return matchSearch && matchDept && matchStatus;
    });
  }, [records, searchQuery, departmentFilter, statusFilter]);

  // Salary Range Distribution Bar Chart
  const distributionChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        height: 240,
        toolbar: { show: false },
      },
      colors: ["#FF6B00"],
      plotOptions: {
        bar: {
          columnWidth: "40%",
          borderRadius: 4,
          dataLabels: { position: "top" },
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `$${val}k`,
        offsetY: -20,
        style: { fontSize: "11px", colors: ["#6B7280"] },
      },
      xaxis: {
        categories: ["$2k-$3.5k", "$3.5k-$5k", "$5k-$6.5k", "$6.5k-$8k", "$8k+"],
        labels: { style: { colors: "#6B7280", fontSize: "12px" } },
      },
      yaxis: {
        labels: {
          style: { colors: "#6B7280", fontSize: "12px" },
          formatter: (val: number) => `${val}`,
        },
      },
      grid: { borderColor: "#f1f5f9" },
    }),
    []
  );

  // Expense Trend Area Chart
  const expenseTrendOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "area",
        height: 240,
        toolbar: { show: false },
      },
      colors: ["#03C95A", "#0E82FD"],
      stroke: { curve: "smooth", width: 2 },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.05,
        },
      },
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        labels: { style: { colors: "#6B7280", fontSize: "12px" } },
      },
      yaxis: {
        labels: {
          style: { colors: "#6B7280", fontSize: "12px" },
          formatter: (val: number) => `$${val}k`,
        },
      },
      grid: { borderColor: "#f1f5f9" },
    }),
    []
  );

  const handleRunPayrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`Payroll successfully processed for ${newRunMonth}!`);
    setRunPayrollOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* ── Page Header / Actions (matching ui/payroll.html line 1272) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-border-color">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">Payroll</h1>
          <div className="flex items-center gap-1.5 text-xs text-default">
            <Link to="/hrm-dashboard" className="hover:text-primary">Dashboard</Link>
            <i className="ph ph-caret-right text-[10px]"></i>
            <span className="text-gray-900 dark:text-gray-100 font-medium">Payroll Management</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dual Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md p-0.5 border border-border-color">
            <button
              type="button"
              onClick={() => setActiveTab("register")}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                activeTab === "register"
                  ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 shadow-xs"
                  : "text-default hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              Payroll Register
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                activeTab === "analytics"
                  ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 shadow-xs"
                  : "text-default hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              Cost Analytics
            </button>
          </div>

          <button
            type="button"
            onClick={() => toast.success("Exporting payroll report as CSV...")}
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border-color bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-700 cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <i className="ph-duotone ph-file-arrow-down text-sm"></i>
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={() => setRunPayrollOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary hover:bg-primary-hover text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <i className="ph-bold ph-lightning text-xs"></i>
            <span>Run Payroll</span>
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards (Dreams ERP Standard) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-default font-medium">Gross Payroll</span>
            <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <i className="ph-duotone ph-money text-lg"></i>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">
            ${totalGross.toLocaleString()}
          </h2>
          <span className="text-[11px] text-success font-medium flex items-center gap-1">
            <i className="ph-bold ph-trend-up text-xs"></i> Scheduled for payout
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-default font-medium">Net Disbursed</span>
            <div className="size-8 rounded-md bg-success-transparent text-success flex items-center justify-center">
              <i className="ph-duotone ph-wallet text-lg"></i>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">
            ${totalNet.toLocaleString()}
          </h2>
          <span className="text-[11px] text-default font-medium">Total direct bank transfers</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-default font-medium">Tax & Deductions</span>
            <div className="size-8 rounded-md bg-warning/10 text-warning flex items-center justify-center">
              <i className="ph-duotone ph-receipt text-lg"></i>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">
            ${totalDeductions.toLocaleString()}
          </h2>
          <span className="text-[11px] text-default font-medium">Federal & insurance withholdings</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-default font-medium">Pending Approvals</span>
            <div className="size-8 rounded-md bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <i className="ph-duotone ph-clock text-lg"></i>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">
            {pendingApprovalsCount}
          </h2>
          <span className="text-[11px] text-warning font-medium">Requires supervisor sign-off</span>
        </div>
      </div>

      {activeTab === "register" ? (
        /* ── Tab 1: Payroll Register Table (1:1 clone of ui/payroll.html lines 1293-1420) ── */
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative w-64">
                <i className="ph ph-magnifying-glass absolute right-2.5 top-1/2 -translate-y-1/2 text-default text-xs"></i>
                <input
                  type="text"
                  placeholder="Search employee, ID, role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 pe-8 py-1.5 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Department Filter */}
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="All">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="Design">Design</option>
                <option value="Operations">Operations</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Finance">Finance</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="All">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Processing">Processing</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Showing <strong>{filteredRecords.length}</strong> of {records.length} records
              </span>
              <button
                type="button"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["payroll-register-data"] });
                  toast.success("Payroll data refreshed.");
                }}
                className="size-7 rounded-md border border-border-color bg-white dark:bg-slate-800 flex items-center justify-center text-default hover:bg-light dark:hover:bg-slate-700 cursor-pointer shadow-xs"
                title="Refresh"
              >
                <i className="ph ph-arrow-clockwise text-xs"></i>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-default border-b border-border-color bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Payroll ID</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Employee</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Department</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Basic Salary</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Bonus / Allow</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Deductions</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Net Pay</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Status</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-default">
                      No payroll records found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border-color hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-3 font-mono font-medium text-primary">
                        {item.id}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={item.avatar}
                            alt={item.name}
                            className="size-7 rounded-full object-cover shrink-0 border border-border-color"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/ui-assets/avatar-03.jpg";
                            }}
                          />
                          <div>
                            <p className="font-semibold text-title leading-tight mb-0.5">{item.name}</p>
                            <span className="text-[11px] text-muted-foreground">{item.designation}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-default">{item.department}</td>
                      <td className="py-3 px-3 text-right font-mono text-default">${item.basic.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-mono text-success">+${item.bonus.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-mono text-danger">-${item.deductions.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-gray-900 dark:text-gray-100">
                        ${item.netPay.toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md inline-block ${
                            item.status === "Paid"
                              ? "bg-success-transparent text-success"
                              : item.status === "Processing"
                              ? "bg-blue-500/10 text-blue-600"
                              : "bg-warning-transparent text-warning"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right relative">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedPayslip(item)}
                            className="size-7 rounded border border-border-color bg-white dark:bg-slate-800 flex items-center justify-center text-default hover:text-primary hover:bg-light cursor-pointer shadow-2xs"
                            title="View Payslip"
                          >
                            <i className="ph-duotone ph-file-text text-sm"></i>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActionMenuOpen(actionMenuOpen === item.id ? null : item.id)}
                            className="size-7 rounded border border-border-color bg-white dark:bg-slate-800 flex items-center justify-center text-default hover:bg-light cursor-pointer shadow-2xs"
                            title="More"
                          >
                            <i className="ph-bold ph-dots-three-vertical text-xs"></i>
                          </button>
                        </div>

                        {actionMenuOpen === item.id && (
                          <div className="absolute right-3 top-full mt-1 min-w-32 bg-white dark:bg-slate-900 border border-border-color shadow-lg rounded-md p-1.5 space-y-1 z-30 text-left">
                            <button
                              type="button"
                              onClick={() => {
                                toast.success(`Downloading payslip for ${item.name}...`);
                                setActionMenuOpen(null);
                              }}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <i className="ph-duotone ph-download-simple text-sm"></i>
                              <span>Download PDF</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                toast.info(`Emailing payslip to ${item.name}...`);
                                setActionMenuOpen(null);
                              }}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <i className="ph-duotone ph-envelope text-sm"></i>
                              <span>Email Payslip</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── Tab 2: Payroll Analytics (Charts & Cost Distribution) ── */
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-6 bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-color mb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Salary Band Distribution</h3>
              <span className="text-xs text-muted-foreground">Compensation Spread</span>
            </div>
            {isMounted && (
              <Suspense fallback={<div className="p-8 text-center"><Loader2 className="animate-spin size-6 mx-auto text-primary" /></div>}>
                <Chart
                  options={distributionChartOptions}
                  series={[{ name: "Employees in Band", data: [4, 12, 8, 3, 2] }]}
                  type="bar"
                  height={240}
                />
              </Suspense>
            )}
          </div>

          <div className="col-span-12 lg:col-span-6 bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-color mb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Payroll Expenditure Trend</h3>
              <span className="text-xs text-muted-foreground">H1 2026</span>
            </div>
            {isMounted && (
              <Suspense fallback={<div className="p-8 text-center"><Loader2 className="animate-spin size-6 mx-auto text-primary" /></div>}>
                <Chart
                  options={expenseTrendOptions}
                  series={[
                    { name: "Gross Budget", data: [68, 70, 72, 71, 75, 76] },
                    { name: "Actual Disbursed", data: [64, 66, 68, 67, 72, 73] },
                  ]}
                  type="area"
                  height={240}
                />
              </Suspense>
            )}
          </div>
        </div>
      )}

      {/* ── Run Payroll Dialog ── */}
      <Dialog open={runPayrollOpen} onOpenChange={setRunPayrollOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 p-5 rounded-md border border-border-color">
          <DialogHeader className="pb-3 border-b border-border-color">
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">
              Execute Payroll Cycle
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRunPayrollSubmit} className="space-y-3 mt-3 text-xs">
            <div>
              <label className="font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Payroll Period *</label>
              <input
                type="text"
                required
                value={newRunMonth}
                onChange={(e) => setNewRunMonth(e.target.value)}
                className="w-full px-3 py-2 border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Attendance Cut-off Date *</label>
              <input
                type="date"
                required
                value={newRunCutoff}
                onChange={(e) => setNewRunCutoff(e.target.value)}
                className="w-full px-3 py-2 border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-border-color/60 space-y-1.5">
              <div className="flex justify-between text-default">
                <span>Eligible Active Employees:</span>
                <strong className="text-gray-900 dark:text-gray-100">142</strong>
              </div>
              <div className="flex justify-between text-default">
                <span>Estimated Gross Payout:</span>
                <strong className="text-primary font-mono">${totalGross.toLocaleString()}</strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border-color">
              <button
                type="button"
                onClick={() => setRunPayrollOpen(false)}
                className="px-3 py-1.5 rounded-md border border-border-color bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white font-semibold cursor-pointer shadow-xs"
              >
                Confirm &amp; Run
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Payslip View Modal ── */}
      {selectedPayslip && (
        <Dialog open={Boolean(selectedPayslip)} onOpenChange={() => setSelectedPayslip(null)}>
          <DialogContent className="max-w-lg bg-white dark:bg-slate-900 p-5 rounded-md border border-border-color">
            <DialogHeader className="pb-3 border-b border-border-color flex justify-between items-center">
              <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">
                Official Payslip — {selectedPayslip.id}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="flex justify-between items-start pb-3 border-b border-border-color">
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">{selectedPayslip.name}</h4>
                  <p className="text-muted-foreground">{selectedPayslip.designation} · {selectedPayslip.department}</p>
                  <p className="text-muted-foreground font-mono">Employee Code: {selectedPayslip.employeeId}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] bg-success-transparent text-success px-2 py-0.5 rounded font-semibold">
                    {selectedPayslip.status}
                  </span>
                  <p className="text-muted-foreground mt-1">Date: {selectedPayslip.paymentDate}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded border border-border-color/60 space-y-2">
                  <p className="font-bold text-title border-b border-border-color/60 pb-1">Earnings</p>
                  <div className="flex justify-between"><span>Basic:</span><span className="font-mono">${selectedPayslip.basic.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Bonus:</span><span className="font-mono text-success">+${selectedPayslip.bonus.toLocaleString()}</span></div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded border border-border-color/60 space-y-2">
                  <p className="font-bold text-title border-b border-border-color/60 pb-1">Deductions</p>
                  <div className="flex justify-between"><span>Tax Withholding:</span><span className="font-mono text-danger">-${(selectedPayslip.deductions * 0.7).toFixed(0)}</span></div>
                  <div className="flex justify-between"><span>Health Insurance:</span><span className="font-mono text-danger">-${(selectedPayslip.deductions * 0.3).toFixed(0)}</span></div>
                </div>
              </div>

              <div className="p-3 bg-primary/10 rounded-md border border-primary/20 flex justify-between items-center text-sm font-bold text-gray-900 dark:text-gray-100">
                <span>Net Payable Amount:</span>
                <span className="text-primary text-base font-mono">${selectedPayslip.netPay.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border-color">
              <button
                type="button"
                onClick={() => setSelectedPayslip(null)}
                className="px-3 py-1.5 rounded-md border border-border-color bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 hover:bg-light cursor-pointer text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.success("Printing payslip...");
                  setSelectedPayslip(null);
                }}
                className="px-4 py-1.5 rounded-md bg-dark text-white hover:bg-primary-hover font-semibold cursor-pointer text-xs shadow-xs"
              >
                Print / Save PDF
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
