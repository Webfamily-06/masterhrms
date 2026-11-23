const fs = require('fs');

let html = fs.readFileSync('tenant_dashboard_pw.html', 'utf8');

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

// Remove the trailing closing div for content wrapper if present
html = html.replace(/<\/div>\s*$/, '');
html = html.replace(/<div className="chartjs-wrapper-demo position-relative">[\s\S]*?<canvas id="attendance"[\s\S]*?<\/div>/, `
<div className="position-relative d-flex justify-content-center align-items-center" style={{ minHeight: "200px" }}>
  {isMounted && (
    <Suspense fallback={<div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={attendanceChartOptions} series={attendanceChartSeries} type="donut" height={200} width="100%" />
    </Suspense>
  )}
</div>
`);

html = html.replace(/<div className="chartjs-wrapper-demo position-relative">[\s\S]*?<canvas id="mySemiDonutChart"[\s\S]*?<\/div>/, `
<div className="position-relative d-flex justify-content-center align-items-center" style={{ minHeight: "200px" }}>
  {isMounted && (
    <Suspense fallback={<div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={projectChartOptions} series={projectChartSeries} type="donut" height={200} width="100%" />
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
import { useCurrentProfile } from "@/lib/session";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Chart = lazy(() => import("react-apexcharts"));

export default function TenantDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const { data: profile } = useCurrentProfile();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const userName = profile?.full_name?.split(" ")[0] || "Adrian";

  const attendanceChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "donut",
        height: 200,
        toolbar: { show: false },
      },
      plotOptions: {
        pie: {
          startAngle: -90,
          endAngle: 90,
          offsetY: 10,
          donut: {
            size: "70%",
          },
        },
      },
      colors: ["#0C4B5E", "#03C95A", "#FFC107", "#E70D0D"],
      labels: ["Late", "Present", "Permission", "Absent"],
      legend: { show: false },
      dataLabels: { enabled: false },
    }),
    []
  );

  const attendanceChartSeries = useMemo(() => [40, 20, 30, 10], []);

  const projectChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "donut",
        height: 200,
        toolbar: { show: false },
      },
      plotOptions: {
        pie: {
          startAngle: -90,
          endAngle: 90,
          offsetY: 10,
          donut: {
            size: "75%",
          },
        },
      },
      colors: ["#FFC107", "#1B84FF", "#44c4fa", "#0D7858"],
      labels: ["Ongoing", "Onhold", "Completed", "Overdue"],
      legend: { show: false },
      dataLabels: { enabled: false },
    }),
    []
  );

  const projectChartSeries = useMemo(() => [20, 40, 20, 10], []);

  return (
    <>
      ${html}

      {/* Add Schedule Modal */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Schedule</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              toast.success("Schedule added successfully");
              setScheduleModalOpen(false);
            }}
            className="space-y-4 pt-2"
          >
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Title</label>
              <input required type="text" placeholder="e.g. Client Review Meeting" className="form-control" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Date & Time</label>
              <input required type="datetime-local" className="form-control" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setScheduleModalOpen(false)} className="btn btn-light">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Schedule
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
`;

fs.writeFileSync('CMS/src/app/(workspace)/tenant/dashboard/page.tsx', finalFile);
console.log('Written tenant/dashboard/page.tsx. Size:', finalFile.length);
