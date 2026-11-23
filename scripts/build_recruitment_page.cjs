const fs = require('fs');

let body = fs.readFileSync('scripts/recruitment_converted.jsx_snippet', 'utf8');

// Replace <canvas id="recruitment"[^>]*>.*?</canvas> with Suspense Chart
body = body.replace(/<div className="chartjs-wrapper-demo recruitment-chart position-relative">[\s\S]*?<canvas id="recruitment"[\s\S]*?<\/div>/, `
<div className="recruitment-chart position-relative d-flex justify-content-center align-items-center" style={{ minHeight: "220px" }}>
  {isMounted && (
    <Suspense fallback={<div className="h-[220px] flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={recruitmentChartOptions} series={[74.4]} type="radialBar" height={220} width="100%" />
    </Suspense>
  )}
</div>
`);

// Replace <canvas id="avghiretime"[^>]*>.*?</canvas>
body = body.replace(/<div className="chartjs-wrapper-demo avghiretime-chart position-relative">[\s\S]*?<canvas id="avghiretime"[\s\S]*?<\/div>/, `
<div className="avghiretime-chart position-relative" style={{ minHeight: "220px" }}>
  {isMounted && (
    <Suspense fallback={<div className="h-[220px] flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={avgHireTimeOptions} series={avgHireTimeSeries} type="bar" height={220} width="100%" />
    </Suspense>
  )}
</div>
`);

// Make sure Add New Job button triggers modal
body = body.replace(/<a href="#" onClick=\{[^}]*\} className="btn btn-primary-gradient[^"]*"[^>]*>/, `
<button type="button" onClick={() => setNewJobOpen(true)} className="btn btn-primary-gradient d-inline-flex align-items-center">
`);
body = body.replace(/<\/a>(\s*<\/div>\s*<div className="head-icons)/, `</button>$1`);

// Hook AI input
body = body.replace(/<input type="text" className="form-control" placeholder="Ask Me Anything" \/>/, `
<input 
  type="text" 
  className="form-control" 
  placeholder="Ask Me Anything" 
  value={aiMessage}
  onChange={(e) => setAiMessage(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter" && aiMessage.trim()) {
      setAiMessages(prev => [...prev, { sender: "user", text: aiMessage }]);
      setAiMessage("");
      setTimeout(() => {
        setAiMessages(prev => [...prev, { sender: "ai", text: "I analyzed your candidate pipeline. We have 47 open requisitions with high priority for Senior Fullstack Engineers." }]);
      }, 500);
    }
  }}
/>
`);

const finalFile = `'use client';

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "@/src/lib/router-compat";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Chart = lazy(() => import("react-apexcharts"));

export default function RecruitmentDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [newJobOpen, setNewJobOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [aiMessages, setAiMessages] = useState<Array<{ sender: "ai" | "user"; text: string }>>([
    { sender: "ai", text: "How can i help you today" }
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: recData } = useQuery({
    queryKey: ["dashboard-recruitment-realtime"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/dashboard/recruitment");
        return res?.data || res || {};
      } catch {
        return null;
      }
    },
  });

  const recruitmentChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "radialBar",
        height: 220,
        sparkline: { enabled: true }
      },
      plotOptions: {
        radialBar: {
          startAngle: -100,
          endAngle: 100,
          hollow: {
            size: "65%",
          },
          track: {
            background: "#e9ecef",
            strokeWidth: "97%",
          },
          dataLabels: {
            name: {
              show: true,
              fontSize: "12px",
              fontWeight: 500,
              color: "#6c757d",
              offsetY: -5,
            },
            value: {
              show: true,
              fontSize: "20px",
              fontWeight: 700,
              color: "#212529",
              offsetY: 5,
              formatter: () => "2,384",
            },
          },
        },
      },
      colors: ["#FF7028"],
      labels: ["Total Applications"],
    }),
    []
  );

  const avgHireTimeOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        height: 220,
        stacked: true,
        toolbar: { show: false },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "45%",
          borderRadius: 4,
        },
      },
      colors: ["#0b4c5f", "#3e6f7c", "#9fb8bf", "#c9d8dc"],
      xaxis: {
        categories: ["Jan", "Feb", "Mar"],
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { show: false },
      grid: { show: false },
      legend: { show: false },
      dataLabels: { enabled: false },
    }),
    []
  );

  const avgHireTimeSeries = useMemo(
    () => [
      { name: "Applied to Shortlisted", data: [2, 4, 3] },
      { name: "Shortlisted", data: [1.7, 1.7, 1.7] },
      { name: "Interview to Offer", data: [4, 2, 2] },
      { name: "Acceptance", data: [3, 7, 5] },
    ],
    []
  );

  return (
    <div className="dashboard-scope w-full">
      ${body}

      {/* Add New Job Modal */}
      <Dialog open={newJobOpen} onOpenChange={setNewJobOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add New Job Requisition</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              toast.success("Job opening created successfully");
              setNewJobOpen(false);
            }}
            className="space-y-4 pt-2"
          >
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Job Title</label>
              <input
                required
                type="text"
                placeholder="e.g. Senior Frontend Engineer"
                className="form-control"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Category / Department</label>
                <select className="form-select">
                  <option value="Engineering">Engineering</option>
                  <option value="Design">Design</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="Human Resources">Human Resources</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Job Type</label>
                <select className="form-select">
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Number of Openings</label>
                <input type="number" defaultValue={1} min={1} className="form-control" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Closing Date</label>
                <input type="date" className="form-control" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setNewJobOpen(false)} className="btn btn-light">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Publish Requisition
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
`;

fs.writeFileSync('CMS/src/app/(workspace)/recruitment-dashboard/page.tsx', finalFile);
console.log('Written recruitment-dashboard/page.tsx successfully. Size:', finalFile.length);
