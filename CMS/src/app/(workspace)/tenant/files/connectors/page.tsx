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
  Cloud,
  RefreshCw,
  FolderSync,
  Plus,
  Trash2,
  FileText,
  AlertTriangle,
  Download,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

export default function ExternalConnectorsPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Connect dialog
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<"GOOGLE_DRIVE" | "ONEDRIVE" | "DROPBOX">("GOOGLE_DRIVE");
  const [connectionName, setConnectionName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [syncMode, setSyncMode] = useState<"BIDIRECTIONAL" | "IMPORT_ONLY" | "EXPORT_ONLY">("BIDIRECTIONAL");

  // Remote browser dialog
  const [browsingConnection, setBrowsingConnection] = useState<any>(null);
  const [remoteFiles, setRemoteFiles] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState<string | null>(null);

  // Sync state
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const loadConnections = () => {
    setLoading(true);
    fetch(`${API_URL}/v1/files/connectors`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setConnections(d.connections || []))
      .catch((e) => console.warn(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const handleCreateConnection = async () => {
    if (!connectionName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/v1/files/connectors`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          provider: selectedProvider,
          connectionName: connectionName.trim(),
          accountEmail: accountEmail.trim() || `${selectedProvider.toLowerCase()}-user@example.com`,
          accessToken: `token-${Date.now()}-mock-oauth-key`,
          syncMode,
        }),
      });
      if (res.ok) {
        setIsConnectOpen(false);
        setConnectionName("");
        setAccountEmail("");
        loadConnections();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm("Are you sure you want to disconnect this external storage connection?")) return;
    try {
      const res = await fetch(`${API_URL}/v1/files/connectors/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) loadConnections();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncNow = async (id: string) => {
    setSyncingId(id);
    try {
      const res = await fetch(`${API_URL}/v1/files/connectors/${id}/sync`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) loadConnections();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingId(null);
    }
  };

  const handleOpenRemoteBrowser = async (conn: any) => {
    setBrowsingConnection(conn);
    try {
      const res = await fetch(`${API_URL}/v1/files/connectors/${conn.id}/remote-files`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const d = await res.json();
        setRemoteFiles(d.files || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleImportFile = async (remoteItem: any) => {
    if (!browsingConnection) return;
    setIsImporting(remoteItem.id);
    try {
      const res = await fetch(`${API_URL}/v1/files/connectors/${browsingConnection.id}/import`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ remoteItem }),
      });
      if (res.ok) {
        alert(`Successfully imported "${remoteItem.name}" into File Manager!`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsImporting(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Cloud className="w-6 h-6 text-primary" />
            External Cloud Storage Connectors
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Seamlessly bridge Google Drive, OneDrive, and Dropbox files into MASTERHRMS with zero byte duplication.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadConnections} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setIsConnectOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            Add Connector
          </Button>
        </div>
      </div>

      {/* Connectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {connections.length === 0 ? (
          <div className="col-span-full border border-dashed rounded-lg p-12 text-center text-muted-foreground">
            <FolderSync className="w-10 h-10 mx-auto mb-2 text-muted-foreground/60" />
            <h3 className="font-semibold text-foreground">No cloud connectors linked</h3>
            <p className="text-xs mt-1 mb-4">Connect your corporate Google Drive or OneDrive account to start syncing.</p>
            <Button size="sm" onClick={() => setIsConnectOpen(true)}>
              Connect Cloud Drive
            </Button>
          </div>
        ) : (
          connections.map((conn) => (
            <div key={conn.id} className="border rounded-xl p-5 bg-card flex flex-col justify-between gap-4 shadow-sm">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-xs uppercase">
                    {conn.provider.replace("_", " ")}
                  </Badge>
                  <Badge
                    variant={conn.status === "CONNECTED" ? "default" : "destructive"}
                    className="text-[10px]"
                  >
                    {conn.status}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-semibold text-base">{conn.connectionName}</h3>
                  <p className="text-xs text-muted-foreground truncate">{conn.accountEmail}</p>
                </div>

                <div className="text-xs bg-muted/40 p-2.5 rounded flex flex-col gap-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sync Mode:</span>
                    <span>{conn.syncMode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Synced:</span>
                    <span>{conn.lastSyncedAt ? new Date(conn.lastSyncedAt).toLocaleTimeString() : "Never"}</span>
                  </div>
                  {conn.unresolvedConflictsCount > 0 && (
                    <div className="flex justify-between text-amber-600 font-bold">
                      <span>Conflicts:</span>
                      <span>{conn.unresolvedConflictsCount} pending</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-2 border-t gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1 flex-1"
                  onClick={() => handleOpenRemoteBrowser(conn)}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Browse Files
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={() => handleSyncNow(conn.id)}
                  disabled={syncingId === conn.id}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingId === conn.id ? "animate-spin" : ""}`} />
                  Sync
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => handleDisconnect(conn.id)}
                  title="Disconnect"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Connect Account Dialog */}
      <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Cloud Storage Provider</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2 text-sm">
            <div>
              <label className="text-xs font-semibold block mb-1">Provider</label>
              <select
                className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as any)}
              >
                <option value="GOOGLE_DRIVE">Google Drive</option>
                <option value="ONEDRIVE">Microsoft OneDrive</option>
                <option value="DROPBOX">Dropbox</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Connection Name</label>
              <Input
                placeholder="e.g. Corporate Google Drive"
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Account Email</label>
              <Input
                placeholder="admin@company.com"
                value={accountEmail}
                onChange={(e) => setAccountEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Synchronization Mode</label>
              <select
                className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                value={syncMode}
                onChange={(e) => setSyncMode(e.target.value as any)}
              >
                <option value="BIDIRECTIONAL">Bidirectional Sync</option>
                <option value="IMPORT_ONLY">Import Only (Cloud to HRMS)</option>
                <option value="EXPORT_ONLY">Export Only (HRMS to Cloud)</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConnectOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateConnection} disabled={!connectionName.trim()}>
              Authenticate & Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remote File Browser Dialog */}
      <Dialog
        open={Boolean(browsingConnection)}
        onOpenChange={(open) => !open && setBrowsingConnection(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-primary" />
              Remote Files in {browsingConnection?.connectionName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-2">
            <div className="border rounded-md divide-y">
              {remoteFiles.map((rf) => (
                <div key={rf.id} className="p-3 flex items-center justify-between hover:bg-muted/40 text-sm">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-xs truncate max-w-sm">{rf.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {(rf.size / 1024).toFixed(1)} KB • {new Date(rf.modifiedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleImportFile(rf)}
                    disabled={isImporting === rf.id}
                  >
                    <Download className={`w-3 h-3 ${isImporting === rf.id ? "animate-spin" : ""}`} />
                    Import to HRMS
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setBrowsingConnection(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
