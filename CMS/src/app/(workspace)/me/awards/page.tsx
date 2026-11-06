'use client';

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trophy,
  Award,
  Medal,
  Star,
  Gift,
  Eye,
  Calendar,
  Sparkles,
  Download,
  Printer,
  ShieldCheck,
  Zap,
  Heart,
  Users,
  Crown,
  Send,
  Clock,
  CheckCircle2,
  X,
  RotateCcw,
  ExternalLink,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Canonical composites & system states
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { LoadingState } from "@/components/system-states/loading-state";
import { EmptyState } from "@/components/system-states/empty-state";

function renderAwardIcon(iconName?: string | null, className = "h-5 w-5") {
  switch (iconName?.toLowerCase()) {
    case "award":
      return <Award className={className} />;
    case "star":
      return <Star className={className} />;
    case "zap":
      return <Zap className={className} />;
    case "heart":
      return <Heart className={className} />;
    case "users":
      return <Users className={className} />;
    case "medal":
      return <Medal className={className} />;
    case "crown":
      return <Crown className={className} />;
    case "sparkles":
      return <Sparkles className={className} />;
    case "trophy":
    default:
      return <Trophy className={className} />;
  }
}

function renderNominationStatusBadge(status: string) {
  switch (status) {
    case "APPROVED":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200">
          <CheckCircle2 className="size-3 mr-1" /> Approved
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200">
          <X className="size-3 mr-1" /> Rejected
        </Badge>
      );
    case "CHANGES_REQUESTED":
      return (
        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200">
          <RotateCcw className="size-3 mr-1" /> Changes Requested
        </Badge>
      );
    case "AWARD_ISSUED":
      return (
        <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200">
          <Trophy className="size-3 mr-1" /> Award Issued
        </Badge>
      );
    case "PENDING":
    default:
      return (
        <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200">
          <Clock className="size-3 mr-1" /> Pending Review
        </Badge>
      );
  }
}

