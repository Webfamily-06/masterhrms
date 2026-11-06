'use client';

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
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
  Plus,
  Search,
  Filter,
  Eye,
  Trash2,
  Calendar,
  Sparkles,
  Download,
  Printer,
  ChevronRight,
  ShieldCheck,
  Zap,
  Heart,
  Users,
  LayoutGrid,
  List,
  CheckCircle2,
  Crown,
  Settings,
  AlertTriangle,
  Edit2,
  ExternalLink,
  Send,
  Check,
  X,
  Clock,
  MessageSquare,
  FileCheck,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Canonical composites & system states
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { LoadingState } from "@/components/system-states/loading-state";
import { EmptyState } from "@/components/system-states/empty-state";

function renderAwardIcon(iconName?: string | null, className = "h-4 w-4") {
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

function renderSourceBadge(source: string) {
  switch (source) {
    case "MANAGER":
      return <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200">Manager</Badge>;
    case "PEER":
      return <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-200">Peer</Badge>;
    case "SELF":
      return <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200">Self</Badge>;
    case "HR":
    default:
      return <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">HR Admin</Badge>;
  }
}

export default function HrAwardsManagementPage() {
  const qc = useQueryClient();
  const queryClient = qc;
  const router = useRouter();
  const { data: profile, isLoading: isProfileLoading } = useCurrentProfile();
  const userRoles = profile?.roles || [];
  const permissions = profile?.permissions || [];

  const isHRAuthorized =
    permissions.includes("*") ||
    permissions.includes("hrm.awards.manage") ||
    permissions.includes("hrm.awards.view") ||
    permissions.includes("hrm.employees.view") ||
    userRoles.some((r) =>
      ["admin", "super_admin", "tenant_admin", "hr_admin", "hr_manager", "manager", "Workspace Admin"].includes(r)
    );

  // Main Section Navigation: 'honors' (issued) vs 'nominations' (workflow queue)
  const [mainSection, setMainSection] = useState<"honors" | "nominations">("honors");

  // Honors Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"grid" | "table">("grid");

  // Nomination Queue Filters
  const [nominationStatusFilter, setNominationStatusFilter] = useState("ALL");
  const [nominationSourceFilter, setNominationSourceFilter] = useState("ALL");
  const [nominationSearch, setNominationSearch] = useState("");

  // Honors Dialog States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAward, setEditingAward] = useState<any | null>(null);
  const [certificateViewAward, setCertificateViewAward] = useState<any | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<any | null>(null);

  // Certificate Governance States
  const [revokeCertTarget, setRevokeCertTarget] = useState<any | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [reissueCertTarget, setReissueCertTarget] = useState<any | null>(null);
  const [reissueReason, setReissueReason] = useState("");

  // Nomination Dialog States
  const [isNominateModalOpen, setIsNominateModalOpen] = useState(false);
  const [nominateNomineeId, setNominateNomineeId] = useState("");
  const [nominateAwardTypeId, setNominateAwardTypeId] = useState("");
  const [nominateSource, setNominateSource] = useState<"HR" | "MANAGER" | "PEER" | "SELF">("HR");
  const [nominateReason, setNominateReason] = useState("");
  const [nominateAchievement, setNominateAchievement] = useState("");
  const [nominateEvidenceUrl, setNominateEvidenceUrl] = useState("");

  // Nomination Decision Modal
  const [decisionModal, setDecisionModal] = useState<{
    isOpen: boolean;
    action: "approve" | "reject" | "changes";
    nomination: any | null;
  }>({
    isOpen: false,
    action: "approve",
    nomination: null,
  });
  const [decisionComment, setDecisionComment] = useState("");

  // Confer from Nomination Modal
  const [conferModal, setConferModal] = useState<{
    isOpen: boolean;
    nomination: any | null;
  }>({
    isOpen: false,
    nomination: null,
  });
  const [conferGiftItem, setConferGiftItem] = useState("Excellence Trophy & Certificate");
  const [conferGiftAmount, setConferGiftAmount] = useState("0");
  const [conferPresentedBy, setConferPresentedBy] = useState("Executive Committee");

  // Details Modal
  const [viewNomination, setViewNomination] = useState<any | null>(null);

  // Honors Form State
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formAwardTypeId, setFormAwardTypeId] = useState("");
  const [formAwardDate, setFormAwardDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formGiftItem, setFormGiftItem] = useState("Trophy & Recognition Plaque");
  const [formGiftAmount, setFormGiftAmount] = useState("0");
  const [formDescription, setFormDescription] = useState("");
  const [formPresentedBy, setFormPresentedBy] = useState("Executive Committee");

  // Fetch Awards (HR endpoint)
  const { data: awardsData, isLoading: awardsLoading } = useQuery({
    queryKey: ["hr-awards", selectedTypeFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedTypeFilter !== "all") params.append("awardTypeId", selectedTypeFilter);
      if (searchTerm) params.append("search", searchTerm);
      return await api.get(`/api/hr/awards?${params.toString()}`);
    },
    enabled: isHRAuthorized,
  });

  const awards: any[] = useMemo(() => {
    if (Array.isArray(awardsData)) return awardsData;
    return awardsData?.data || [];
  }, [awardsData]);

  const stats = awardsData?.stats || {
    totalAwards: awards.length,
    totalGiftValue: 0,
    distribution: [],
  };

  // Fetch Nominations (HR endpoint)
  const { data: nominationsResponse, isLoading: nominationsLoading } = useQuery({
    queryKey: ["hr-award-nominations", nominationStatusFilter, nominationSourceFilter, nominationSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (nominationStatusFilter !== "ALL") params.append("status", nominationStatusFilter);
      if (nominationSourceFilter !== "ALL") params.append("nominationSource", nominationSourceFilter);
      if (nominationSearch) params.append("search", nominationSearch);
      return await api.get(`/api/awards/nominations?${params.toString()}`);
    },
    enabled: isHRAuthorized,
  });

  const nominations: any[] = nominationsResponse?.data || [];
  const nominationCounts = nominationsResponse?.counts || {
    total: 0,
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    CHANGES_REQUESTED: 0,
    AWARD_ISSUED: 0,
  };

  // Fetch Award Types
  const { data: awardTypes = [] } = useQuery<any[]>({
    queryKey: ["award-types"],
    queryFn: async () => {
      const res = await api.get("/api/hr/organization/award-types?limit=100");
      return Array.isArray(res) ? res : res?.data || [];
    },
    enabled: isHRAuthorized,
  });

  const activeAwardTypes = useMemo(() => {
    return awardTypes.filter((t) => t.status !== "inactive");
  }, [awardTypes]);

  // Fetch Employees for dropdown
  const { data: employeesData } = useQuery({
    queryKey: ["employees-list-light"],
    queryFn: async () => {
      const res = await api.get("/api/employees?limit=200");
      return Array.isArray(res) ? res : res?.data || [];
    },
    enabled: isHRAuthorized,
  });
  const employees: any[] = employeesData || [];

  // Create Direct Award Mutation
  const createAwardMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/api/hr/awards", payload);
    },
    onSuccess: () => {
      toast.success("Award conferred and digital certificate generated!");
      setIsCreateModalOpen(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ["hr-awards"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to issue award.");
    },
  });

  // Edit Award Mutation
  const editAwardMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await api.put(`/api/hr/awards/${id}`, payload);
    },
    onSuccess: () => {
      toast.success("Award details updated successfully.");
      setIsEditModalOpen(false);
      setEditingAward(null);
      resetForm();
      qc.invalidateQueries({ queryKey: ["hr-awards"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to update award.");
    },
  });

  // Delete / Revoke Award Mutation
  const deleteAwardMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/api/hr/awards/${id}`);
    },
    onSuccess: () => {
      toast.success("Award revoked and removed from records.");
      setDeleteConfirmTarget(null);
      qc.invalidateQueries({ queryKey: ["hr-awards"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to revoke award.");
    },
  });

  // Submit Nomination Mutation
  const submitNominationMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/api/awards/nominations", payload);
    },
    onSuccess: () => {
      toast.success("Nomination submitted successfully into approval workflow!");
      setIsNominateModalOpen(false);
      resetNominationForm();
      qc.invalidateQueries({ queryKey: ["hr-award-nominations"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to submit nomination.");
    },
  });

  // Approve Nomination Mutation
  const approveNominationMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      return await api.post(`/api/awards/nominations/${id}/approve`, { comment });
    },
    onSuccess: () => {
      toast.success("Nomination approved successfully!");
      setDecisionModal({ isOpen: false, action: "approve", nomination: null });
      setDecisionComment("");
      qc.invalidateQueries({ queryKey: ["hr-award-nominations"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to approve nomination.");
    },
  });

  // Reject Nomination Mutation
  const rejectNominationMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      return await api.post(`/api/awards/nominations/${id}/reject`, { comment });
    },
    onSuccess: () => {
      toast.success("Nomination rejected.");
      setDecisionModal({ isOpen: false, action: "reject", nomination: null });
      setDecisionComment("");
      qc.invalidateQueries({ queryKey: ["hr-award-nominations"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to reject nomination.");
    },
  });

  // Request Changes Mutation
  const requestChangesMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      return await api.post(`/api/awards/nominations/${id}/request-changes`, { comment });
    },
    onSuccess: () => {
      toast.success("Changes requested from nominator.");
      setDecisionModal({ isOpen: false, action: "changes", nomination: null });
      setDecisionComment("");
      qc.invalidateQueries({ queryKey: ["hr-award-nominations"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to request changes.");
    },
  });

  // Issue Award from Nomination Mutation
  const issueFromNominationMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await api.post(`/api/awards/nominations/${id}/issue`, payload);
    },
    onSuccess: () => {
      toast.success("Official award conferred and certificate generated!");
      setConferModal({ isOpen: false, nomination: null });
      qc.invalidateQueries({ queryKey: ["hr-award-nominations"] });
      qc.invalidateQueries({ queryKey: ["hr-awards"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to issue award from nomination.");
    },
  });

  const resetForm = () => {
    setFormEmployeeId("");
    setFormAwardTypeId("");
    setFormAwardDate(new Date().toISOString().split("T")[0]);
    setFormGiftItem("Trophy & Recognition Plaque");
    setFormGiftAmount("0");
    setFormDescription("");
    setFormPresentedBy("Executive Committee");
  };

  const generateCertMutation = useMutation({
    mutationFn: async (awardId: string) => {
      const res = await api.post(`/api/awards/${awardId}/certificate/generate`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Official certificate generated successfully!");
      queryClient.invalidateQueries({ queryKey: ["hr-awards"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to generate certificate.");
    },
  });

  const revokeCertMutation = useMutation({
    mutationFn: async ({ certId, reason }: { certId: string; reason: string }) => {
      const res = await api.post(`/api/awards/certificates/${certId}/revoke`, { reason });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Certificate revoked successfully.");
      setRevokeCertTarget(null);
      setRevokeReason("");
      queryClient.invalidateQueries({ queryKey: ["hr-awards"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to revoke certificate.");
    },
  });

  const reissueCertMutation = useMutation({
    mutationFn: async ({ awardId, reason }: { awardId: string; reason: string }) => {
      const res = await api.post(`/api/awards/${awardId}/certificate/reissue`, { reason });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Certificate reissued successfully!");
      setReissueCertTarget(null);
      setReissueReason("");
      queryClient.invalidateQueries({ queryKey: ["hr-awards"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to reissue certificate.");
    },
  });

  const handleDownloadCertificatePdf = async (award: any) => {
    try {
      let certId = award.certificates?.[0]?.id;
      let downloadUrl = certId ? `/api/awards/certificates/${certId}/download` : "";

      if (!certId) {
        toast.info("Generating official vector certificate...");
        const genRes = await api.post(`/api/awards/${award.id}/certificate/generate`);
        const generated = genRes.data?.data;
        if (generated?.id) {
          certId = generated.id;
          downloadUrl = `/api/awards/certificates/${certId}/download`;
          queryClient.invalidateQueries({ queryKey: ["hr-awards"] });
        }
      }

      if (!downloadUrl) {
        throw new Error("Certificate URL could not be resolved.");
      }

      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error("Failed to download PDF stream.");
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
      toast.success("Official certificate PDF downloaded.");
    } catch (err: any) {
      toast.error(err.message || "Failed to download certificate PDF.");
    }
  };

  const resetNominationForm = () => {
    setNominateNomineeId("");
    setNominateAwardTypeId("");
    setNominateSource("HR");
    setNominateReason("");
    setNominateAchievement("");
    setNominateEvidenceUrl("");
  };

  const handleOpenEdit = (award: any) => {
    setEditingAward(award);
    setFormEmployeeId(award.employeeId || "");
    setFormAwardTypeId(award.awardTypeId || "");
    setFormAwardDate(
      award.awardDate
        ? new Date(award.awardDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    );
    setFormGiftItem(award.giftItem || "Trophy & Recognition Plaque");
    setFormGiftAmount(award.giftAmount?.toString() || "0");
    setFormDescription(award.description || "");
    setFormPresentedBy(award.presentedBy || "Executive Committee");
    setIsEditModalOpen(true);
  };

  const handlePrintCertificate = (award: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to preview and print certificate.");
      return;
    }

    const awardTitle = award.awardType?.name || award.giftItem || "Honorary Recognition Award";
    const recipientName = `${award.employee?.firstName || ""} ${award.employee?.lastName || ""}`.trim() || "Distinguished Professional";
    const awardDateStr = award.awardDate ? format(new Date(award.awardDate), "MMMM dd, yyyy") : format(new Date(), "MMMM dd, yyyy");
    const certNumber = award.certificateNo || `AWD-${Date.now().toString().slice(-6)}`;
    const presenter = award.presentedBy || "Board of Directors";
    const citation = award.description || "In sincere appreciation of outstanding dedication, exemplary teamwork, and enduring contribution to corporate excellence.";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Certificate of Recognition - ${recipientName}</title>
          <style>
            @page { size: landscape; margin: 0; }
            body {
              font-family: 'Georgia', serif;
              margin: 0;
              padding: 40px;
              background: #fdfbf7;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 90vh;
              color: #1a1a1a;
            }
            .cert-border {
              border: 12px double #b8860b;
              padding: 40px 60px;
              text-align: center;
              background: #ffffff;
              max-width: 900px;
              width: 100%;
              box-shadow: 0 10px 30px rgba(0,0,0,0.08);
              position: relative;
            }
            .header {
              font-size: 14px;
              letter-spacing: 5px;
              text-transform: uppercase;
              color: #b8860b;
              margin-bottom: 10px;
            }
            .title {
              font-size: 38px;
              font-weight: bold;
              color: #111;
              margin-bottom: 5px;
              font-family: 'Cinzel', 'Times New Roman', serif;
            }
            .presented {
              font-size: 16px;
              font-style: italic;
              color: #666;
              margin: 20px 0 10px;
            }
            .recipient {
              font-size: 34px;
              font-weight: bold;
              color: #b8860b;
              border-bottom: 2px solid #b8860b;
              display: inline-block;
              padding-bottom: 5px;
              margin-bottom: 20px;
              font-family: 'Great Vibes', 'Brush Script MT', cursive;
            }
            .reason {
              font-size: 15px;
              line-height: 1.8;
              color: #444;
              margin: 15px auto;
              max-width: 650px;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              margin-top: 50px;
              padding: 0 40px;
            }
            .sig-block {
              text-align: center;
              border-top: 1px solid #777;
              padding-top: 8px;
              width: 200px;
              font-size: 13px;
              color: #555;
            }
            .badge-cert {
              margin: 20px auto;
              width: 70px;
              height: 70px;
              border-radius: 50%;
              background: #fdf6e2;
              border: 2px solid #b8860b;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 28px;
              color: #b8860b;
            }
            .cert-no {
              position: absolute;
              bottom: 15px;
              right: 25px;
              font-size: 11px;
              color: #999;
              letter-spacing: 1px;
            }
          </style>
        </head>
        <body>
          <div class="cert-border">
            <div class="header">MASTERHRMS RECOGNITION REGISTRY</div>
            <div class="title">CERTIFICATE OF RECOGNITION</div>
            <div class="badge-cert">★</div>
            <div class="presented">This certificate is proudly bestowed upon</div>
            <div class="recipient">${recipientName}</div>
            <div class="reason">
              For distinguished accomplishment and meritorious performance in receiving the corporate honor of<br>
              <strong style="color: #111; font-size: 18px;">${awardTitle}</strong>
              <br><br>
              <em>"${citation}"</em>
            </div>
            <div class="footer">
              <div class="sig-block">
                <strong>${presenter}</strong><br>Authorized Signatory
              </div>
              <div class="sig-block">
                <strong>${awardDateStr}</strong><br>Date Bestowed
              </div>
            </div>
            <div class="cert-no">NO: ${certNumber}</div>
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

  const filteredAwards = useMemo(() => {
    return awards.filter((a) => {
      const matchSearch =
        !searchTerm ||
        `${a.employee?.firstName} ${a.employee?.lastName}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        a.giftItem?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.certificateNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType =
        selectedTypeFilter === "all" ||
        a.awardTypeId === selectedTypeFilter;
      return matchSearch && matchType;
    });
  }, [awards, searchTerm, selectedTypeFilter]);

  if (isProfileLoading) {
    return <LoadingState message="Verifying HR Administrator credentials..." />;
  }

  if (!isHRAuthorized) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
        <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertTriangle className="size-6" />
        </div>
        <h2 className="text-lg font-bold">HR Administrator Access Required</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The Awards & Recognition management module is reserved for authorized HR Administrators and Managers. Please visit your personal awards page.
        </p>
        <div className="pt-2">
          <Button asChild size="sm" className="h-8 text-xs gap-1.5">
            <Link href="/me/awards">View My Awards</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* ─── PageHeader with Breadcrumbs and Actions ───────────────────────── */}
      <PageHeader
        title="Awards & Recognition Management"
        description="Tenant-wide employee recognition engine: manage nominations, run configurable approval workflows, and confer official awards with digital certificates."
        breadcrumbs={[
          { label: "Dashboard", href: "/hr/dashboard" },
          { label: "Lifecycle", href: "/hr/lifecycle" },
          { label: "Awards & Recognition" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 text-xs gap-1.5"
            >
              <Link href="/hr/organization/award-types">
                <Settings className="size-3.5" />
                <span>Configure Award Types</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetNominationForm();
                setIsNominateModalOpen(true);
              }}
              className="h-9 text-xs gap-1.5 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
            >
              <Send className="size-3.5" />
              <span>Nominate Employee</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
              className="h-9 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
            >
              <Trophy className="size-3.5" />
              <span>Direct Award</span>
            </Button>
          </div>
        }
      />

      {/* ─── Section Switcher: Official Honors vs Nomination Queue ──────────── */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <Button
            variant={mainSection === "honors" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMainSection("honors")}
            className={cn(
              "h-8 text-xs gap-2",
              mainSection === "honors" ? "bg-amber-600 text-white hover:bg-amber-700" : "text-muted-foreground"
            )}
          >
            <Trophy className="size-3.5" />
            <span>Official Honors & Awards</span>
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
              {awards.length}
            </Badge>
          </Button>

          <Button
            variant={mainSection === "nominations" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMainSection("nominations")}
            className={cn(
              "h-8 text-xs gap-2",
              mainSection === "nominations" ? "bg-purple-600 text-white hover:bg-purple-700" : "text-muted-foreground"
            )}
          >
            <Send className="size-3.5" />
            <span>Nominations & Approval Queue</span>
            {nominationCounts.PENDING > 0 && (
              <Badge className="ml-1 px-1.5 py-0 text-[10px] bg-amber-500 text-white">
                {nominationCounts.PENDING} pending
              </Badge>
            )}
          </Button>
        </div>

        {mainSection === "honors" && (
          <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/40">
            <Button
              variant={activeTab === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setActiveTab("grid")}
              title="Grid View"
            >
              <LayoutGrid className="size-3.5" />
            </Button>
            <Button
              variant={activeTab === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setActiveTab("table")}
              title="Table View"
            >
              <List className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* SECTION 1: OFFICIAL HONORS (ISSUED AWARDS)                            */}
      {/* ===================================================================== */}
      {mainSection === "honors" && (
        <div className="space-y-6">
          {/* Metric Summary Cards */}
          <StatsOverviewGrid columns={4}>
            <StatCard
              label="Total Honors Bestowed"
              value={stats.totalAwards || awards.length}
              variant="warning"
              icon={<Trophy className="size-5" />}
              description="Tenant-wide recognized achievements"
            />
            <StatCard
              label="Honored Employees"
              value={new Set(awards.map((a) => a.employeeId).filter(Boolean)).size}
              variant="info"
              icon={<Users className="size-5" />}
              description="Distinct individuals awarded"
            />
            <StatCard
              label="Total Rewards Value"
              value={`₹${(stats.totalGiftValue || 0).toLocaleString()}`}
              variant="success"
              icon={<Gift className="size-5" />}
              description="Monetary recognition disbursed"
            />
            <StatCard
              label="Active Categories"
              value={activeAwardTypes.length}
              variant="primary"
              icon={<Award className="size-5" />}
              description="Configured recognition programs"
            />
          </StatsOverviewGrid>

          {/* Filter Toolbar */}
          <FilterToolbar
            searchPlaceholder="Search by employee, award title, or certificate no..."
            searchQuery={searchTerm}
            onSearchChange={setSearchTerm}
            filters={
              <div className="flex flex-wrap items-center gap-2">
                <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
                  <SelectTrigger className="w-[180px] h-9 text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {awardTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            }
          />

          {/* Awards Content */}
          {awardsLoading ? (
            <LoadingState message="Loading awards registry..." />
          ) : filteredAwards.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No Employee Awards Found"
              description="Recognitions conferred directly or approved through nomination workflows will appear here."
              actionLabel="Confer First Award"
              onAction={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
            />
          ) : activeTab === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAwards.map((award) => (
                <Card
                  key={award.id}
                  className="overflow-hidden border-border/60 hover:shadow-md transition-shadow group flex flex-col justify-between"
                >
                  <CardHeader className="p-4 pb-2 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="size-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                          {award.awardType?.imageUrl ? (
                            <img
                              src={award.awardType.imageUrl}
                              alt={award.awardType.name}
                              className="size-full object-cover"
                            />
                          ) : (
                            renderAwardIcon(award.awardType?.icon, "size-5 text-amber-600")
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold leading-tight line-clamp-1">
                            {award.awardType?.name || award.giftItem || "Honorary Award"}
                          </CardTitle>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {award.certificateNo || "AWD-NO-CERT"}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 border-amber-200">
                        Conferred
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 space-y-3">
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 border border-border/40">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs bg-amber-100 text-amber-800">
                          {award.employee?.firstName?.[0]}
                          {award.employee?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <Link
                          href={`/hr/employees/${award.employeeId}`}
                          className="text-xs font-semibold hover:underline block truncate"
                        >
                          {award.employee?.firstName} {award.employee?.lastName}
                        </Link>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {award.employee?.employeeCode} • {award.employee?.department?.name || "General"}
                        </p>
                      </div>
                    </div>

                    {award.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 italic">
                        "{award.description}"
                      </p>
                    )}

                    <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {award.awardDate ? format(new Date(award.awardDate), "dd MMM yyyy") : "—"}
                      </span>
                      {Number(award.giftAmount) > 0 && (
                        <span className="font-semibold text-emerald-600">
                          ₹{Number(award.giftAmount).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </CardContent>

                  <div className="p-3 bg-muted/20 border-t border-border/40 flex items-center justify-between gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1.5 flex-1"
                      onClick={() => setCertificateViewAward(award)}
                    >
                      <Eye className="size-3.5" />
                      <span>Preview</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      onClick={() => handleDownloadCertificatePdf(award)}
                      title="Download Official PDF Certificate"
                    >
                      <Download className="size-3.5" />
                      <span>PDF</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => handleOpenEdit(award)}
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteConfirmTarget(award)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Recipient</TableHead>
                    <TableHead>Award Category</TableHead>
                    <TableHead>Citation & Reason</TableHead>
                    <TableHead>Certificate No</TableHead>
                    <TableHead>Date Conferred</TableHead>
                    <TableHead>Reward Value</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAwards.map((award) => (
                    <TableRow key={award.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7">
                            <AvatarFallback className="text-[10px] bg-amber-100 text-amber-800">
                              {award.employee?.firstName?.[0]}
                              {award.employee?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <Link
                              href={`/hr/employees/${award.employeeId}`}
                              className="text-xs font-semibold hover:underline block truncate"
                            >
                              {award.employee?.firstName} {award.employee?.lastName}
                            </Link>
                            <span className="text-[10px] text-muted-foreground">
                              {award.employee?.employeeCode}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded bg-amber-500/10 flex items-center justify-center shrink-0">
                            {renderAwardIcon(award.awardType?.icon, "size-3.5 text-amber-600")}
                          </div>
                          <span className="text-xs font-medium">
                            {award.awardType?.name || award.giftItem}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                        {award.description || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {award.certificates?.[0]?.status === "ACTIVE" ? (
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-mono">
                              {award.certificates[0].certificateNumber}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-6 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                              title="Download Official Vector PDF"
                              onClick={() => handleDownloadCertificatePdf(award)}
                            >
                              <Download className="size-3" />
                            </Button>
                          </div>
                        ) : award.certificates?.[0]?.status === "REVOKED" ? (
                          <div className="flex items-center gap-1.5">
                            <Badge variant="destructive" className="text-[10px]">
                              Revoked
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] px-1.5 gap-1 text-primary hover:bg-primary/10"
                              title="Reissue with new certificate"
                              onClick={() => setReissueCertTarget(award)}
                            >
                              <RotateCcw className="size-2.5" /> Reissue
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] px-2 gap-1 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50"
                            onClick={() => generateCertMutation.mutate(award.id)}
                            disabled={generateCertMutation.isPending}
                          >
                            <Sparkles className="size-2.5" /> Generate
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {award.awardDate ? format(new Date(award.awardDate), "dd MMM yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {Number(award.giftAmount) > 0 ? `₹${Number(award.giftAmount).toLocaleString()}` : "Honorary"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => setCertificateViewAward(award)}
                          >
                            <Eye className="size-3" />
                            <span>Certificate</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleOpenEdit(award)}
                          >
                            <Edit2 className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteConfirmTarget(award)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 2: NOMINATIONS & APPROVAL QUEUE                               */}
      {/* ===================================================================== */}
      {mainSection === "nominations" && (
        <div className="space-y-6">
          {/* Nominations Stats */}
          <StatsOverviewGrid columns={4}>
            <StatCard
              label="Total Nominations"
              value={nominationCounts.total}
              variant="primary"
              icon={<Send className="size-5" />}
              description="All nominations recorded"
            />
            <StatCard
              label="Pending Review"
              value={nominationCounts.PENDING}
              variant="warning"
              icon={<Clock className="size-5" />}
              description="Awaiting approver action"
            />
            <StatCard
              label="Approved (Ready to Issue)"
              value={nominationCounts.APPROVED}
              variant="success"
              icon={<CheckCircle2 className="size-5" />}
              description="Fully sanctioned by workflow"
            />
            <StatCard
              label="Awards Conferred"
              value={nominationCounts.AWARD_ISSUED}
              variant="info"
              icon={<Trophy className="size-5" />}
              description="Successfully converted to honors"
            />
          </StatsOverviewGrid>

          {/* Filter Toolbar */}
          <FilterToolbar
            searchPlaceholder="Search nominations by nominee, citation, nomination #..."
            searchQuery={nominationSearch}
            onSearchChange={setNominationSearch}
            filters={
              <div className="flex flex-wrap items-center gap-2">
                <Select value={nominationStatusFilter} onValueChange={setNominationStatusFilter}>
                  <SelectTrigger className="w-[180px] h-9 text-xs">
                    <SelectValue placeholder="Workflow Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending Review</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="CHANGES_REQUESTED">Changes Requested</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="AWARD_ISSUED">Award Issued</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={nominationSourceFilter} onValueChange={setNominationSourceFilter}>
                  <SelectTrigger className="w-[160px] h-9 text-xs">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Sources</SelectItem>
                    <SelectItem value="HR">HR Admin</SelectItem>
                    <SelectItem value="MANAGER">Reporting Manager</SelectItem>
                    <SelectItem value="PEER">Peer-to-Peer</SelectItem>
                    <SelectItem value="SELF">Self Nomination</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          />

          {/* Nominations Table */}
          {nominationsLoading ? (
            <LoadingState message="Loading nominations queue..." />
          ) : nominations.length === 0 ? (
            <EmptyState
              icon={Send}
              title="No Nominations in Queue"
              description="Nominate an outstanding team member or review peer submissions as they arrive."
              actionLabel="Submit First Nomination"
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
                    <TableHead>Award Category</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Reason & Justification</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nominations.map((nom) => (
                    <TableRow key={nom.id}>
                      <TableCell className="font-mono text-xs">
                        <div>
                          <span className="font-semibold">{nom.nominationNumber}</span>
                          <p className="text-[10px] text-muted-foreground">
                            {nom.submittedAt ? format(new Date(nom.submittedAt), "dd MMM yyyy") : "—"}
                          </p>
                        </div>
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
                            <Link
                              href={`/hr/employees/${nom.employeeId}`}
                              className="text-xs font-semibold hover:underline block truncate"
                            >
                              {nom.employee?.firstName} {nom.employee?.lastName}
                            </Link>
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
                      <TableCell>
                        {renderSourceBadge(nom.nominationSource)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                        {nom.reason}
                      </TableCell>
                      <TableCell>
                        {renderNominationStatusBadge(nom.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setViewNomination(nom)}
                          >
                            <Eye className="size-3 mr-1" /> View
                          </Button>

                          {nom.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                onClick={() =>
                                  setDecisionModal({ isOpen: true, action: "approve", nomination: nom })
                                }
                              >
                                <Check className="size-3 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                                onClick={() =>
                                  setDecisionModal({ isOpen: true, action: "reject", nomination: nom })
                                }
                              >
                                <X className="size-3 mr-1" /> Reject
                              </Button>
                            </>
                          )}

                          {nom.status === "APPROVED" && (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1"
                              onClick={() => {
                                setConferGiftItem(`${nom.awardType?.name || "Excellence Award"}`);
                                setConferGiftAmount("0");
                                setConferPresentedBy("Executive Management");
                                setConferModal({ isOpen: true, nomination: nom });
                              }}
                            >
                              <Trophy className="size-3" />
                              <span>Issue Award</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      )}

      {/* ─── MODAL: Nominate Employee ────────────────────────────────────────── */}
      <Dialog open={isNominateModalOpen} onOpenChange={setIsNominateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Submit Award Nomination</DialogTitle>
            <DialogDescription className="text-xs">
              Nominate an employee for official recognition through the corporate approval workflow.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!nominateNomineeId || !nominateAwardTypeId || !nominateReason.trim()) {
                toast.error("Please complete all required fields.");
                return;
              }
              submitNominationMutation.mutate({
                employeeId: nominateNomineeId,
                awardTypeId: nominateAwardTypeId,
                nominationSource: nominateSource,
                reason: nominateReason.trim(),
                achievementDescription: nominateAchievement.trim() || undefined,
                supportingDocUrl: nominateEvidenceUrl.trim() || undefined,
              });
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nominee Employee *</Label>
              <Select value={nominateNomineeId} onValueChange={setNominateNomineeId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select employee to nominate..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id} className="text-xs">
                      {emp.firstName} {emp.lastName} ({emp.employeeCode || "EMP"}) — {emp.department?.name || "General"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Award Category *</Label>
              <Select value={nominateAwardTypeId} onValueChange={setNominateAwardTypeId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose award category..." />
                </SelectTrigger>
                <SelectContent>
                  {activeAwardTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id} className="text-xs">
                      {type.name} {type.requiresApproval ? "— Requires Approval" : "— Direct Approval"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nomination Channel / Source</Label>
              <Select
                value={nominateSource}
                onValueChange={(val: any) => setNominateSource(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HR" className="text-xs">HR Administration Nomination</SelectItem>
                  <SelectItem value="MANAGER" className="text-xs">Reporting Manager Endorsement</SelectItem>
                  <SelectItem value="PEER" className="text-xs">Peer-to-Peer Recognition</SelectItem>
                  <SelectItem value="SELF" className="text-xs">Self-Nomination</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Citation & Reason for Recognition *</Label>
              <Textarea
                rows={3}
                placeholder="Describe why this employee deserves this distinction..."
                value={nominateReason}
                onChange={(e) => setNominateReason(e.target.value)}
                className="text-xs resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Detailed Achievements & Impact (Optional)</Label>
              <Textarea
                rows={2}
                placeholder="Include specific deliverables, measurable results, or project milestones..."
                value={nominateAchievement}
                onChange={(e) => setNominateAchievement(e.target.value)}
                className="text-xs resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Supporting Evidence URL / Document (Optional)</Label>
              <Input
                placeholder="https://... or shared document reference"
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

      {/* ─── MODAL: Approval / Rejection Decision ────────────────────────────── */}
      <Dialog
        open={decisionModal.isOpen}
        onOpenChange={(open) => {
          if (!open) setDecisionModal({ isOpen: false, action: "approve", nomination: null });
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {decisionModal.action === "approve"
                ? "Approve Award Nomination"
                : decisionModal.action === "reject"
                ? "Reject Award Nomination"
                : "Request Changes"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Nomination #{decisionModal.nomination?.nominationNumber} for{" "}
              <strong>
                {decisionModal.nomination?.employee?.firstName}{" "}
                {decisionModal.nomination?.employee?.lastName}
              </strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
              <p>
                <strong>Category:</strong> {decisionModal.nomination?.awardType?.name}
              </p>
              <p>
                <strong>Reason:</strong> {decisionModal.nomination?.reason}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Decision Comments & Feedback {decisionModal.action === "reject" && "*"}
              </Label>
              <Textarea
                rows={3}
                placeholder={
                  decisionModal.action === "approve"
                    ? "Optional endorsement notes..."
                    : "Specify feedback or reason for this decision..."
                }
                value={decisionComment}
                onChange={(e) => setDecisionComment(e.target.value)}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDecisionModal({ isOpen: false, action: "approve", nomination: null })}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className={cn(
                "h-8 text-xs text-white",
                decisionModal.action === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : decisionModal.action === "reject"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-amber-600 hover:bg-amber-700"
              )}
              disabled={
                approveNominationMutation.isPending ||
                rejectNominationMutation.isPending ||
                requestChangesMutation.isPending
              }
              onClick={() => {
                if (decisionModal.action === "reject" && !decisionComment.trim()) {
                  toast.error("Please provide a reason for rejection.");
                  return;
                }
                if (decisionModal.action === "approve") {
                  approveNominationMutation.mutate({
                    id: decisionModal.nomination.id,
                    comment: decisionComment.trim() || undefined,
                  });
                } else if (decisionModal.action === "reject") {
                  rejectNominationMutation.mutate({
                    id: decisionModal.nomination.id,
                    comment: decisionComment.trim(),
                  });
                } else {
                  requestChangesMutation.mutate({
                    id: decisionModal.nomination.id,
                    comment: decisionComment.trim() || undefined,
                  });
                }
              }}
            >
              Confirm{" "}
              {decisionModal.action === "approve"
                ? "Approval"
                : decisionModal.action === "reject"
                ? "Rejection"
                : "Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Confer Official Award from Nomination ────────────────────── */}
      <Dialog
        open={conferModal.isOpen}
        onOpenChange={(open) => {
          if (!open) setConferModal({ isOpen: false, nomination: null });
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Trophy className="size-4 text-amber-600" />
              <span>Confer Official Award</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Convert approved nomination #{conferModal.nomination?.nominationNumber} into an official company honor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs space-y-1">
              <p>
                <strong>Recipient:</strong> {conferModal.nomination?.employee?.firstName}{" "}
                {conferModal.nomination?.employee?.lastName} ({conferModal.nomination?.employee?.employeeCode})
              </p>
              <p>
                <strong>Category:</strong> {conferModal.nomination?.awardType?.name}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Trophy / Plaque Description *</Label>
              <Input
                value={conferGiftItem}
                onChange={(e) => setConferGiftItem(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Monetary Reward Value (₹)</Label>
              <Input
                type="number"
                min="0"
                value={conferGiftAmount}
                onChange={(e) => setConferGiftAmount(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Presented By</Label>
              <Input
                value={conferPresentedBy}
                onChange={(e) => setConferPresentedBy(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConferModal({ isOpen: false, nomination: null })}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={issueFromNominationMutation.isPending}
              className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => {
                issueFromNominationMutation.mutate({
                  id: conferModal.nomination.id,
                  payload: {
                    giftItem: conferGiftItem.trim(),
                    giftAmount: Number(conferGiftAmount) || 0,
                    presentedBy: conferPresentedBy.trim(),
                  },
                });
              }}
            >
              {issueFromNominationMutation.isPending ? "Generating Certificate..." : "Issue & Record Award"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: View Nomination Details ──────────────────────────────────── */}
      <Dialog open={Boolean(viewNomination)} onOpenChange={(open) => !open && setViewNomination(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Nomination Details</DialogTitle>
            <DialogDescription className="text-xs font-mono">
              #{viewNomination?.nominationNumber}
            </DialogDescription>
          </DialogHeader>

          {viewNomination && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Nominee</span>
                  <span className="font-semibold text-sm">
                    {viewNomination.employee?.firstName} {viewNomination.employee?.lastName}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    {viewNomination.employee?.employeeCode} • {viewNomination.employee?.department?.name}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Award Category</span>
                  <span className="font-semibold">{viewNomination.awardType?.name}</span>
                  <p className="text-[11px] text-muted-foreground">
                    Source: {viewNomination.nominationSource}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Citation & Reason:</span>
                <p className="p-2.5 bg-background border rounded-md leading-relaxed">
                  {viewNomination.reason}
                </p>
              </div>

              {viewNomination.achievementDescription && (
                <div className="space-y-1">
                  <span className="font-semibold text-muted-foreground block">Achievements & Milestones:</span>
                  <p className="p-2.5 bg-background border rounded-md leading-relaxed">
                    {viewNomination.achievementDescription}
                  </p>
                </div>
              )}

              {viewNomination.supportingDocUrl && (
                <div className="space-y-1">
                  <span className="font-semibold text-muted-foreground block">Supporting Attachment:</span>
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

              <div className="pt-2 flex items-center justify-between border-t text-[11px] text-muted-foreground">
                <span>Submitted: {format(new Date(viewNomination.submittedAt), "dd MMMM yyyy, hh:mm a")}</span>
                <div>{renderNominationStatusBadge(viewNomination.status)}</div>
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

      {/* ─── MODAL: Direct Confer Award ───────────────────────────────────────── */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Trophy className="size-4 text-amber-600" />
              <span>Confer Direct Employee Award</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confer an official corporate honor directly to an employee.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!formEmployeeId || !formAwardTypeId) {
                toast.error("Please select both an employee and an award category.");
                return;
              }
              createAwardMutation.mutate({
                employeeId: formEmployeeId,
                awardTypeId: formAwardTypeId,
                awardDate: formAwardDate,
                giftItem: formGiftItem,
                giftAmount: Number(formGiftAmount) || 0,
                description: formDescription.trim() || undefined,
                presentedBy: formPresentedBy.trim() || undefined,
              });
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Recipient Employee *</Label>
              <Select value={formEmployeeId} onValueChange={setFormEmployeeId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose employee..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id} className="text-xs">
                      {emp.firstName} {emp.lastName} ({emp.employeeCode || "EMP"}) — {emp.department?.name || "General"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Award Category *</Label>
              <Select value={formAwardTypeId} onValueChange={setFormAwardTypeId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose category..." />
                </SelectTrigger>
                <SelectContent>
                  {activeAwardTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id} className="text-xs">
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Award Date</Label>
                <Input
                  type="date"
                  value={formAwardDate}
                  onChange={(e) => setFormAwardDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Reward Value (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formGiftAmount}
                  onChange={(e) => setFormGiftAmount(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Trophy / Plaque Description</Label>
              <Input
                value={formGiftItem}
                onChange={(e) => setFormGiftItem(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Presented By</Label>
              <Input
                value={formPresentedBy}
                onChange={(e) => setFormPresentedBy(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Citation & Reason</Label>
              <Textarea
                rows={3}
                placeholder="Reason or recognition citation..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createAwardMutation.isPending}
                className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
              >
                {createAwardMutation.isPending ? "Conferring..." : "Confer Award"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Edit Award ─────────────────────────────────────────────────── */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Edit Award Citation</DialogTitle>
            <DialogDescription className="text-xs">
              Update presentation details, monetary reward, or citation for this record.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editingAward?.id) return;
              editAwardMutation.mutate({
                id: editingAward.id,
                payload: {
                  awardTypeId: formAwardTypeId || null,
                  awardDate: formAwardDate,
                  giftItem: formGiftItem,
                  giftAmount: Number(formGiftAmount) || 0,
                  description: formDescription.trim() || null,
                  presentedBy: formPresentedBy.trim() || null,
                },
              });
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Category</Label>
              <Select value={formAwardTypeId} onValueChange={setFormAwardTypeId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {awardTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id} className="text-xs">
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Award Date</Label>
                <Input
                  type="date"
                  value={formAwardDate}
                  onChange={(e) => setFormAwardDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Reward Value (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formGiftAmount}
                  onChange={(e) => setFormGiftAmount(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Trophy / Plaque Description</Label>
              <Input
                value={formGiftItem}
                onChange={(e) => setFormGiftItem(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Presented By</Label>
              <Input
                value={formPresentedBy}
                onChange={(e) => setFormPresentedBy(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Citation & Reason</Label>
              <Textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={editAwardMutation.isPending}
                className="h-8 text-xs bg-primary text-primary-foreground"
              >
                {editAwardMutation.isPending ? "Updating..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Digital Certificate Preview ────────────────────────────────── */}
      <Dialog
        open={Boolean(certificateViewAward)}
        onOpenChange={(open) => !open && setCertificateViewAward(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Trophy className="size-4 text-amber-600" />
              <span>Official Digital Certificate</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Preview and export verified corporate recognition certificate.
            </DialogDescription>
          </DialogHeader>

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
                <p className="text-xs italic text-muted-foreground">This honor is proudly bestowed upon</p>
                <h2 className="text-xl font-bold text-amber-700 border-b border-amber-600/30 inline-block pb-1">
                  {certificateViewAward.employee?.firstName} {certificateViewAward.employee?.lastName}
                </h2>
                <p className="text-xs max-w-md mx-auto leading-relaxed text-muted-foreground">
                  In recognition of extraordinary performance, dedication, and exemplary achievements as{" "}
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
                      {certificateViewAward.presentedBy || "Management"}
                    </span>
                    Authorized Issuer
                  </div>
                  <div className="text-right">
                    <span className="font-semibold block text-foreground">
                      {certificateViewAward.awardDate
                        ? format(new Date(certificateViewAward.awardDate), "MMMM dd, yyyy")
                        : "—"}
                    </span>
                    Date Conferred
                  </div>
                </div>
                <span className="absolute bottom-2 right-4 text-[9px] font-mono text-muted-foreground">
                  {certificateViewAward.certificateNo}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
                <div className="flex items-center gap-2">
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

                  {certificateViewAward.certificates?.[0]?.status === "ACTIVE" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5 text-amber-600 hover:bg-amber-50"
                        onClick={() => {
                          setReissueCertTarget(certificateViewAward);
                        }}
                      >
                        <RotateCcw className="size-3.5" />
                        <span>Reissue</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setRevokeCertTarget(certificateViewAward);
                        }}
                      >
                        <ShieldAlert className="size-3.5" />
                        <span>Revoke</span>
                      </Button>
                    </>
                  )}
                </div>

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

      {/* ─── MODAL: Revoke Certificate ────────────────────────────────────────── */}
      <Dialog open={Boolean(revokeCertTarget)} onOpenChange={(open) => !open && setRevokeCertTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" />
              <span>Revoke Award Certificate</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Revoking this certificate immediately invalidates its cryptographic verification code in the public registry. A formal audit reason is strictly mandatory.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs font-medium">Revocation Reason *</Label>
            <Textarea
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Specify the authoritative grounds for revoking this certificate..."
              className="text-xs min-h-[80px]"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setRevokeCertTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={revokeReason.trim().length < 3 || revokeCertMutation.isPending}
              onClick={() => {
                const certId =
                  revokeCertTarget.certificates?.[0]?.id || revokeCertTarget.id;
                revokeCertMutation.mutate({ certId, reason: revokeReason });
              }}
            >
              {revokeCertMutation.isPending ? "Revoking..." : "Confirm Revocation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Reissue Certificate ───────────────────────────────────────── */}
      <Dialog open={Boolean(reissueCertTarget)} onOpenChange={(open) => !open && setReissueCertTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2 text-primary">
              <RotateCcw className="size-5" />
              <span>Reissue Award Certificate</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Supersedes prior certificates, marks old ones as revoked, and generates a fresh verified vector PDF with a new verification code.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs font-medium">Reissue Reason *</Label>
            <Textarea
              value={reissueReason}
              onChange={(e) => setReissueReason(e.target.value)}
              placeholder="Reason for reissuing (e.g. Correction of recipient title, updated corporate signature)..."
              className="text-xs min-h-[80px]"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setReissueCertTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={reissueReason.trim().length < 3 || reissueCertMutation.isPending}
              onClick={() => {
                reissueCertMutation.mutate({
                  awardId: reissueCertTarget.id,
                  reason: reissueReason,
                });
              }}
            >
              {reissueCertMutation.isPending ? "Reissuing..." : "Reissue Certificate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: Revoke Award Confirmation ─────────────────────────────────── */}
      <ConfirmationDialog
        open={Boolean(deleteConfirmTarget)}
        onOpenChange={(open) => !open && setDeleteConfirmTarget(null)}
        title="Revoke and Delete Award"
        description={`Are you sure you want to revoke the award '${deleteConfirmTarget?.awardType?.name || deleteConfirmTarget?.giftItem}' from ${deleteConfirmTarget?.employee?.firstName} ${deleteConfirmTarget?.employee?.lastName}? This action will permanently remove the record and invalidate Certificate #${deleteConfirmTarget?.certificateNo}.`}
        confirmLabel="Yes, Revoke Award"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (deleteConfirmTarget?.id) {
            deleteAwardMutation.mutate(deleteConfirmTarget.id);
          }
        }}
      />
    </div>
  );
}
