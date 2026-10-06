import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  breadcrumbs = [{ label: "Home", href: "/" }, { label: "Dashboard", href: "/hrm-dashboard" }],
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-border/60 bg-card/75 backdrop-blur-xs shadow-2xs mb-6">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {badge && (
            <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary border-primary/20">
              {badge}
            </Badge>
          )}
        </div>
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
          <Link to="/" className="hover:text-foreground transition-colors flex items-center gap-1">
            <Home className="size-3.5 text-muted-foreground/70" />
            <span>Home</span>
          </Link>
          {breadcrumbs.map((bc, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />
              {bc.href ? (
                <Link to={bc.href} className="hover:text-foreground transition-colors">
                  {bc.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{bc.label}</span>
              )}
            </React.Fragment>
          ))}
          <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />
          <span className="text-foreground font-semibold">{title}</span>
        </nav>
      </div>

      <div className="flex items-center flex-wrap gap-2.5">
        {/* Interactive Calendar Date Range Picker */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs font-medium bg-background/90 border-border/70 hover:bg-muted/80 shadow-2xs gap-2 rounded-xl"
            >
              <CalendarIcon className="size-3.5 text-primary" />
              <span>
                {format(dateRange.from, "dd MMM yy")} - {format(dateRange.to, "dd MMM yy")}
              </span>
              <ChevronDown className="size-3 text-muted-foreground opacity-60 ml-0.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 rounded-2xl border border-border/70 shadow-lg" align="end">
            <div className="flex flex-col sm:flex-row">
              <div className="p-3 border-b sm:border-b-0 sm:border-r border-border/60 flex flex-col gap-1 text-xs min-w-[130px] bg-muted/20">
                <span className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider px-2 py-1">Quick Range</span>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(0)}
                  className="text-left px-2.5 py-1.5 rounded-lg hover:bg-muted font-medium cursor-pointer transition-colors"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(7)}
                  className="text-left px-2.5 py-1.5 rounded-lg hover:bg-muted font-medium cursor-pointer transition-colors"
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(30)}
                  className="text-left px-2.5 py-1.5 rounded-lg hover:bg-muted font-medium cursor-pointer transition-colors"
                >
                  Last 30 Days
                </button>
                <button
                  type="button"
                  onClick={handleSelectThisMonth}
                  className="text-left px-2.5 py-1.5 rounded-lg hover:bg-muted font-medium cursor-pointer transition-colors"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(90)}
                  className="text-left px-2.5 py-1.5 rounded-lg hover:bg-muted font-medium cursor-pointer transition-colors"
                >
                  Last 90 Days
                </button>
              </div>
              <div className="p-2.5">
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
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          title="Refresh Data"
          className="size-9 rounded-xl border border-border/70 bg-background/90 hover:bg-muted/80 shadow-2xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
        </Button>

        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-9 px-3.5 text-xs font-semibold gap-1.5 rounded-xl shadow-2xs"
            >
              <Download className="size-3.5" />
              <span>Export</span>
              <ChevronDown className="size-3 opacity-80 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 p-1 rounded-xl shadow-md border-border/70">
            <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer rounded-lg text-xs py-2">
              <FileText className="size-4 mr-2 text-rose-500" />
              <span>Export as PDF</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer rounded-lg text-xs py-2">
              <FileSpreadsheet className="size-4 mr-2 text-emerald-600" />
              <span>Export as Excel / CSV</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