export default function MeAwardsSelfServicePage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const [activeTab, setActiveTab] = useState<"merits" | "nominations">("merits");
  const [certificateViewAward, setCertificateViewAward] = useState<any | null>(null);

  // Nomination Modal
  const [isNominateModalOpen, setIsNominateModalOpen] = useState(false);
  const [nominateNomineeId, setNominateNomineeId] = useState("");
  const [nominateAwardTypeId, setNominateAwardTypeId] = useState("");
  const [nominateReason, setNominateReason] = useState("");
  const [nominateAchievement, setNominateAchievement] = useState("");
  const [nominateEvidenceUrl, setNominateEvidenceUrl] = useState("");

  // Details Modal
  const [viewNomination, setViewNomination] = useState<any | null>(null);

  // Fetch only the authenticated employee's awards (session-derived endpoint)
  const { data: responseData, isLoading: isAwardsLoading } = useQuery({
    queryKey: ["me-awards-self-service"],
    queryFn: async () => {
      const res: any = await api.get("/api/me/awards");
      return unwrapArray(res);
    },
  });

  const awards: any[] = useMemo(() => {
    return Array.isArray(responseData) ? responseData : [];
  }, [responseData]);

  // Fetch employee's submitted nominations
  const { data: nominationsResponse, isLoading: isNominationsLoading } = useQuery({
    queryKey: ["me-award-nominations"],
    queryFn: async () => {
      const res: any = await api.get("/api/me/awards/nominations");
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res)) return res;
      return [];
    },
  });

  const myNominations: any[] = useMemo(() => {
    return Array.isArray(nominationsResponse) ? nominationsResponse : [];
  }, [nominationsResponse]);

  // Fetch colleagues for nomination
  const { data: colleaguesData } = useQuery({
    queryKey: ["colleagues-for-nomination"],
    queryFn: async () => {
      const res = await api.get("/api/employees?limit=200");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });
  const colleagues: any[] = colleaguesData || [];

  // Fetch active award categories
  const { data: awardCategories = [] } = useQuery<any[]>({
    queryKey: ["active-award-categories-me"],
    queryFn: async () => {
      const res = await api.get("/api/hr/organization/award-types?status=active&limit=100");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  // Submit Nomination Mutation
  const submitNominationMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/api/me/awards/nominations", payload);
    },
    onSuccess: () => {
      toast.success("Nomination submitted successfully for approval!");
      setIsNominateModalOpen(false);
      resetNominationForm();
      qc.invalidateQueries({ queryKey: ["me-award-nominations"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to submit nomination.");
    },
  });

  const resetNominationForm = () => {
    setNominateNomineeId("");
    setNominateAwardTypeId("");
    setNominateReason("");
    setNominateAchievement("");
    setNominateEvidenceUrl("");
  };

  // Personal Metric Aggregates
  const currentYear = new Date().getFullYear();
  const thisYearCount = useMemo(() => {
    return awards.filter((a) => {
      if (!a.awardDate) return false;
      return new Date(a.awardDate).getFullYear() === currentYear;
    }).length;
  }, [awards, currentYear]);

  const totalRewardsValue = useMemo(() => {
    return awards.reduce((sum, a) => sum + (Number(a.giftAmount) || 0), 0);
  }, [awards]);

  const handleDownloadCertificatePdf = async (award: any) => {
    try {
      const activeCert = award.certificates?.[0];
      const certId = activeCert?.id;
      const downloadUrl = certId
        ? `/api/awards/certificates/${certId}/download`
        : `/api/v1/me/awards/${award.id}/certificate/download`;

      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error("Failed to download official PDF certificate.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${award.certificateNo || award.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Certificate downloaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to download certificate PDF.");
    }
  };

  const handlePrintCertificate = (award: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to download or print certificate.");
      return;
    }
    const anyProfile = profile as any;
    const empName = `${award.employee?.firstName || anyProfile?.firstName || anyProfile?.name || ""} ${award.employee?.lastName || anyProfile?.lastName || ""}`.trim() || "Distinguished Professional";
    const title = award.awardType?.name || award.giftItem || "Distinguished Service Award";
    const dateFormatted = award.awardDate ? format(new Date(award.awardDate), "dd MMMM yyyy") : "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Certificate - ${title} - ${empName}</title>
          <style>
            body { font-family: 'Georgia', serif; padding: 40px; color: #111; text-align: center; background: #fff; }
            .frame { border: 8px double #d97706; border-radius: 16px; padding: 50px 40px; max-width: 800px; margin: 0 auto; box-shadow: inset 0 0 30px rgba(217,119,6,0.1); }
            .header { text-transform: uppercase; letter-spacing: 4px; font-size: 13px; color: #b45309; font-weight: bold; margin-bottom: 12px; }
            h1 { font-size: 36px; margin: 0 0 16px; color: #1c1917; font-weight: 800; }
            .subtext { font-size: 14px; font-style: italic; color: #78716c; margin-bottom: 24px; }
            .recipient-tag { font-size: 13px; text-transform: uppercase; letter-spacing: 2px; color: #78716c; }
            .recipient-name { font-size: 32px; font-weight: bold; color: #b45309; margin: 8px 0 24px; border-bottom: 2px solid #fef3c7; display: inline-block; padding-bottom: 8px; }
            .citation { font-size: 15px; line-height: 1.8; color: #44403c; max-width: 600px; margin: 0 auto 36px; }
            .meta { display: flex; justify-content: space-between; border-top: 1px solid #e7e5e4; padding-top: 20px; font-size: 13px; color: #57534e; }
            .cert-no { font-family: monospace; font-size: 11px; color: #a8a29e; margin-top: 24px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="frame">
            <div class="header">Master HRMS Corporate Honors Registry</div>
            <h1>Certificate of Recognition</h1>
            <div class="subtext">Presented in formal appreciation of excellence and meritorious performance</div>
            <div class="recipient-tag">Bestowed upon</div>
            <div class="recipient-name">${empName}</div>
            <div class="citation">
              For exemplary dedication and distinguished accomplishment in earning the honor of <strong>${title}</strong>.
              ${award.description ? `<br><br><em>"${award.description}"</em>` : ""}
            </div>
            <div class="meta">
              <div>Presented By: <strong>${award.presentedBy || "Corporate Management"}</strong></div>
              <div>Date: <strong>${dateFormatted}</strong></div>
            </div>
            <div class="cert-no">Certificate Verification No: ${award.certificateNo || "AWD-VERIFIED"}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16">
      {/* ─── PageHeader with Action ────────────────────────────────────────── */}
      <PageHeader
        title="My Awards & Recognitions"
        description="Your verified corporate merit achievements, honors, commendation badges, and downloadable certificates."
        breadcrumbs={[
          { label: "Dashboard", href: "/me/dashboard" },
          { label: "My Profile", href: "/me/profile" },
          { label: "Awards & Recognitions" },
        ]}
        actions={
          <Button
            size="sm"
            onClick={() => {
              resetNominationForm();
              setIsNominateModalOpen(true);
            }}
            className="h-9 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Send className="size-3.5" />
            <span>Nominate a Colleague</span>
          </Button>
        }
      />

      {/* ─── Personal Stat Overview ────────────────────────────────────────── */}
      <StatsOverviewGrid columns={3}>
        <StatCard
          label="Total Honors Bestowed"
          value={awards.length}
          variant="warning"
          icon={<Trophy className="size-5" />}
          description="Lifetime corporate recognitions"
        />
        <StatCard
          label={`Earned in ${currentYear}`}
          value={thisYearCount}
          variant="info"
          icon={<Sparkles className="size-5" />}
          description="Recognitions in current calendar year"
        />
        <StatCard
          label="Disbursed Reward Value"
          value={`₹${totalRewardsValue.toLocaleString()}`}
          variant="success"
          icon={<Gift className="size-5" />}
          description="Total monetary recognition rewards"
        />
      </StatsOverviewGrid>

      {/* ─── Tab Switcher: Merits vs My Nominations ─────────────────────────── */}
      <div className="flex items-center gap-2 border-b pb-3">
        <Button
          variant={activeTab === "merits" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("merits")}
          className={cn(
            "h-8 text-xs gap-1.5",
            activeTab === "merits" ? "bg-amber-600 text-white hover:bg-amber-700" : "text-muted-foreground"
          )}
        >
          <Trophy className="size-3.5" />
          <span>My Merits & Honors</span>
          <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
            {awards.length}
          </Badge>
        </Button>

        <Button
          variant={activeTab === "nominations" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("nominations")}
          className={cn(
            "h-8 text-xs gap-1.5",
            activeTab === "nominations" ? "bg-purple-600 text-white hover:bg-purple-700" : "text-muted-foreground"
          )}
        >
          <Send className="size-3.5" />
          <span>My Nominations</span>
          <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
            {myNominations.length}
          </Badge>
        </Button>
      </div>

      {/* ─── TAB 1: MY MERITS & HONORS ──────────────────────────────────────── */}
      {activeTab === "merits" && (
        <>
          {isAwardsLoading ? (
            <LoadingState message="Loading your personal merits and awards..." />
          ) : awards.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No Corporate Awards Conferred Yet"
              description="Recognitions, quarterly performance badges, and milestone awards will appear here once conferred by leadership."
              actionLabel="Nominate a Colleague"
              onAction={() => {
                resetNominationForm();
                setIsNominateModalOpen(true);
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {awards.map((award: any) => (
                <Card
                  key={award.id}
                  className="overflow-hidden border border-border/60 hover:shadow-lg transition-all duration-200 bg-linear-to-b from-card to-amber-500/5 group flex flex-col justify-between"
                >
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="size-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                          {award.awardType?.imageUrl ? (
                            <img
                              src={award.awardType.imageUrl}
                              alt={award.awardType.name || "Award"}
                              className="size-full object-cover"
                            />
                          ) : (
                            renderAwardIcon(award.awardType?.icon, "size-6 text-amber-600")
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold text-foreground leading-tight">
                            {award.awardType?.name || award.giftItem || "Corporate Award"}
                          </CardTitle>
                          <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                            {award.certificateNo || "AWD-VERIFIED"}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 text-[10px]">
                        Conferred
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 pt-1 space-y-3">
                    {award.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed italic bg-muted/30 p-2.5 rounded-lg border border-border/40">
                        "{award.description}"
                      </p>
                    )}

                    <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="size-3.5 text-amber-600" />
                          <span>Conferred Date</span>
                        </span>
                        <span className="font-semibold text-foreground">
                          {award.awardDate ? format(new Date(award.awardDate), "dd MMMM yyyy") : "—"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="size-3.5 text-amber-600" />
                          <span>Presented By</span>
                        </span>
                        <span className="font-semibold text-foreground">
                          {award.presentedBy || "Management"}
                        </span>
                      </div>

                      {Number(award.giftAmount) > 0 && (
                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-emerald-600 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Gift className="size-3.5" />
                            <span>Honorary Reward</span>
                          </span>
                          <span>₹{Number(award.giftAmount).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <div className="p-3 bg-muted/20 border-t border-border/40 flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5 flex-1"
                      onClick={() => setCertificateViewAward(award)}
                    >
                      <Eye className="size-3.5" />
                      <span>View Certificate</span>
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleDownloadCertificatePdf(award)}
                    >
                      <Download className="size-3.5" />
                      <span>Download PDF</span>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── TAB 2: MY NOMINATIONS ─────────────────────────────────────────── */}
      {activeTab === "nominations" && (
        <>
          {isNominationsLoading ? (
            <LoadingState message="Loading your nominations history..." />
          ) : myNominations.length === 0 ? (
            <EmptyState
              icon={Send}
              title="No Nominations Submitted"
              description="Recognize outstanding teamwork and colleague achievements by submitting a nomination."
              actionLabel="Nominate a Colleague"
              onAction={() => {
                resetNominationForm();
                setIsNominateModalOpen(true);
              }}
            />
          ) : (
            <Card className="border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Nomination No</TableHead>
                    <TableHead>Nominee</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Citation</TableHead>
                    <TableHead>Date Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myNominations.map((nom) => (
                    <TableRow key={nom.id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {nom.nominationNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7">
                            <AvatarFallback className="text-[10px] bg-purple-100 text-purple-800">
                              {nom.employee?.firstName?.[0]}
                              {nom.employee?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold block truncate">
                              {nom.employee?.firstName} {nom.employee?.lastName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {nom.employee?.employeeCode} • {nom.employee?.department?.name || "General"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {renderAwardIcon(nom.awardType?.icon, "size-3.5 text-amber-600")}
                          <span className="text-xs font-medium">{nom.awardType?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                        {nom.reason}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {nom.submittedAt ? format(new Date(nom.submittedAt), "dd MMM yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        {renderNominationStatusBadge(nom.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setViewNomination(nom)}
                        >
                          <Eye className="size-3 mr-1" /> View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}

      {/* ─── MODAL: Nominate Colleague (ESS) ─────────────────────────────────── */}
      <Dialog open={isNominateModalOpen} onOpenChange={setIsNominateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Send className="size-4 text-purple-600" />
              <span>Nominate a Colleague</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Recognize a teammate's peer contribution or milestone achievement.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!nominateNomineeId || !nominateAwardTypeId || !nominateReason.trim()) {
                toast.error("Please fill in all required fields.");
                return;
              }
              submitNominationMutation.mutate({
                employeeId: nominateNomineeId,
                awardTypeId: nominateAwardTypeId,
                reason: nominateReason.trim(),
                achievementDescription: nominateAchievement.trim() || undefined,
                supportingDocUrl: nominateEvidenceUrl.trim() || undefined,
              });
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Colleague *</Label>
              <Select value={nominateNomineeId} onValueChange={setNominateNomineeId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose a colleague to recognize..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {colleagues.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id} className="text-xs">
                      {emp.firstName} {emp.lastName} ({emp.employeeCode || "EMP"}) — {emp.department?.name || "General"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Recognition Category *</Label>
              <Select value={nominateAwardTypeId} onValueChange={setNominateAwardTypeId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select award category..." />
                </SelectTrigger>
                <SelectContent>
                  {awardCategories.map((type) => (
                    <SelectItem key={type.id} value={type.id} className="text-xs">
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Citation & Reason for Recognition *</Label>
              <Textarea
                rows={3}
                placeholder="Highlight their dedication, support, innovation, or accomplishment..."
                value={nominateReason}
                onChange={(e) => setNominateReason(e.target.value)}
                className="text-xs resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Achievements & Deliverables (Optional)</Label>
              <Textarea
                rows={2}
                placeholder="Specific projects, client impact, or accomplishments..."
                value={nominateAchievement}
                onChange={(e) => setNominateAchievement(e.target.value)}
                className="text-xs resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Supporting Link / Evidence (Optional)</Label>
              <Input
                placeholder="https://... or shared project link"
                value={nominateEvidenceUrl}
                onChange={(e) => setNominateEvidenceUrl(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNominateModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitNominationMutation.isPending}
                className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white"
              >
                {submitNominationMutation.isPending ? "Submitting..." : "Submit Nomination"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: View Nomination Details (ESS) ────────────────────────────── */}
      <Dialog open={Boolean(viewNomination)} onOpenChange={(open) => !open && setViewNomination(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Nomination Status & Details</DialogTitle>
            <DialogDescription className="text-xs font-mono">
              #{viewNomination?.nominationNumber}
            </DialogDescription>
          </DialogHeader>

          {viewNomination && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="p-3 bg-muted/40 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Nominee</span>
                  <span className="font-semibold text-sm">
                    {viewNomination.employee?.firstName} {viewNomination.employee?.lastName}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    {viewNomination.employee?.employeeCode}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block text-[11px]">Status</span>
                  {renderNominationStatusBadge(viewNomination.status)}
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Category:</span>
                <p className="font-medium">{viewNomination.awardType?.name}</p>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Citation & Reason:</span>
                <p className="p-2.5 bg-background border rounded-md leading-relaxed">
                  {viewNomination.reason}
                </p>
              </div>

              {viewNomination.achievementDescription && (
                <div className="space-y-1">
                  <span className="font-semibold text-muted-foreground block">Achievements:</span>
                  <p className="p-2.5 bg-background border rounded-md leading-relaxed">
                    {viewNomination.achievementDescription}
                  </p>
                </div>
              )}

              {viewNomination.supportingDocUrl && (
                <div className="space-y-1">
                  <span className="font-semibold text-muted-foreground block">Supporting Link:</span>
                  <a
                    href={viewNomination.supportingDocUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary flex items-center gap-1 hover:underline truncate"
                  >
                    <ExternalLink className="size-3" />
                    <span>{viewNomination.supportingDocUrl}</span>
                  </a>
                </div>
              )}

              <div className="pt-2 text-[11px] text-muted-foreground border-t">
                Submitted on {format(new Date(viewNomination.submittedAt), "dd MMMM yyyy, hh:mm a")}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewNomination(null)}
              className="h-8 text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Digital Certificate View ─────────────────────────────────── */}
      <Dialog
        open={Boolean(certificateViewAward)}
        onOpenChange={(open) => !open && setCertificateViewAward(null)}
      >
        <DialogContent className="max-w-2xl">
          {certificateViewAward && (
            <div className="space-y-4">
              <div className="border-4 border-double border-amber-600/60 bg-amber-500/5 p-8 text-center space-y-4 rounded-lg relative">
                <span className="text-[10px] uppercase tracking-widest text-amber-700 font-semibold">
                  MASTERHRMS RECOGNITION REGISTRY
                </span>
                <h3 className="text-2xl font-bold tracking-tight text-foreground font-serif">
                  CERTIFICATE OF RECOGNITION
                </h3>
                <div className="size-12 rounded-full bg-amber-500/10 border border-amber-600/40 text-amber-700 flex items-center justify-center mx-auto text-xl">
                  ★
                </div>
                <p className="text-xs italic text-muted-foreground">Proudly bestowed upon</p>
                <h2 className="text-xl font-bold text-amber-700 border-b border-amber-600/30 inline-block pb-1">
                  {certificateViewAward.employee?.firstName || (profile as any)?.firstName || (profile as any)?.name}{" "}
                  {certificateViewAward.employee?.lastName || (profile as any)?.lastName}
                </h2>
                <p className="text-xs max-w-md mx-auto leading-relaxed text-muted-foreground">
                  In recognition of distinguished dedication and exemplary achievements as{" "}
                  <strong className="text-foreground">
                    {certificateViewAward.awardType?.name || certificateViewAward.giftItem}
                  </strong>
                  .
                </p>
                {certificateViewAward.description && (
                  <p className="text-xs italic text-muted-foreground max-w-sm mx-auto">
                    "{certificateViewAward.description}"
                  </p>
                )}
                <div className="pt-4 flex justify-between items-end text-[11px] text-muted-foreground border-t border-border/40">
                  <div className="text-left">
                    <span className="font-semibold block text-foreground">
                      {certificateViewAward.presentedBy || "Corporate Management"}
                    </span>
                    Authorized Issuer
                  </div>
                  <div className="text-right">
                    <span className="font-semibold block text-foreground">
                      {certificateViewAward.awardDate
                        ? format(new Date(certificateViewAward.awardDate), "MMMM dd, yyyy")
                        : "—"}
                    </span>
                    Date Bestowed
                  </div>
                </div>
                <span className="absolute bottom-2 right-4 text-[9px] font-mono text-muted-foreground">
                  {certificateViewAward.certificateNo || "AWD-VERIFIED"}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
                <Link
                  href={`/verify-certificate?code=${encodeURIComponent(
                    certificateViewAward.certificates?.[0]?.verificationCode ||
                      certificateViewAward.certificateNo ||
                      ""
                  )}`}
                  target="_blank"
                >
                  <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-primary">
                    <ExternalLink className="size-3.5" />
                    <span>Verify Authenticity</span>
                  </Button>
                </Link>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => handlePrintCertificate(certificateViewAward)}
                  >
                    <Printer className="size-3.5" />
                    <span>Print HTML</span>
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleDownloadCertificatePdf(certificateViewAward)}
                  >
                    <Download className="size-3.5" />
                    <span>Download Vector PDF</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
