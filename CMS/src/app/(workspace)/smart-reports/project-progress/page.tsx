'use client';
import {  createFileRoute  } from "@/src/lib/router-compat";
import { SmartReportDetailView } from "@/components/smart-reports/report-view";



export default function ProjectProgressReportRoute() {
  return <SmartReportDetailView reportId="project-progress" />;
}
