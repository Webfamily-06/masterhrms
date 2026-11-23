const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const DASHBOARDS = [
  {
    htmlFile: 'deals-dashboard.html',
    targetPath: 'CMS/src/app/(workspace)/deals-dashboard/page.tsx',
    componentName: 'DealsDashboardPage',
    title: 'Deals Dashboard'
  },
  {
    htmlFile: 'leads-dashboard.html',
    targetPath: 'CMS/src/app/(workspace)/leads-dashboard/page.tsx',
    componentName: 'LeadsDashboardPage',
    title: 'Leads Dashboard'
  },
  {
    htmlFile: 'hr-dashboard.html',
    targetPath: 'CMS/src/app/(workspace)/hrm-dashboard/page.tsx',
    componentName: 'HrmDashboardPage',
    title: 'HR Dashboard'
  },
  {
    htmlFile: 'payroll-dashboard.html',
    targetPath: 'CMS/src/app/(workspace)/payroll-dashboard/page.tsx',
    componentName: 'PayrollDashboardPage',
    title: 'Payroll Dashboard'
  },
  {
    htmlFile: 'attendance-dashboard.html',
    targetPath: 'CMS/src/app/(workspace)/attendance-dashboard/page.tsx',
    componentName: 'AttendanceDashboardPage',
    title: 'Attendance Dashboard'
  },
  {
    htmlFile: 'finance-dashboard.html',
    targetPath: 'CMS/src/app/(workspace)/finance-dashboard/page.tsx',
    componentName: 'FinanceDashboardPage',
    title: 'Finance Dashboard'
  },
  {
    htmlFile: 'it-admin-dashboard.html',
    targetPath: 'CMS/src/app/(workspace)/it-admin-dashboard/page.tsx',
    componentName: 'ItAdminDashboardPage',
    title: 'IT Admin Dashboard'
  },
  {
    htmlFile: 'asset-dashboard.html',
    targetPath: 'CMS/src/app/(workspace)/asset-dashboard/page.tsx',
    componentName: 'AssetDashboardPage',
    title: 'Asset Dashboard'
  },
  {
    htmlFile: 'help-desk-dashboard.html',
    targetPath: 'CMS/src/app/(workspace)/support-dashboard/page.tsx',
    componentName: 'SupportDashboardPage',
    title: 'Support Helpdesk Dashboard'
  }
];

function convertHtmlToJsx(html) {
  // Extract content
  const startTag = '<div class="content">';
  const startIdx = html.indexOf(startTag);
  const endIdx = html.indexOf('<!-- /Page Wrapper -->');
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Could not find content bounds');
  }
  let inner = html.slice(startIdx + startTag.length, endIdx);
  const footerIdx = inner.indexOf('<div class="footer');
  if (footerIdx !== -1) {
    inner = inner.slice(0, footerIdx);
  }

  // Remove the trailing closing tag for content if present
  inner = inner.trim().replace(/<\/div>\s*$/, '');

  // 1. class -> className
  let jsx = inner.replace(/\bclass="/g, 'className="');

  // 2. for -> htmlFor
  jsx = jsx.replace(/\bfor="([^"]*)"/g, 'htmlFor="$1"');

  // 3. style strings -> style objects
  jsx = jsx.replace(/\bstyle="([^"]*)"/g, (match, p1) => {
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

  // 4. self closing tags
  jsx = jsx.replace(/<(img|input|hr|br)([^>]*?)(?<!\/)>/gi, '<$1$2 />');

  // 5. href javascript:void(0)
  jsx = jsx.replace(/href="javascript:void\(0\);"/g, 'href="#" onClick={(e) => e.preventDefault()}');

  // 6. fix comments
  jsx = jsx.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');

  // 7. fix asset paths
  jsx = jsx.replace(/src="https:\/\/smarthr\.dreamstechnologies\.com\/hrm\/html\/assets\//g, 'src="/assets/');
  jsx = jsx.replace(/src="assets\//g, 'src="/assets/');

  // 8. Replace charts with generic client rendered chart placeholders if empty
  // Find <div id="...chart..."></div>
  jsx = jsx.replace(/<div\s+([^>]*id="([^"]*(?:chart|graph|trend|report|status|category|compliance|growth|cost|reimbr)[^"]*)"[^>]*)><\/div>/gi, (match, attrs, id) => {
    return `<div ${attrs}>\n  {isMounted && (\n    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>\n      <Chart options={{ chart: { id: "${id}", toolbar: { show: false } }, colors: ["#0d6efd", "#10b981", "#f59e0b", "#6366f1"], dataLabels: { enabled: false } }} series={[{ name: "${id}", data: [30, 40, 35, 50, 49, 60, 70, 91, 125] }]} type="area" height={220} width="100%" />\n    </Suspense>\n  )}\n</div>`;
  });

  // Also replace <canvas id="...">
  jsx = jsx.replace(/<canvas\s+([^>]*id="([^"]+)"[^>]*)><\/canvas>/gi, (match, attrs, id) => {
    return `<div className="chart-canvas-wrapper" style={{ minHeight: "200px" }}>\n  {isMounted && (\n    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>\n      <Chart options={{ chart: { id: "${id}", toolbar: { show: false } }, colors: ["#0d6efd", "#f59e0b", "#10b981", "#ef4444"], labels: ["A", "B", "C", "D"], dataLabels: { enabled: false } }} series={[44, 55, 13, 33]} type="donut" height={200} width="100%" />\n    </Suspense>\n  )}\n</div>`;
  });

  return jsx;
}

for (const d of DASHBOARDS) {
  const p = path.join('SMARTHR', d.htmlFile);
  if (!fs.existsSync(p)) {
    console.log(`Missing HTML: ${d.htmlFile}`);
    continue;
  }
  const rawHtml = fs.readFileSync(p, 'utf8');
  let jsxContent;
  try {
    jsxContent = convertHtmlToJsx(rawHtml);
  } catch (err) {
    console.error(`Error converting ${d.htmlFile}:`, err.message);
    continue;
  }

  const fileContent = `'use client';

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "@/src/lib/router-compat";

const Chart = lazy(() => import("react-apexcharts"));

export default function ${d.componentName}() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      ${jsxContent}
    </>
  );
}
`;

  // Validate with TS parser
  const sf = ts.createSourceFile('test.tsx', fileContent, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (sf.parseDiagnostics.length > 0) {
    console.error(`TS Parse errors in ${d.componentName} (${sf.parseDiagnostics.length}):`);
    sf.parseDiagnostics.slice(0, 3).forEach(diag => {
      const { line, character } = sf.getLineAndCharacterOfPosition(diag.start);
      console.error(`  Line ${line + 1}:${character} -> ${diag.messageText}`);
    });
  } else {
    fs.writeFileSync(d.targetPath, fileContent);
    console.log(`SUCCESS: ${d.componentName} written to ${d.targetPath} (${fileContent.length} bytes)`);
  }
}
