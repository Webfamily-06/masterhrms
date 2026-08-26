import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  ShoppingCart,
  Link2,
  Wallet,
  MoreVertical,
  Activity,
  BarChart3,
  ChevronRight,
  Plus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { useCurrentProfile, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { formatSystemAmount } from "@/lib/currency";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/_app/dashboard")({
  component: DashboardPage,
});

// ─── Theme Colors matching Sneat Pro ──────────────────────────────────────────
const PRIMARY = "oklch(0.55 0.22 280)";
const SUCCESS = "oklch(0.60 0.17 155)";
const WARNING = "oklch(0.73 0.16 75)";
const INFO    = "oklch(0.60 0.20 200)";
const ERROR   = "oklch(0.60 0.22 25)";

function MoreMenu({ items = ["Last 28 Days", "Last Month", "Last Year"] }: { items?: string[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {items.map((item) => (
          <DropdownMenuItem key={item} className="cursor-pointer text-xs">
            {item}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── CardStatisticsVertical (Exact Sneat Pro) ──────────────────────────────────
function CardStatisticsVertical({
  title,
  icon: Icon,
  stats,
  change,
  subtitle,
  color = "primary",
}: {
  title: string;
  icon: any;
  stats: string;
  change: number;
  subtitle: string;
  color?: "primary" | "success" | "info" | "warning";
}) {
  const isPositive = change >= 0;
  const colorMap = {
    primary: { bg: "bg-primary/10", text: "text-primary" },
    success: { bg: "bg-[oklch(0.60_0.17_155/0.10)]", text: "text-[oklch(0.60_0.17_155)]" },
    info:    { bg: "bg-[oklch(0.60_0.20_200/0.10)]", text: "text-[oklch(0.60_0.20_200)]" },
    warning: { bg: "bg-[oklch(0.73_0.16_75/0.10)]",  text: "text-[oklch(0.73_0.16_75)]" },
  };
  const c = colorMap[color];

  return (
    <Card className="h-full border border-border/70 shadow-xs">
      <CardContent className="p-5 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between mb-3">
          <div className={cn("size-10 rounded-lg flex items-center justify-center shrink-0", c.bg)}>
            <Icon className={cn("size-5", c.text)} />
          </div>
          <div
            className={cn(
              "flex items-center gap-0.5 text-xs font-semibold",
              isPositive ? "text-[oklch(0.60_0.17_155)]" : "text-[oklch(0.60_0.22_25)]"
            )}
          >
            <span>{isPositive ? `+${change}` : change}%</span>
            {isPositive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
          </div>
        </div>
        <div>
          <h4 className="text-2xl font-bold tracking-tight mb-1">{stats}</h4>
          <p className="text-xs text-muted-foreground font-medium mb-3">{title}</p>
          <Badge variant="secondary" className="text-[11px] font-normal px-2 py-0.5">
            {subtitle}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 1. CongratulationsJohn (Exact Layout with John illustration) ─────────────
function CongratulationsCard({
  profile,
  clockedIn,
  onClockToggle,
}: {
  profile: any;
  clockedIn: boolean;
  onClockToggle: () => void;
}) {
  const firstName = (profile?.full_name || profile?.email || "User").split(" ")[0];

  return (
    <Card className="overflow-visible h-full border border-border/70 shadow-xs relative">
      <CardContent className="p-6 pb-4 sm:pb-6 flex flex-col sm:flex-row items-center justify-between relative min-h-[175px]">
        <div className="flex-1 z-10">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-1.5">
            Congratulations <span className="font-extrabold text-foreground">{firstName}!</span>
          </h3>
          <p className="text-xs text-muted-foreground mb-1 font-medium">
            Best contributor of the month
          </p>
          <p className="text-xs text-muted-foreground/80 mb-5 max-w-md leading-relaxed">
            You have achieved 68% higher productivity and on-time task delivery today. Check your raising badge in your profile.
          </p>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={onClockToggle}
              className={cn(
                "h-8 px-4 text-xs font-semibold rounded-lg shadow-sm transition-all",
                clockedIn
                  ? "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              <Clock className="size-3.5 mr-1.5" />
              {clockedIn ? "Clock Out" : "Clock In"}
            </Button>
            <Button variant="outline" size="sm" asChild className="h-8 px-3 text-xs">
              <Link to="/employees">View Directory</Link>
            </Button>
          </div>
        </div>

        {/* John Illustration */}
        <div className="shrink-0 mt-4 sm:mt-0 sm:absolute sm:right-6 sm:bottom-0 z-0">
          <img
            src="/images/cards/illustration-john-light.png"
            alt="John illustration"
            className="h-36 sm:h-44 w-auto object-contain dark:hidden"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/favicon.webp";
            }}
          />
          <img
            src="/images/cards/illustration-john-dark.png"
            alt="John illustration"
            className="h-36 sm:h-44 w-auto object-contain hidden dark:block"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/favicon.webp";
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 2. TotalProfitLineCharts (Sessions / Profit sparkline) ───────────────────
const SESSIONS_DATA = [
  { v: 0 },
  { v: 20 },
  { v: 5 },
  { v: 30 },
  { v: 15 },
  { v: 45 },
];

function TotalProfitCard({
  value,
  label,
  pct,
  color = INFO,
}: {
  value: string;
  label: string;
  pct: string;
  color?: string;
}) {
  return (
    <Card className="h-full border border-border/70 shadow-xs">
      <CardContent className="p-5 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <h4 className="text-2xl font-bold tracking-tight">{value}</h4>
            <span className="text-xs text-[oklch(0.60_0.17_155)] font-bold">{pct}</span>
          </div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
        </div>
        <div className="h-[75px] -mx-2 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={SESSIONS_DATA} margin={{ top: 5, right: 10, bottom: 0, left: 10 }}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={3}
                dot={(props) => {
                  const isLast = props.index === SESSIONS_DATA.length - 1;
                  if (!isLast) return <g key={props.index} />;
                  return (
                    <circle
                      key={props.index}
                      cx={props.cx}
                      cy={props.cy}
                      r={5}
                      fill="var(--background)"
                      stroke={color}
                      strokeWidth={3}
                    />
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 3. TotalTransactions (Bar chart split with Report) ───────────────────────
const TOTAL_TXN_DATA = [
  { day: "Mon", thisWeek: 83, lastWeek: -84 },
  { day: "Tue", thisWeek: 153, lastWeek: -156 },
  { day: "Wed", thisWeek: 213, lastWeek: -216 },
  { day: "Thu", thisWeek: 279, lastWeek: -282 },
  { day: "Fri", thisWeek: 213, lastWeek: -216 },
  { day: "Sat", thisWeek: 153, lastWeek: -156 },
  { day: "Sun", thisWeek: 83, lastWeek: -84 },
];

function TotalTransactionsCard() {
  return (
    <Card className="h-full border border-border/70 shadow-xs">
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row h-full divide-y lg:divide-y-0 lg:divide-x divide-border/60">
          {/* Left: Bar Chart */}
          <div className="flex-1 p-5 sm:p-6">
            <h4 className="text-base font-bold tracking-tight mb-1">Total Transactions</h4>
            <div className="h-[250px] mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={TOTAL_TXN_DATA}
                  layout="vertical"
                  barCategoryGap="28%"
                  margin={{ top: 0, right: 12, bottom: 0, left: -10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="oklch(0.91 0.008 260 / 0.5)" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "oklch(0.56 0.025 265)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => String(Math.abs(v))}
                    orientation="top"
                  />
                  <YAxis
                    type="category"
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "oklch(0.56 0.025 265)" }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    formatter={(v: number) => Math.abs(v)}
                    contentStyle={{
                      background: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                  />
                  <Bar dataKey="thisWeek" name="This Week" fill={PRIMARY} radius={[0, 4, 4, 0]} barSize={9} />
                  <Bar dataKey="lastWeek" name="Last Week" fill={SUCCESS} radius={[0, 4, 4, 0]} barSize={9} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right: Reports Section */}
          <div className="lg:w-[42%] p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-base font-bold tracking-tight">Report</h4>
                  <p className="text-xs text-muted-foreground">Last month transactions $234.40k</p>
                </div>
                <MoreMenu />
              </div>

              <div className="grid grid-cols-2 divide-x divide-border/60 py-4 my-2">
                {[
                  { label: "This Week", value: "+82.45", positive: true, icon: BarChart3 },
                  { label: "Last Week", value: "-24.86", positive: false, icon: Wallet },
                ].map((r) => (
                  <div key={r.label} className="flex flex-col items-center gap-1.5 px-3">
                    <div
                      className={cn(
                        "size-10 rounded-lg flex items-center justify-center mb-1",
                        r.positive ? "bg-[oklch(0.60_0.17_155/0.10)]" : "bg-primary/10"
                      )}
                    >
                      <r.icon
                        className={cn(
                          "size-5",
                          r.positive ? "text-[oklch(0.60_0.17_155)]" : "text-primary"
                        )}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">{r.label}</p>
                    <p
                      className={cn(
                        "text-base font-bold",
                        r.positive ? "text-[oklch(0.60_0.17_155)]" : "text-[oklch(0.60_0.22_25)]"
                      )}
                    >
                      {r.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border/60 pt-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Performance</p>
                <p className="text-base font-bold text-foreground">+94.15%</p>
              </div>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-8">
                View Report
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 4. Performance (Radar Chart) ────────────────────────────────────────────
const PERFORMANCE_DATA = [
  { subject: "Jan", income: 70, netWorth: 110 },
  { subject: "Feb", income: 90, netWorth: 72 },
  { subject: "Mar", income: 80, netWorth: 62 },
  { subject: "Apr", income: 95, netWorth: 65 },
  { subject: "May", income: 75, netWorth: 100 },
  { subject: "Jun", income: 90, netWorth: 75 },
];

function PerformanceCard() {
  return (
    <Card className="h-full border border-border/70 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-5 pb-1">
        <CardTitle className="text-base font-bold">Performance</CardTitle>
        <MoreMenu />
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={PERFORMANCE_DATA} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke="oklch(0.88 0.008 260 / 0.6)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "oklch(0.56 0.025 265)" }} />
              <PolarRadiusAxis tick={false} axisLine={false} />
              <Radar name="Income" dataKey="income" stroke={WARNING} fill={WARNING} fillOpacity={0.35} strokeWidth={2} />
              <Radar name="Net Worth" dataKey="netWorth" stroke={PRIMARY} fill={PRIMARY} fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-1">
          {[
            { label: "Income", color: WARNING },
            { label: "Net Worth", color: PRIMARY },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-full" style={{ background: l.color }} />
              <span className="text-xs text-muted-foreground font-medium">{l.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 5. Project Statistics ───────────────────────────────────────────────────
const PROJECTS = [
  { title: "3D Illustration", subtitle: "Blender Illustration", budget: "$6,500", img: "/images/cards/3d-illustration.png" },
  { title: "Finance App Design", subtitle: "Figma UI Kit", budget: "$4,290", img: "/images/cards/finance-app-design.png" },
  { title: "4 Square", subtitle: "Android Application", budget: "$44,500", img: "/images/cards/4-square.png" },
  { title: "Delta Web App", subtitle: "React Dashboard", budget: "$12,690", img: "/images/cards/delta-web-app.png" },
  { title: "eCommerce Website", subtitle: "Vue + Laravel", budget: "$10,850", img: "/images/cards/ecommerce-website.png" },
];

function ProjectStatisticsCard({ data }: { data?: any[] }) {
  const projects = data?.length ? data : PROJECTS;

  return (
    <Card className="h-full border border-border/70 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-5 pb-2">
        <CardTitle className="text-base font-bold">Project Statistics</CardTitle>
        <MoreMenu />
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 pb-2 border-b border-border/60">
          <span>Name</span>
          <span>Budget</span>
        </div>
        <div className="space-y-3.5">
          {projects.map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="size-9 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-muted/50 border border-border/40">
                <img
                  src={p.img || "/images/cards/3d-illustration.png"}
                  alt={p.title}
                  className="size-6 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/favicon.webp";
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{p.title}</p>
                <p className="text-[11px] text-muted-foreground truncate">{p.subtitle}</p>
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px] font-bold bg-primary/5 text-primary border-primary/20 py-0.5">
                {p.budget}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 6. TotalRevenueBarCharts ─────────────────────────────────────────────────
const REVENUE_DATA = [
  { m: "Jan", earning: 120, expense: 72 },
  { m: "Feb", earning: 200, expense: 120 },
  { m: "Mar", earning: 150, expense: 50 },
  { m: "Apr", earning: 120, expense: 65 },
];

function TotalRevenueCard() {
  return (
    <Card className="h-full border border-border/70 shadow-xs">
      <CardContent className="p-4 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <h4 className="text-xl font-bold tracking-tight">$42.5k</h4>
            <span className="text-xs text-[oklch(0.60_0.22_25)] font-bold">-22%</span>
          </div>
          <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
        </div>
        <div className="h-[85px] -mx-2 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={REVENUE_DATA} barCategoryGap="20%" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Bar dataKey="earning" fill={PRIMARY} radius={[3, 3, 0, 0]} barSize={7} />
              <Bar dataKey="expense" fill={WARNING} radius={[3, 3, 0, 0]} barSize={7} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 7. OverviewRadialBarCharts ───────────────────────────────────────────────
function OverviewCard({
  value = "$67.1k",
  pct = "+49%",
  attendanceRate = 64,
}: {
  value?: string;
  pct?: string;
  attendanceRate?: number;
}) {
  const circumference = 2 * Math.PI * 32;
  const dashOffset = circumference * (1 - attendanceRate / 100);

  return (
    <Card className="h-full border border-border/70 shadow-xs">
      <CardContent className="p-4 flex flex-col justify-between items-center text-center h-full">
        <div className="w-full text-left">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h4 className="text-xl font-bold tracking-tight">{value}</h4>
            <span className="text-xs text-[oklch(0.60_0.17_155)] font-bold">{pct}</span>
          </div>
          <p className="text-xs text-muted-foreground font-medium">Overview</p>
        </div>
        <div className="relative flex items-center justify-center my-1">
          <svg width="76" height="76" viewBox="0 0 76 76">
            <circle cx="38" cy="38" r="32" fill="none" stroke="oklch(0.91 0.008 260 / 0.6)" strokeWidth="6" />
            <circle
              cx="38"
              cy="38"
              r="32"
              fill="none"
              stroke={PRIMARY}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 38 38)"
              style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
          </svg>
          <span className="absolute text-xs font-extrabold">{attendanceRate}%</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 8. SalesCountry ──────────────────────────────────────────────────────────
const COUNTRY_DATA = [
  { country: "US", sales: 17165 },
  { country: "IN", sales: 13850 },
  { country: "JA", sales: 12375 },
  { country: "CA", sales: 9567 },
  { country: "AU", sales: 7880 },
];
const COUNTRY_COLORS = [PRIMARY, SUCCESS, WARNING, INFO, ERROR];

function SalesCountryCard() {
  return (
    <Card className="h-full border border-border/70 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-5 pb-2">
        <div>
          <CardTitle className="text-base font-bold">Sales Country</CardTitle>
          <p className="text-xs text-muted-foreground">Total $42,580 Sales</p>
        </div>
        <MoreMenu />
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={COUNTRY_DATA} layout="vertical" margin={{ top: 0, right: 35, bottom: 0, left: -10 }}>
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "oklch(0.56 0.025 265)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="country"
                tick={{ fontSize: 12, fill: "oklch(0.35 0.02 265)", fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                formatter={(v: number) => [`$${v.toLocaleString()}`, "Sales"]}
                contentStyle={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
              />
              <Bar
                dataKey="sales"
                radius={[0, 6, 6, 0]}
                barSize={14}
                label={{
                  position: "right",
                  fontSize: 10,
                  fill: "oklch(0.56 0.025 265)",
                  formatter: (v: number) => `$${(v / 1000).toFixed(1)}k`,
                }}
              >
                {COUNTRY_DATA.map((_, i) => (
                  <rect key={i} fill={COUNTRY_COLORS[i % COUNTRY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 9. TopReferralSources ────────────────────────────────────────────────────
type TabKey = "google" | "facebook" | "instagram" | "reddit";

const REFERRAL_DATA: Record<TabKey, { title: string; status: { text: string; color: string }; conversion: number; revenue: string }[]> = {
  google: [
    { title: "Email Marketing Campaign", status: { text: "Active", color: "primary" }, conversion: 24, revenue: "42,857" },
    { title: "Google Workspace", status: { text: "Completed", color: "warning" }, conversion: -12, revenue: "850" },
    { title: "Affiliation Program", status: { text: "Active", color: "primary" }, conversion: 24, revenue: "5,576" },
    { title: "Google AdSense", status: { text: "In Draft", color: "info" }, conversion: 0, revenue: "0" },
  ],
  facebook: [
    { title: "Create Audiences in Ads Manager", status: { text: "Active", color: "primary" }, conversion: -8, revenue: "322" },
    { title: "Facebook page advertising", status: { text: "Active", color: "primary" }, conversion: 19, revenue: "5,634" },
    { title: "Messenger advertising", status: { text: "Expired", color: "error" }, conversion: -23, revenue: "751" },
    { title: "Video campaign", status: { text: "Completed", color: "warning" }, conversion: 21, revenue: "3,585" },
  ],
  instagram: [
    { title: "Create shopping advertising", status: { text: "In Draft", color: "info" }, conversion: -15, revenue: "599" },
    { title: "IGTV advertising", status: { text: "Completed", color: "warning" }, conversion: 37, revenue: "1,467" },
    { title: "Collection advertising", status: { text: "In Draft", color: "info" }, conversion: 0, revenue: "0" },
    { title: "Stories advertising", status: { text: "Active", color: "primary" }, conversion: 29, revenue: "4,546" },
  ],
  reddit: [
    { title: "Interests advertising", status: { text: "Expired", color: "error" }, conversion: 2, revenue: "404" },
    { title: "Community advertising", status: { text: "Active", color: "primary" }, conversion: 25, revenue: "399" },
    { title: "Device advertising", status: { text: "Completed", color: "warning" }, conversion: 21, revenue: "177" },
    { title: "Campaigning", status: { text: "Active", color: "primary" }, conversion: -5, revenue: "1,139" },
  ],
};

const REFERRAL_CATEGORIES: { key: TabKey; title: string; img: string }[] = [
  { key: "google", title: "Google", img: "/images/logos/google.png" },
  { key: "facebook", title: "Facebook", img: "/images/logos/facebook.png" },
  { key: "instagram", title: "Instagram", img: "/images/logos/instagram.png" },
  { key: "reddit", title: "Reddit", img: "/images/logos/reddit.png" },
];

const STATUS_CHIP_COLORS: Record<string, string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
  success: "bg-[oklch(0.60_0.17_155/0.1)] text-[oklch(0.60_0.17_155)] border-[oklch(0.60_0.17_155/0.2)]",
  warning: "bg-[oklch(0.73_0.16_75/0.1)] text-[oklch(0.73_0.16_75)] border-[oklch(0.73_0.16_75/0.2)]",
  info:    "bg-[oklch(0.60_0.20_200/0.1)] text-[oklch(0.60_0.20_200)] border-[oklch(0.60_0.20_200/0.2)]",
  error:   "bg-[oklch(0.60_0.22_25/0.1)] text-[oklch(0.60_0.22_25)] border-[oklch(0.60_0.22_25/0.2)]",
};

function TopReferralSourcesCard() {
  const [currentTab, setCurrentTab] = useState<TabKey>("google");
  const selectedProduct = REFERRAL_DATA[currentTab];

  return (
    <Card className="h-full border border-border/70 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-5 pb-3">
        <div>
          <CardTitle className="text-base font-bold">Top Referral Sources</CardTitle>
          <p className="text-xs text-muted-foreground">Number of Sales</p>
        </div>
        <MoreMenu />
      </CardHeader>

      <CardContent className="px-5 pb-4">
        {/* Category Logo Tiles */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {REFERRAL_CATEGORIES.map((category) => {
            const isSelected = currentTab === category.key;
            return (
              <button
                key={category.key}
                type="button"
                onClick={() => setCurrentTab(category.key)}
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl p-3 size-20 shrink-0 transition-all cursor-pointer",
                  isSelected
                    ? "border-2 border-primary bg-primary/5 shadow-xs"
                    : "border-2 border-dashed border-border/70 hover:border-primary/40"
                )}
              >
                <img
                  src={category.img}
                  alt={category.title}
                  className="size-8 object-contain mb-1"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/favicon.webp";
                  }}
                />
              </button>
            );
          })}
          <div className="flex flex-col items-center justify-center rounded-xl p-3 size-20 shrink-0 border-2 border-dashed border-border/70 text-muted-foreground">
            <Plus className="size-5" />
          </div>
        </div>
      </CardContent>

      {/* Referral Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-y border-border/60 bg-muted/20">
              <th className="text-left px-5 py-3 font-bold uppercase tracking-wider text-muted-foreground w-1/2">
                Parameter
              </th>
              <th className="text-left px-3 py-3 font-bold uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="text-right px-3 py-3 font-bold uppercase tracking-wider text-muted-foreground">
                Conversion
              </th>
              <th className="text-right px-5 py-3 font-bold uppercase tracking-wider text-muted-foreground">
                Total Revenue
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {selectedProduct.map((product, i) => (
              <tr key={i} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3 font-semibold text-foreground">{product.title}</td>
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                      STATUS_CHIP_COLORS[product.status.color] || STATUS_CHIP_COLORS.primary
                    )}
                  >
                    {product.status.text}
                  </span>
                </td>
                <td
                  className={cn(
                    "px-3 py-3 text-right font-bold",
                    product.conversion > 0 ? "text-[oklch(0.60_0.17_155)]" : "text-[oklch(0.60_0.22_25)]"
                  )}
                >
                  {product.conversion > 0 ? `+${product.conversion}` : product.conversion}%
                </td>
                <td className="px-5 py-3 text-right font-bold text-foreground">${product.revenue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── 10. WeeklySales ──────────────────────────────────────────────────────────
const WEEKLY_SALES_DATA = [
  { m: "Jan", earning: 90, expense: -53 },
  { m: "Feb", earning: 52, expense: -29 },
  { m: "Mar", earning: 67, expense: -67 },
  { m: "Apr", earning: 45, expense: -84 },
  { m: "May", earning: 75, expense: -60 },
  { m: "Jun", earning: 55, expense: -40 },
  { m: "Jul", earning: 48, expense: -77 },
];

function WeeklySalesCard() {
  return (
    <Card className="h-full border border-border/70 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-5 pb-2">
        <div>
          <CardTitle className="text-base font-bold">Weekly Sales</CardTitle>
          <p className="text-xs text-muted-foreground">Total 85.4k Sales</p>
        </div>
        <MoreMenu />
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "Net Income", amount: "$438.5k", icon: TrendingUp, color: "bg-primary/10 text-primary" },
            { label: "Expense", amount: "$22.4k", icon: Wallet, color: "bg-[oklch(0.73_0.16_75/0.1)] text-[oklch(0.73_0.16_75)]" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2.5">
              <div className={cn("size-9 rounded-lg flex items-center justify-center shrink-0", item.color)}>
                <item.icon className="size-4.5" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">{item.label}</p>
                <p className="text-sm font-bold text-foreground">{item.amount}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={WEEKLY_SALES_DATA} barCategoryGap="30%" margin={{ top: 0, right: 0, bottom: 0, left: -25 }}>
              <CartesianGrid vertical={false} stroke="oklch(0.91 0.008 260 / 0.5)" />
              <XAxis dataKey="m" tick={{ fontSize: 11, fill: "oklch(0.56 0.025 265)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "oklch(0.56 0.025 265)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
              />
              <Bar dataKey="earning" name="Earning" fill={PRIMARY} radius={[4, 4, 0, 0]} barSize={9} />
              <Bar dataKey="expense" name="Expense" fill={`${PRIMARY}33`} radius={[4, 4, 0, 0]} barSize={9} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 11. VisitsByDay ──────────────────────────────────────────────────────────
const VISITS_DATA = [
  { day: "S", visits: 47 },
  { day: "M", visits: 55 },
  { day: "T", visits: 48 },
  { day: "W", visits: 65 },
  { day: "T", visits: 80 },
  { day: "F", visits: 38 },
  { day: "S", visits: 52 },
];

function VisitsByDayCard() {
  return (
    <Card className="h-full border border-border/70 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-5 pb-2">
        <div>
          <CardTitle className="text-base font-bold">Visits by Day</CardTitle>
          <p className="text-xs text-muted-foreground">Total 248.5k Visits</p>
        </div>
        <MoreMenu />
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="h-[195px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={VISITS_DATA} barCategoryGap="16%" margin={{ top: 0, right: 0, bottom: 0, left: -25 }}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "oklch(0.56 0.025 265)" }} axisLine={false} tickLine={false} />
              <YAxis tick={false} axisLine={false} tickLine={false} />
              <Bar dataKey="visits" radius={[6, 6, 6, 6]} barSize={16}>
                {VISITS_DATA.map((entry, index) => (
                  <rect key={index} fill={entry.visits === 80 ? WARNING : `${WARNING}30`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-border/60">
          <div>
            <p className="text-xs font-bold text-foreground">Most Visited Day</p>
            <p className="text-[11px] text-muted-foreground">Total 62.4k Visits on Thursday</p>
          </div>
          <Button
            size="icon"
            variant="outline"
            className="size-8 rounded-lg border-[oklch(0.73_0.16_75)] text-[oklch(0.73_0.16_75)] hover:bg-[oklch(0.73_0.16_75/0.1)]"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 12. ActivityTimeline (Exact Sneat VTimeline layout) ──────────────────────
function ActivityTimelineCard({ events }: { events: any[] }) {
  const defaultEvents = [
    {
      dotColor: "primary",
      title: "12 Invoices have been paid",
      meta: "12 min ago",
      content: "Invoices have been paid to the company",
      attachment: "invoices.pdf",
    },
    {
      dotColor: "success",
      title: "Client Meeting",
      meta: "45 min ago",
      content: "Project meeting with john @10:15am",
      person: { name: "Lester McCarthy (Client)", role: "CEO of Pixinvent" },
    },
    {
      dotColor: "info",
      title: "Create a new project for client",
      meta: "2 Day Ago",
      content: "6 team members in a project",
      avatarCount: 3,
    },
  ];

  const DOT_COLORS: Record<string, string> = {
    primary: "bg-primary",
    success: "bg-[oklch(0.60_0.17_155)]",
    info:    "bg-[oklch(0.60_0.20_200)]",
    warning: "bg-[oklch(0.73_0.16_75)]",
  };

  const displayEvents =
    events.length > 0
      ? events.slice(0, 4).map((e: any) => ({
          dotColor:
            e.status === "approved" || e.status === "present"
              ? "success"
              : e.status === "rejected" || e.status === "absent"
              ? "warning"
              : "primary",
          title: e.title || e.description || "Activity Event",
          meta: e.timeAgo || e.time || "Recently",
          content: e.details || e.description || "",
        }))
      : defaultEvents;

  return (
    <Card className="h-full border border-border/70 shadow-xs">
      <CardHeader className="px-5 pt-5 pb-2">
        <CardTitle className="text-base font-bold">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="relative space-y-5">
          {displayEvents.map((ev: any, i: number) => (
            <div key={i} className="flex gap-3.5 relative">
              {/* Vertical Connector Line */}
              {i < displayEvents.length - 1 && (
                <div className="absolute left-[6.5px] top-6 bottom-[-20px] w-px bg-border/80" />
              )}
              {/* Dot */}
              <div
                className={cn(
                  "size-3.5 rounded-full mt-1 shrink-0 ring-2 ring-background",
                  DOT_COLORS[ev.dotColor] || DOT_COLORS.primary
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                  <p className="text-xs font-bold leading-tight text-foreground">{ev.title}</p>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">{ev.meta}</span>
                </div>
                {ev.content && <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{ev.content}</p>}
                {ev.attachment && (
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-1 text-xs font-medium border border-border/50">
                    <Activity className="size-3.5 text-primary" />
                    <span>{ev.attachment}</span>
                  </div>
                )}
                {ev.person && (
                  <div className="flex items-center gap-2 mt-2">
                    <Avatar className="size-7">
                      <AvatarImage src="/images/avatars/avatar-1.png" />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">LM</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-semibold text-foreground leading-tight">{ev.person.name}</p>
                      <p className="text-[10px] text-muted-foreground">{ev.person.role}</p>
                    </div>
                  </div>
                )}
                {ev.avatarCount && (
                  <div className="flex items-center gap-1 mt-2">
                    {[1, 2, 3].map((num) => (
                      <Avatar key={num} className="size-7 border-2 border-background -ml-1 first:ml-0">
                        <AvatarImage src={`/images/avatars/avatar-${num}.png`} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">U</AvatarFallback>
                      </Avatar>
                    ))}
                    <div className="size-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-bold text-muted-foreground -ml-1">
                      +3
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── MASTER DASHBOARD PAGE (Exact Sneat Pro Grid Structure) ───────────────────
function DashboardPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const qc = useQueryClient();
  const [clockedIn, setClockedIn] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get("/dashboard/stats"),
    staleTime: 60_000,
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: () => api.get("/dashboard/recent-activity"),
    staleTime: 120_000,
  });

  const { data: todayAttendance } = useQuery({
    queryKey: ["today-attendance"],
    queryFn: () => api.get("/attendance/today"),
    staleTime: 30_000,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["dashboard-projects"],
    queryFn: () => api.get("/projects?limit=5"),
    staleTime: 300_000,
  });

  useEffect(() => {
    if (todayAttendance?.clockedIn !== undefined) setClockedIn(!!todayAttendance.clockedIn);
  }, [todayAttendance]);

  async function handleClockToggle() {
    try {
      await api.post(`/attendance/${clockedIn ? "clock-out" : "clock-in"}`);
      setClockedIn(!clockedIn);
      qc.invalidateQueries({ queryKey: ["today-attendance"] });
      toast.success(clockedIn ? "Clocked out" : "Clocked in successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* ── ROW 1: Congratulations(8) + StatVertical(2) + LineChart(2) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-5">
        <div className="col-span-1 sm:col-span-2 md:col-span-8">
          <CongratulationsCard profile={profile} clockedIn={clockedIn} onClockToggle={handleClockToggle} />
        </div>
        <div className="col-span-1 sm:col-span-1 md:col-span-2">
          <CardStatisticsVertical
            title="Total Orders"
            icon={ShoppingCart}
            stats={(stats?.totalOrders ?? "155k").toLocaleString()}
            change={22}
            subtitle="Last 4 Month"
            color="primary"
          />
        </div>
        <div className="col-span-1 sm:col-span-1 md:col-span-2">
          <TotalProfitCard
            value={formatSystemAmount(stats?.monthlyPayroll ?? 38500)}
            label="Sessions"
            pct="+62%"
            color={INFO}
          />
        </div>
      </div>

      {/* ── ROW 2: TotalTransactions(8) + Performance Radar(4) ─────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="col-span-1 md:col-span-8">
          <TotalTransactionsCard />
        </div>
        <div className="col-span-1 md:col-span-4">
          <PerformanceCard />
        </div>
      </div>

      {/* ── ROW 3: ProjectStatistics(4) + 2x2 Mini Cards(4) + SalesCountry(4) ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="col-span-1 md:col-span-4">
          <ProjectStatisticsCard data={projects} />
        </div>
        <div className="col-span-1 md:col-span-4">
          <div className="grid grid-cols-2 gap-4 h-full">
            <TotalRevenueCard />
            <CardStatisticsVertical
              title="Total Sales"
              icon={Wallet}
              stats={`$${stats?.totalSales ?? "13.4k"}`}
              change={38}
              subtitle="Last Six Months"
              color="success"
            />
            <CardStatisticsVertical
              title="Total Impression"
              icon={Link2}
              stats={`${stats?.totalImpressions ?? "142.8k"}`}
              change={62}
              subtitle="Last One Year"
              color="info"
            />
            <OverviewCard
              value={formatSystemAmount(stats?.monthlyRevenue ?? 67100)}
              pct="+49%"
              attendanceRate={stats?.attendanceRate ?? 64}
            />
          </div>
        </div>
        <div className="col-span-1 md:col-span-4">
          <SalesCountryCard />
        </div>
      </div>

      {/* ── ROW 4: WeeklySales(4) + TopReferralSources(8) ─────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="col-span-1 md:col-span-4">
          <WeeklySalesCard />
        </div>
        <div className="col-span-1 md:col-span-8">
          <TopReferralSourcesCard />
        </div>
      </div>

      {/* ── ROW 5: VisitsByDay(4) + ActivityTimeline(8) ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="col-span-1 md:col-span-4">
          <VisitsByDayCard />
        </div>
        <div className="col-span-1 md:col-span-8">
          <ActivityTimelineCard events={recentActivity} />
        </div>
      </div>
    </div>
  );
}
