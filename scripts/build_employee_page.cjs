const fs = require('fs');

let html = fs.readFileSync('employee_dashboard_pw.html', 'utf8');

// 1. class to className
html = html.replace(/\bclass="/g, 'className="');

// 2. for to htmlFor
html = html.replace(/\bfor="([^"]*)"/g, 'htmlFor="$1"');

// 3. style string to JSX object
html = html.replace(/\bstyle="([^"]*)"/g, (match, p1) => {
  const styles = p1.split(';').filter(s => s.trim().length > 0);
  const styleObj = styles.map(s => {
    const parts = s.split(':');
    let prop = parts[0].trim();
    let val = parts.slice(1).join(':').trim();
    prop = prop.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    return `${prop}: "${val}"`;
  }).join(', ');
  return `style={{ ${styleObj} }}`;
});

// 4. self-closing tags
html = html.replace(/<(img|input|hr|br)([^>]*?)(?<!\/)>/gi, '<$1$2 />');

// 5. href javascript:void(0)
html = html.replace(/href="javascript:void\(0\);"/g, 'href="#" onClick={(e) => e.preventDefault()}');

// 6. fix comments
html = html.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');

// 7. fix asset paths
html = html.replace(/src="https:\/\/smarthr\.dreamstechnologies\.com\/hrm\/html\/assets\//g, 'src="/assets/');
html = html.replace(/src="assets\//g, 'src="/assets/');

// 8. Replace chart placeholders
html = html.replace(/<div id="leaves_chart"><\/div>/g, `
<div className="d-flex justify-content-center align-items-center" style={{ minHeight: "185px" }}>
  {isMounted && (
    <Suspense fallback={<div className="h-[185px] flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={leavesChartOptions} series={leavesChartSeries} type="donut" height={185} width="100%" />
    </Suspense>
  )}
</div>
`);

html = html.replace(/<div id="performance_chart2"><\/div>/g, `
<div style={{ minHeight: "273px" }}>
  {isMounted && (
    <Suspense fallback={<div className="h-[273px] flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={performanceChartOptions} series={performanceChartSeries} type="area" height={273} width="100%" />
    </Suspense>
  )}
</div>
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

export default function EmployeeDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [applyLeaveOpen, setApplyLeaveOpen] = useState(false);
  const [punchedIn, setPunchedIn] = useState(true);
  const [timer, setTimer] = useState("05:45:32");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const leavesChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        height: 185,
        type: "donut",
        toolbar: { show: false },
      },
      dataLabels: { enabled: false },
      series: [15, 10, 5, 10, 60],
      colors: ["#F26522", "#FFC107", "#E70D0D", "#03C95A", "#0C4B5E"],
      labels: ["On Time", "Late", "Work From Home", "Absent", "Sick Leave"],
      legend: { show: false },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: { width: 180 },
            legend: { show: false },
          },
        },
      ],
    }),
    []
  );

  const leavesChartSeries = useMemo(() => [15, 10, 5, 10, 60], []);

  const performanceChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        height: 273,
        type: "area",
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      colors: ["#03C95A"],
      dataLabels: { enabled: false },
      stroke: { curve: "straight" },
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
      },
      yaxis: {
        min: 10,
        max: 60,
        tickAmount: 5,
        labels: {
          formatter: (val) => val + "K",
        },
      },
      grid: {
        padding: { left: -8, right: -4 },
      },
      legend: { show: false },
    }),
    []
  );

  const performanceChartSeries = useMemo(
    () => [
      {
        name: "Performance",
        data: [20, 20, 35, 35, 40, 60, 60],
      },
    ],
    []
  );

  return (
    <>
      ${html}

      {/* Apply Leave Modal */}
      <Dialog open={applyLeaveOpen} onOpenChange={setApplyLeaveOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              toast.success("Leave request submitted successfully");
              setApplyLeaveOpen(false);
            }}
            className="space-y-4 pt-2"
          >
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Leave Type</label>
              <select className="form-select">
                <option value="annual">Annual Leave</option>
                <option value="casual">Casual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="wfh">Work From Home</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">From Date</label>
                <input type="date" required className="form-control" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">To Date</label>
                <input type="date" required className="form-control" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Reason</label>
              <textarea rows={3} placeholder="Provide details about your leave..." className="form-control" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setApplyLeaveOpen(false)} className="btn btn-light">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Submit Request
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
`;

fs.writeFileSync('CMS/src/app/(workspace)/employee-dashboard/page.tsx', finalFile);
fs.writeFileSync('CMS/src/app/(workspace)/me/dashboard/page.tsx', finalFile);
console.log('Written employee-dashboard/page.tsx and me/dashboard/page.tsx. Size:', finalFile.length);
