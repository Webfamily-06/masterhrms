"use client";

import React, { useState, useEffect } from "react";
import { API_URL, getAuthHeaders } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Trash2,
  Plus,
  Eye,
  AlertTriangle,
  FileText,
  CheckCircle,
  RefreshCw,
  Search,
} from "lucide-react";

export default function TenantFileSecurityPage() {
  const [activeTab, setActiveTab] = useState<"quarantine" | "dlp">("quarantine");
  const [loading, setLoading] = useState(false);

  // Quarantine State
  const [quarantinedFiles, setQuarantinedFiles] = useState<any[]>([]);
  const [selectedFileForRelease, setSelectedFileForRelease] = useState<any>(null);
  const [releaseReason, setReleaseReason] = useState("");
  const [isReleasing, setIsReleasing] = useState(false);

  // DLP State
  const [policies, setPolicies] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [isCreatePolicyOpen, setIsCreatePolicyOpen] = useState(false);
  const [newPolicyName, setNewPolicyName] = useState("");
  const [newPolicyType, setNewPolicyType] = useState("PII_CREDIT_CARD");
  const [newPolicyPattern, setNewPolicyPattern] = useState("");
  const [newPolicySeverity, setNewPolicySeverity] = useState("HIGH");
  const [newPolicyAction, setNewPolicyAction] = useState("BLOCK");

  // Review Finding State
  const [selectedFinding, setSelectedFinding] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const loadData = () => {
    setLoading(true);
    // 1. Quarantined files
    fetch(`${API_URL}/v1/files/security/quarantine`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setQuarantinedFiles(d.files || []))
      .catch((e) => console.warn(e));

    // 2. DLP Policies
    fetch(`${API_URL}/v1/files/security/dlp/policies`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setPolicies(d.policies || []))
      .catch((e) => console.warn(e));

    // 3. DLP Findings
    fetch(`${API_URL}/v1/files/security/dlp/findings`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setFindings(d.findings || []))
      .catch((e) => console.warn(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Quarantine Release
  const handleRelease = async () => {
    if (!selectedFileForRelease) return;
    setIsReleasing(true);
    try {
      const res = await fetch(
        `${API_URL}/v1/files/security/quarantine/${selectedFileForRelease.id}/release`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ reason: releaseReason.trim() }),
        }
      );
      if (res.ok) {
        setSelectedFileForRelease(null);
        setReleaseReason("");
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsReleasing(false);
    }
  };

  // Handle Purge
  const handlePurge = async (fileId: string) => {
    if (!confirm("Are you sure you want to permanently purge this infected file?")) return;
    try {
      const res = await fetch(`${API_URL}/v1/files/security/quarantine/${fileId}/purge`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Create Policy
  const handleCreatePolicy = async () => {
    if (!newPolicyName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/v1/files/security/dlp/policies`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newPolicyName.trim(),
          policyType: newPolicyType,
          pattern: newPolicyPattern.trim() || undefined,
          severity: newPolicySeverity,
          action: newPolicyAction,
        }),
      });
      if (res.ok) {
        setIsCreatePolicyOpen(false);
        setNewPolicyName("");
        setNewPolicyPattern("");
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Review Finding
  const handleResolveFinding = async (status: "RESOLVED" | "FALSE_POSITIVE") => {
    if (!selectedFinding) return;
    try {
      const res = await fetch(
        `${API_URL}/v1/files/security/dlp/findings/${selectedFinding.id}/review`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ status, reviewNotes: reviewNotes.trim() }),
        }
      );
      if (res.ok) {
        setSelectedFinding(null);
        setReviewNotes("");
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full gap-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            File Security & Compliance Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enterprise Antivirus scanning, quarantine lifecycle control, and automated Data Loss Prevention (DLP).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {activeTab === "dlp" && (
            <Button size="sm" className="gap-1.5" onClick={() => setIsCreatePolicyOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              New DLP Policy
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab("quarantine")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "quarantine"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Lock className="w-4 h-4" />
          Malware Quarantine ({quarantinedFiles.length})
        </button>
        <button
          onClick={() => setActiveTab("dlp")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "dlp"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Data Loss Prevention ({findings.filter((f) => f.status === "OPEN").length} active alerts)
        </button>
      </div>

      {/* TAB 1: QUARANTINE */}
      {activeTab === "quarantine" && (
        <div className="flex flex-col gap-4">
          <div className="border rounded-lg overflow-hidden bg-card">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase border-b">
                <tr>
                  <th className="p-3">File Name</th>
                  <th className="p-3">Threat Identified</th>
                  <th className="p-3">Engine</th>
                  <th className="p-3">Quarantined Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">SecOps Actions</th>
                </tr>
              </thead>
              <tbody>
                {quarantinedFiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                      <ShieldCheck className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      Zero files currently in quarantine. Your file repository is clean.
                    </td>
                  </tr>
                ) : (
                  quarantinedFiles.map((file) => (
                    <tr key={file.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        {file.fileName}
                      </td>
                      <td className="p-3 text-destructive font-mono text-xs">
                        {file.quarantineReason || "Heuristic.Threat.Detected"}
                      </td>
                      <td className="p-3 text-xs font-mono">{file.scanEngine || "Heuristic"}</td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {file.quarantinedAt ? new Date(file.quarantinedAt).toLocaleString() : "-"}
                      </td>
                      <td className="p-3">
                        <Badge variant="destructive" className="text-[11px] uppercase">
                          {file.scanStatus}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => setSelectedFileForRelease(file)}
                          >
                            <Unlock className="w-3 h-3 text-green-600" />
                            Release
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => handlePurge(file.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                            Purge
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DLP (DATA LOSS PREVENTION) */}
      {activeTab === "dlp" && (
        <div className="flex flex-col gap-6">
          {/* DLP Active Policies */}
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold">Active Protection Policies</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {policies.map((p) => (
                <div key={p.id} className="border rounded-lg p-4 bg-card flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={
                        p.severity === "CRITICAL"
                          ? "destructive"
                          : p.severity === "HIGH"
                          ? "default"
                          : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {p.severity}
                    </Badge>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Action: {p.action}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm">{p.name}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* DLP Violations & Findings Log */}
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold">DLP Inspection Findings Log</h3>
            <div className="border rounded-lg overflow-hidden bg-card">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase border-b">
                  <tr>
                    <th className="p-3">File</th>
                    <th className="p-3">Rule Violated</th>
                    <th className="p-3">Redacted Match</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Action Taken</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Review</th>
                  </tr>
                </thead>
                <tbody>
                  {findings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">
                        Zero compliance findings logged.
                      </td>
                    </tr>
                  ) : (
                    findings.map((finding) => (
                      <tr key={finding.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-medium truncate max-w-[180px]">
                          {finding.file?.fileName || finding.fileId}
                        </td>
                        <td className="p-3 text-xs font-semibold">{finding.policy?.name || finding.findingType}</td>
                        <td className="p-3 font-mono text-xs text-amber-600 dark:text-amber-400">
                          {finding.redactedMatch}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">{finding.location || "-"}</td>
                        <td className="p-3 text-xs font-mono">{finding.actionTaken}</td>
                        <td className="p-3">
                          <Badge
                            variant={
                              finding.status === "OPEN"
                                ? "destructive"
                                : finding.status === "RESOLVED"
                                ? "outline"
                                : "secondary"
                            }
                            className="text-[11px]"
                          >
                            {finding.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          {finding.status === "OPEN" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setSelectedFinding(finding)}
                            >
                              Review
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Release Quarantine Dialog */}
      <Dialog
        open={Boolean(selectedFileForRelease)}
        onOpenChange={(open) => !open && setSelectedFileForRelease(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Release File from Quarantine</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              Releasing this file will restore normal view, download, and sharing privileges across the workspace.
            </p>
            <div className="p-3 bg-muted rounded text-xs font-mono">
              File: {selectedFileForRelease?.fileName}
            </div>
            <Input
              placeholder="Audit reason (e.g. False positive verified by SecOps)..."
              value={releaseReason}
              onChange={(e) => setReleaseReason(e.target.value)}
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedFileForRelease(null)}>
              Cancel
            </Button>
            <Button onClick={handleRelease} disabled={isReleasing || !releaseReason.trim()}>
              Confirm Release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create DLP Policy Dialog */}
      <Dialog open={isCreatePolicyOpen} onOpenChange={setIsCreatePolicyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New DLP Policy</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2 text-sm">
            <div>
              <label className="text-xs font-semibold block mb-1">Policy Name</label>
              <Input
                placeholder="e.g. Employee PAN Card Rule"
                value={newPolicyName}
                onChange={(e) => setNewPolicyName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Policy Type</label>
              <select
                className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                value={newPolicyType}
                onChange={(e) => setNewPolicyType(e.target.value)}
              >
                <option value="PII_CREDIT_CARD">Credit Card (Luhn Validated)</option>
                <option value="PII_SSN">National Tax / SSN</option>
                <option value="PII_EMAIL">Bulk Email Disclosure</option>
                <option value="PII_PHONE">Phone Number Disclosure</option>
                <option value="CUSTOM_KEYWORD">Custom Keyword / Secret</option>
                <option value="REGEX">Custom Regular Expression</option>
              </select>
            </div>
            {newPolicyType === "REGEX" || newPolicyType === "CUSTOM_KEYWORD" ? (
              <div>
                <label className="text-xs font-semibold block mb-1">Pattern / Keywords</label>
                <Input
                  placeholder="Regex pattern or comma-separated keywords"
                  value={newPolicyPattern}
                  onChange={(e) => setNewPolicyPattern(e.target.value)}
                />
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Severity</label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                  value={newPolicySeverity}
                  onChange={(e) => setNewPolicySeverity(e.target.value)}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Enforcement Action</label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                  value={newPolicyAction}
                  onChange={(e) => setNewPolicyAction(e.target.value)}
                >
                  <option value="LOG">LOG Only</option>
                  <option value="WARN">WARN</option>
                  <option value="BLOCK">BLOCK</option>
                  <option value="QUARANTINE">QUARANTINE</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatePolicyOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePolicy} disabled={!newPolicyName.trim()}>
              Save Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review DLP Finding Dialog */}
      <Dialog
        open={Boolean(selectedFinding)}
        onOpenChange={(open) => !open && setSelectedFinding(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review DLP Compliance Finding</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2 text-sm">
            <div className="p-3 bg-muted rounded font-mono text-xs flex flex-col gap-1">
              <div>Redacted Match: {selectedFinding?.redactedMatch}</div>
              <div>Location: {selectedFinding?.location}</div>
            </div>
            <Input
              placeholder="Review notes..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleResolveFinding("FALSE_POSITIVE")}
            >
              Mark False Positive
            </Button>
            <Button onClick={() => handleResolveFinding("RESOLVED")}>
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
