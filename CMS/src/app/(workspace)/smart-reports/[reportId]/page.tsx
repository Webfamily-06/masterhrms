'use client';
import {   createFileRoute  , Route } from "@/src/lib/router-compat";
import { SmartReportDetailView } from "@/components/smart-reports/report-view";



export default function DynamicReportFallbackRoute() {
  const { reportId } = Route.useParams();
  return <SmartReportDetailView reportId={reportId} />;
}
