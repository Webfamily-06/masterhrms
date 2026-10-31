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
  FolderKanban,
  HardDrive,
  Copy,
  Check,
  Plus,
  Trash2,
  RefreshCw,
  Terminal,
  Info,
  Lock,
} from "lucide-react";

export default function WebdavTokensPage() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate Token State
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [generatedResult, setGeneratedResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const loadTokens = () => {
    setLoading(true);
    fetch(`${API_URL}/v1/files/webdav/tokens`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setTokens(d.tokens || []))
      .catch((e) => console.warn(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTokens();
  }, []);

  const handleGenerateToken = async () => {
    if (!tokenName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/v1/files/webdav/tokens`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ tokenName: tokenName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedResult(data);
        setTokenName("");
        loadTokens();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeToken = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this WebDAV mount token? Any mounted drives will lose access.")) return;
    try {
      const res = await fetch(`${API_URL}/v1/files/webdav/tokens/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) loadTokens();
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const webdavUrl = typeof window !== "undefined"
    ? `${window.location.origin.replace(":3000", ":4000")}/webdav`
    : "http://localhost:4000/webdav";

  return (
    <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <HardDrive className="w-6 h-6 text-primary" />
            WebDAV Network Drive Gateway
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mount your MASTERHRMS file system directly as a virtual network drive in Windows File Explorer, macOS Finder, or Linux.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadTokens} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setIsGenerateOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            Generate Mount Token
          </Button>
        </div>
      </div>

      {/* Strict Read-Only Notification Banner */}
      <div className="p-4 bg-muted/60 border rounded-lg flex items-start gap-3">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-foreground">Strict Read-Only Gateway (RFC 4918 Invariant)</p>
          <p className="text-muted-foreground">
            For security, legal hold, and quota consistency, the WebDAV gateway operates in strict read-only mode.
            You can browse folders, preview docs, and stream files directly inside your desktop OS. New uploads, moves, and deletions must be performed via the web portal.
          </p>
        </div>
      </div>

      {/* OS Setup Guides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-card flex flex-col gap-2">
          <h3 className="font-semibold text-sm flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-primary" />
            Windows File Explorer
          </h3>
          <p className="text-xs text-muted-foreground">
            Open File Explorer → Right-click "This PC" → "Map network drive" → Enter URL below. Use token as password.
          </p>
          <div className="mt-auto pt-2">
            <code className="text-[11px] bg-muted px-2 py-1 rounded block truncate font-mono">
              {webdavUrl}
            </code>
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-card flex flex-col gap-2">
          <h3 className="font-semibold text-sm flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-primary" />
            macOS Finder
          </h3>
          <p className="text-xs text-muted-foreground">
            Open Finder → Press <kbd className="px-1 bg-muted rounded">Cmd+K</kbd> → Enter URL below → Connect as Registered User with your token.
          </p>
          <div className="mt-auto pt-2">
            <code className="text-[11px] bg-muted px-2 py-1 rounded block truncate font-mono">
              {webdavUrl}
            </code>
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-card flex flex-col gap-2">
          <h3 className="font-semibold text-sm flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-primary" />
            Linux (davfs2)
          </h3>
          <p className="text-xs text-muted-foreground">
            Mount to local directory via terminal:
          </p>
          <div className="mt-auto pt-2">
            <code className="text-[11px] bg-muted px-2 py-1 rounded block truncate font-mono">
              mount -t davfs {webdavUrl} /mnt/hrms
            </code>
          </div>
        </div>
      </div>

      {/* Active Tokens Table */}
      <div className="flex flex-col gap-3">
        <h3 className="text-base font-semibold">Active WebDAV Access Tokens</h3>
        <div className="border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase border-b">
              <tr>
                <th className="p-3">Token Name</th>
                <th className="p-3">Prefix</th>
                <th className="p-3">Last Used</th>
                <th className="p-3">Expires At</th>
                <th className="p-3 text-right">Revoke</th>
              </tr>
            </thead>
            <tbody>
              {tokens.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                    No active WebDAV tokens. Generate one above to mount the drive on your computer.
                  </td>
                </tr>
              ) : (
                tokens.map((tok) => (
                  <tr key={tok.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">{tok.tokenName}</td>
                    <td className="p-3 font-mono text-xs">{tok.prefix}••••••••</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {tok.lastUsedAt ? new Date(tok.lastUsedAt).toLocaleString() : "Never"}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {tok.expiresAt ? new Date(tok.expiresAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleRevokeToken(tok.id)}
                        title="Revoke Token"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Token Dialog */}
      <Dialog open={isGenerateOpen} onOpenChange={(open) => {
        if (!open) {
          setIsGenerateOpen(false);
          setGeneratedResult(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate WebDAV Mount Token</DialogTitle>
          </DialogHeader>

          {!generatedResult ? (
            <div className="flex flex-col gap-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground">
                Give this token a friendly name (e.g. "Work Laptop Windows Mount").
              </p>
              <div>
                <label className="text-xs font-semibold block mb-1">Token Name</label>
                <Input
                  placeholder="e.g. My MacBook Pro"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 py-2">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-700 dark:text-amber-400">
                Please copy this secret token immediately. It will never be shown again!
              </div>

              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted p-2 rounded flex-1 font-mono break-all border select-all">
                  {generatedResult.token}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 shrink-0"
                  onClick={() => copyToClipboard(generatedResult.token)}
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            {!generatedResult ? (
              <>
                <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleGenerateToken} disabled={!tokenName.trim()}>
                  Generate Token
                </Button>
              </>
            ) : (
              <Button onClick={() => {
                setIsGenerateOpen(false);
                setGeneratedResult(null);
              }}>
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
