import * as React from "react";
import { Link } from "@/lib/router-compat";
import { toast } from "sonner";

export interface SmartHRHeaderProps {
  title: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  showExport?: boolean;
  showDatePicker?: boolean;
  dateValue?: string;
}

export function SmartHRHeader({
  title,
  badge,
  actions,
  showExport = true,
  showDatePicker = true,
  dateValue = "2026",
}: SmartHRHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 page-breadcrumb mb-4">
      <div className="my-auto">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-0.5">
            {title}
          </h2>
          {badge}
        </div>
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <li className="breadcrumb-item">
              <Link
                to="/tenant/dashboard"
                className="hover:text-primary inline-flex items-center text-slate-500 hover:text-primary transition-colors"
                title="Home"
              >
                <i className="ti ti-smart-home text-sm"></i>
              </Link>
            </li>
            <li className="text-slate-300 dark:text-slate-600">
              <i className="ti ti-chevron-right text-[10px]"></i>
            </li>
            <li className="breadcrumb-item text-slate-500">Dashboard</li>
            <li className="text-slate-300 dark:text-slate-600">
              <i className="ti ti-chevron-right text-[10px]"></i>
            </li>
            <li
              className="breadcrumb-item active text-slate-900 dark:text-white font-medium"
              aria-current="page"
            >
              {title}
            </li>
          </ol>
        </nav>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {actions}

        {showExport && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                toast.success(`Exporting ${title} report...`);
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-card border border-border-color rounded-lg shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <i className="ti ti-file-export text-slate-500"></i>
              Export
            </button>
          </div>
        )}

        {showDatePicker && (
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <i className="ti ti-calendar text-xs"></i>
            </span>
            <input
              type="text"
              readOnly
              value={dateValue}
              className="pl-8 pr-2.5 py-1.5 text-xs bg-white dark:bg-card border border-border-color rounded-lg focus:outline-none w-[110px] text-slate-700 dark:text-slate-200 font-medium"
            />
          </div>
        )}

        <button
          type="button"
          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Collapse"
        >
          <i className="ti ti-chevrons-up text-base"></i>
        </button>
      </div>
    </div>
  );
}
