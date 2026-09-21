import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Home
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";

interface DashboardHeaderProps {
  title: string;
  badge?: string;
  breadcrumbs?: { label: string; href?: string }[];
  onRefresh?: () => void;
  onDateChange?: (range: { from: Date; to: Date }) => void;
  exportFilename?: string;
  exportData?: Record<string, any>[];
}

export function DashboardHeader({
  title,
  badge,
  breadcrumbs = [{ label: "Home", href: "/" }, { label: "Dashboard", href: "/dashboard" }],
  onRefresh,
  onDateChange,
  exportFilename = "Dashboard_Export",
  exportData,
}: DashboardHeaderProps) {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectPreset = (days: number) => {
    const to = new Date();
    const from = subDays(to, days);
    setDateRange({ from, to });
    onDateChange?.({ from, to });
    setIsOpen(false);
    toast.success(`Filter updated: Last ${days} days`);
  };

  const handleSelectThisMonth = () => {
    const now = new Date();
    const from = startOfMonth(now);
    const to = endOfMonth(now);
    setDateRange({ from, to });
    onDateChange?.({ from, to });
    setIsOpen(false);
    toast.success("Filter updated: This Month");
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (onRefresh) {
      onRefresh();
    }
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Dashboard data refreshed");
    }, 600);
  };

  const handleExportCSV = () => {
    try {
      let csvContent = "data:text/csv;charset=utf-8,";
      if (exportData && exportData.length > 0) {
        const headers = Object.keys(exportData[0]).join(",");
        const rows = exportData.map(row => Object.values(row).map(v => `"${v}"`).join(","));
        csvContent += [headers, ...rows].join("\n");
      } else {
        csvContent += "Metric,Value\nReport," + title + "\nDate Range," + format(dateRange.from, "dd MMM yyyy") + " to " + format(dateRange.to, "dd MMM yyyy") + "\nStatus,Verified Active\nExported At," + new Date().toISOString();
      }
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${exportFilename}_${format(new Date(), "yyyy-MM-dd")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Exported CSV successfully");
    } catch (err) {
      toast.error("Export failed");
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border/50">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {badge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              {badge}
            </span>
          )}
        </div>
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
          <Link to="/" className="hover:text-foreground transition-colors flex items-center gap-1">
            <Home className="size-3" />
            <span>Home</span>
          </Link>
          {breadcrumbs.map((bc, idx) => (
            <React.Fragment key={idx}>
              <span>/</span>
              {bc.href ? (
                <Link to={bc.href} className="hover:text-foreground transition-colors">
                  {bc.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{bc.label}</span>
              )}
            </React.Fragment>
          ))}
          <span>/</span>
          <span className="text-foreground font-medium">{title}</span>
        </nav>
      </div>

      <div className="flex items-center flex-wrap gap-2">
        {/* Interactive Calendar Date Range Picker */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg text-xs font-medium bg-background border border-input hover:bg-accent hover:text-accent-foreground shadow-xs transition-colors cursor-pointer"
            >
              <CalendarIcon className="size-3.5 text-primary" />
              <span>
                {format(dateRange.from, "dd MMM yy")} - {format(dateRange.to, "dd MMM yy")}
              </span>
              <ChevronDown className="size-3 text-muted-foreground opacity-60" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="flex flex-col sm:flex-row">
              <div className="p-3 border-b sm:border-b-0 sm:border-r border-border flex flex-col gap-1 text-xs min-w-[120px]">
                <span className="font-semibold text-[11px] text-muted-foreground uppercase px-2 py-1">Quick Range</span>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(0)}
                  className="text-left px-2 py-1.5 rounded hover:bg-muted font-medium cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(7)}
                  className="text-left px-2 py-1.5 rounded hover:bg-muted font-medium cursor-pointer"
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(30)}
                  className="text-left px-2 py-1.5 rounded hover:bg-muted font-medium cursor-pointer"
                >
                  Last 30 Days
                </button>
                <button
                  type="button"
                  onClick={handleSelectThisMonth}
                  className="text-left px-2 py-1.5 rounded hover:bg-muted font-medium cursor-pointer"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(90)}
                  className="text-left px-2 py-1.5 rounded hover:bg-muted font-medium cursor-pointer"
                >
                  Last 90 Days
                </button>
              </div>
              <div className="p-2">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range: any) => {
                    if (range?.from) {
                      const to = range.to || range.from;
                      setDateRange({ from: range.from, to });
                      onDateChange?.({ from: range.from, to });
                      if (range.to) setIsOpen(false);
                    }
                  }}
                  numberOfMonths={1}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={handleRefresh}
          title="Refresh Data"
          className="size-9 rounded-lg border border-input bg-background flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer shadow-xs"
        >
          <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
        </button>

        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>Export</span>
              <ChevronDown className="size-3 opacity-80" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
              <FileText className="size-4 mr-2 text-rose-500" />
              <span>Export as PDF</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
              <FileSpreadsheet className="size-4 mr-2 text-emerald-600" />
              <span>Export as Excel / CSV</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
