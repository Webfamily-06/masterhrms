'use client';

import { useState, useMemo } from "react";
import { Link } from "@/src/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

function formatDate(dateStr?: string | Date | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function EmployeeCertificationsPage() {
  const { data: profile } = useCurrentProfile();

  const [search, setSearch] = useState("");
  const [viewCertItem, setViewCertItem] = useState<any | null>(null);

  // Fetch all certifications
  const { data: certsData, isLoading } = useQuery({
    queryKey: ["my-training-certifications"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/training/certifications");
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });
  const allCerts: any[] = Array.isArray(certsData) ? certsData : [];

  // Filter for current user's certifications
  const currentEmpId = profile?.id;
  const currentEmail = profile?.email;

  const myCerts = allCerts.filter((c: any) => {
    if (!currentEmpId && !currentEmail) return true;
    return c.employeeId === currentEmpId || c.employee?.id === currentEmpId || c.employee?.email === currentEmail;
  });

  const displayList = myCerts.length > 0 ? myCerts : allCerts;

  const filtered = displayList.filter((c: any) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const course = (c.course?.title || c.course?.name || "").toLowerCase();
    const certId = (c.certificateId || "").toLowerCase();
    return course.includes(term) || certId.includes(term);
  });

  const totalCerts = displayList.length;
  const activeCerts = displayList.filter((c: any) => !c.expiryDate || new Date(c.expiryDate) >= new Date()).length;
  const avgScore = totalCerts > 0
    ? Math.round(displayList.reduce((acc: number, cur: any) => acc + Number(cur.score || 100), 0) / totalCerts)
    : 100;

  return (
    <div className="w-full space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        title="My Certifications & Badges"
        description="View your earned professional credentials, verified skills badges, course scores, and certificate previews."
        actions={
          <div className="flex items-center gap-2">
            <Link to="/me/training/trainings">
              <Button variant="outline" size="sm" className="gap-1.5 h-8 font-semibold text-xs">
                <i className="ph ph-graduation-cap text-sm" />
                <span>My Courses</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* ── KPI Visual Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Earned Certifications</span>
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <i className="ph ph-certificate text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">{totalCerts} Badges</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Accredited skills & completed courses</p>
            </div>
            <div className="text-[11px] text-primary font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-medal text-xs" />
              <span>Skill Inventory</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Active & Valid</span>
              <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <i className="ph ph-check-circle text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-emerald-600">{activeCerts} Verified</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Currently valid without expiration</p>
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-seal-check text-xs" />
              <span>Compliant</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Average Score</span>
              <div className="size-8 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
                <i className="ph ph-trend-up text-base" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-sky-600">{avgScore}%</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Cumulative evaluation performance</p>
            </div>
            <div className="text-[11px] text-sky-600 font-semibold flex items-center gap-1.5 pt-1 border-t border-border/40">
              <i className="ph ph-star text-xs" />
              <span>Excellence Rating</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Search Toolbar ── */}
      <div className="flex items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80">
        <div className="relative w-full sm:w-80">
          <i className="ph ph-magnifying-glass absolute left-3 top-2.5 text-muted-foreground text-sm" />
          <Input
            placeholder="Search certificate or skill name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div className="text-xs text-muted-foreground font-semibold">
          Showing {filtered.length} of {displayList.length} credentials
        </div>
      </div>

      {/* ── Data Table ── */}
      <Card className="border border-border/80 rounded-xl bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Certificate ID</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Course / Skill</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Issue Date</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Valid Until</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Score</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">Certificate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-xs text-muted-foreground">
                    Loading your certifications...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-xs text-muted-foreground italic">
                    No certifications found. Complete training programs to earn skill certificates.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c: any) => {
                  const isExpired = c.expiryDate && new Date(c.expiryDate) < new Date();

                  return (
                    <TableRow key={c.id} className="hover:bg-muted/40 transition-colors text-xs">
                      <TableCell className="p-3 tabular-nums font-bold text-muted-foreground">
                        {c.certificateId || `CERT-${c.id?.slice(0, 6) || "001"}`}
                      </TableCell>

                      <TableCell className="p-3 font-semibold text-foreground">
                        {c.course?.title || c.course?.name || "Professional Certification"}
                      </TableCell>

                      <TableCell className="p-3 tabular-nums text-muted-foreground">
                        {formatDate(c.certifiedAt)}
                      </TableCell>

                      <TableCell className="p-3 tabular-nums text-muted-foreground">
                        {formatDate(c.expiryDate)}
                      </TableCell>

                      <TableCell className="p-3 tabular-nums font-bold text-primary">
                        {c.score || "100"}%
                      </TableCell>

                      <TableCell className="p-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold capitalize",
                            !isExpired && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                            isExpired && "bg-rose-500/10 text-rose-600 border-rose-500/30"
                          )}
                        >
                          {isExpired ? "Expired" : "Active"}
                        </Badge>
                      </TableCell>

                      <TableCell className="p-3 text-right">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setViewCertItem(c)}
                          className="gap-1 font-semibold text-xs text-primary border-primary/30 hover:bg-primary/5"
                        >
                          <i className="ph ph-certificate text-xs" />
                          <span>View Badge</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── Dialog: View Certificate ── */}
      <Dialog open={!!viewCertItem} onOpenChange={(open) => !open && setViewCertItem(null)}>
        <DialogContent className="max-w-md text-center p-6 space-y-4">
          <div className="size-16 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <i className="ph ph-certificate text-3xl" />
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground uppercase tracking-widest tabular-nums">Certificate of Completion</span>
            <h3 className="text-lg font-bold text-foreground mt-1">
              {viewCertItem?.course?.title || viewCertItem?.course?.name || "Skill Certification"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Presented proudly to{" "}
              <strong className="text-foreground">
                {viewCertItem?.employee?.firstName
                  ? `${viewCertItem.employee.firstName} ${viewCertItem.employee.lastName || ""}`
                  : profile?.full_name || "Team Member"}
              </strong>
            </p>
          </div>

          <div className="bg-muted/40 p-4 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Certificate ID:</span>
              <span className="tabular-nums font-bold text-foreground">{viewCertItem?.certificateId || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Certified Date:</span>
              <span className="tabular-nums text-foreground">{formatDate(viewCertItem?.certifiedAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valid Through:</span>
              <span className="tabular-nums text-foreground">{formatDate(viewCertItem?.expiryDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Final Grade:</span>
              <span className="tabular-nums font-bold text-primary">{viewCertItem?.score || "100"}%</span>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t flex items-center justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setViewCertItem(null)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
