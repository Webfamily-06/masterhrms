'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getSocketClient } from '@/lib/socket';
import { toast } from 'sonner';
import {
  ShieldAlert,
  Lock,
  Unlock,
  Play,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function RetentionTab() {
  const qc = useQueryClient();

  // Local state
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isExecutingRetention, setIsExecutingRetention] = useState(false);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [isConfirmExecuteOpen, setIsConfirmExecuteOpen] = useState(false);

  // Legal hold modals state
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [newHoldFileId, setNewHoldFileId] = useState('');
  const [newHoldReason, setNewHoldReason] = useState('');
  const [newHoldScope, setNewHoldScope] = useState<'FILE' | 'VERSION'>('FILE');
  const [isCreatingHold, setIsCreatingHold] = useState(false);

  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [releasingHold, setReleasingHold] = useState<any | null>(null);
  const [releaseReason, setReleaseReason] = useState('');
  const [isReleasingHold, setIsReleasingHold] = useState(false);

  // Policy form state
  const [retentionForm, setRetentionForm] = useState({
    trashRetentionDays: 30,
    versionRetentionDays: '',
    maxVersionsPerFile: '',
    cleanExpiredLinks: false,
    cleanAbandonedSessions: true,
    requiresApproval: false,
    isDryRun: true,
    isEnabled: false,
  });

  // 1. Fetch Retention Policy
  const { data: retentionPolicy, refetch: refetchPolicy } = useQuery({
    queryKey: ['tenant-storage-retention-policy'],
    queryFn: async () => {
      const res = await api.get('/api/v1/tenant/storage/retention/policy');
      return (res as any)?.data ?? res;
    },
  });

  // Sync retention form with fetched policy
  useEffect(() => {
    if (retentionPolicy) {
      setRetentionForm({
        trashRetentionDays: retentionPolicy.trashRetentionDays ?? 30,
        versionRetentionDays: retentionPolicy.versionRetentionDays ? String(retentionPolicy.versionRetentionDays) : '',
        maxVersionsPerFile: retentionPolicy.maxVersionsPerFile ? String(retentionPolicy.maxVersionsPerFile) : '',
        cleanExpiredLinks: !!retentionPolicy.cleanExpiredLinks,
        cleanAbandonedSessions: !!retentionPolicy.cleanAbandonedSessions,
        requiresApproval: !!retentionPolicy.requiresApproval,
        isDryRun: retentionPolicy.isDryRun !== undefined ? !!retentionPolicy.isDryRun : true,
        isEnabled: !!retentionPolicy.isEnabled,
      });
    }
  }, [retentionPolicy]);

  // 2. Fetch Legal Holds
  const { data: holdsData, refetch: refetchHolds } = useQuery({
    queryKey: ['tenant-storage-retention-holds'],
    queryFn: async () => {
      const res = await api.get('/api/v1/tenant/storage/retention/holds');
      return (res as any)?.data ?? res;
    },
  });
  const legalHolds = Array.isArray(holdsData) ? holdsData : (holdsData?.holds || []);

  // 3. Fetch Retention Execution History
  const { data: retentionHistoryData, refetch: refetchRetentionHistory } = useQuery({
    queryKey: ['tenant-storage-retention-history'],
    queryFn: async () => {
      const res = await api.get('/api/v1/tenant/storage/retention/history');
      return (res as any)?.data ?? res;
    },
  });
  const retentionJobs = Array.isArray(retentionHistoryData) ? retentionHistoryData : (retentionHistoryData?.jobs || []);

  // Socket.IO Listeners
  useEffect(() => {
    let socket: any;
    try {
      socket = getSocketClient();
      const handleUpdate = () => {
        qc.invalidateQueries({ queryKey: ['tenant-storage-retention-policy'] });
        qc.invalidateQueries({ queryKey: ['tenant-storage-retention-holds'] });
        qc.invalidateQueries({ queryKey: ['tenant-storage-retention-history'] });
        qc.invalidateQueries({ queryKey: ['tenant-storage-summary'] });
      };

      socket.on('retention:policy:updated', handleUpdate);
      socket.on('retention:preview:created', handleUpdate);
      socket.on('retention:job:completed', handleUpdate);
      socket.on('retention:hold:created', handleUpdate);
      socket.on('retention:hold:released', handleUpdate);

      return () => {
        socket.off('retention:policy:updated', handleUpdate);
        socket.off('retention:preview:created', handleUpdate);
        socket.off('retention:job:completed', handleUpdate);
        socket.off('retention:hold:created', handleUpdate);
        socket.off('retention:hold:released', handleUpdate);
      };
    } catch (e) {
      console.warn('[RetentionTab] Socket error:', e);
    }
  }, [qc]);

  // Action: Save Policy
  const handleSavePolicy = async () => {
    try {
      setIsSavingPolicy(true);
      await api.put('/api/v1/tenant/storage/retention/policy', {
        trashRetentionDays: Number(retentionForm.trashRetentionDays),
        versionRetentionDays: retentionForm.versionRetentionDays ? Number(retentionForm.versionRetentionDays) : null,
        maxVersionsPerFile: retentionForm.maxVersionsPerFile ? Number(retentionForm.maxVersionsPerFile) : null,
        cleanExpiredLinks: retentionForm.cleanExpiredLinks,
        cleanAbandonedSessions: retentionForm.cleanAbandonedSessions,
        requiresApproval: retentionForm.requiresApproval,
        isDryRun: retentionForm.isDryRun,
        isEnabled: retentionForm.isEnabled,
      });
      toast.success('Retention policy settings updated successfully.');
      refetchPolicy();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err.message || 'Failed to update retention policy');
    } finally {
      setIsSavingPolicy(false);
    }
  };

  // Action: Generate Dry-Run Preview
  const handleGeneratePreview = async () => {
    try {
      setIsPreviewLoading(true);
      const res: any = await api.post('/api/v1/tenant/storage/retention/preview', {});
      const data = res?.data ?? res;
      setPreviewData(data);
      toast.success(`Preview generated: ${data.eligibleCount} items eligible for retention cleanup.`);
      refetchRetentionHistory();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err.message || 'Failed to generate preview');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Action: Execute Retention Cleanup
  const handleExecuteRetention = async () => {
    try {
      setIsExecutingRetention(true);
      const res: any = await api.post('/api/v1/tenant/storage/retention/execute', {
        isDryRun: false,
        force: true,
      });
      const data = res?.data ?? res;
      toast.success(`Retention execution completed: ${data.deletedCount} items purged, ${data.formattedReclaimed} reclaimed.`);
      setIsConfirmExecuteOpen(false);
      qc.invalidateQueries({ queryKey: ['tenant-storage-summary'] });
      refetchPolicy();
      refetchRetentionHistory();
      handleGeneratePreview();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err.message || 'Failed to execute retention cleanup');
    } finally {
      setIsExecutingRetention(false);
    }
  };

  // Action: Place Legal Hold
  const handleCreateLegalHold = async () => {
    if (!newHoldFileId || !newHoldReason) {
      toast.error('File ID and reason are required to place a legal hold.');
      return;
    }
    try {
      setIsCreatingHold(true);
      await api.post('/api/v1/tenant/storage/retention/holds', {
        fileId: newHoldFileId.trim(),
        reason: newHoldReason.trim(),
        holdScope: newHoldScope,
      });
      toast.success('Legal hold successfully placed on file.');
      setIsHoldModalOpen(false);
      setNewHoldFileId('');
      setNewHoldReason('');
      refetchHolds();
      refetchPolicy();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err.message || 'Failed to place legal hold');
    } finally {
      setIsCreatingHold(false);
    }
  };

  // Action: Release Legal Hold
  const handleReleaseLegalHold = async () => {
    if (!releasingHold || !releaseReason) {
      toast.error('Release reason is required to release a legal hold.');
      return;
    }
    try {
      setIsReleasingHold(true);
      await api.post(`/api/v1/tenant/storage/retention/holds/${releasingHold.id}/release`, {
        releaseReason: releaseReason.trim(),
      });
      toast.success('Legal hold released successfully.');
      setIsReleaseModalOpen(false);
      setReleasingHold(null);
      setReleaseReason('');
      refetchHolds();
      refetchPolicy();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err.message || 'Failed to release legal hold');
    } finally {
      setIsReleasingHold(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-foreground">Enterprise Retention & Legal Hold Governance</h3>
            <Badge
              className={`text-[10px] h-4 px-1.5 font-semibold ${
                retentionPolicy?.isEnabled
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
              }`}
            >
              {retentionPolicy?.isEnabled ? 'POLICY ACTIVE' : 'POLICY DISABLED'}
            </Badge>
            <Badge
              className={`text-[10px] h-4 px-1.5 font-semibold ${
                retentionPolicy?.isDryRun
                  ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
              }`}
            >
              {retentionPolicy?.isDryRun ? 'DRY-RUN ONLY' : 'LIVE PURGE'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Automated lifecycle rules for trash items and historical versions with active legal hold protection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGeneratePreview}
            disabled={isPreviewLoading}
            className="text-xs gap-1.5 h-8 font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPreviewLoading ? 'animate-spin' : ''}`} />
            {isPreviewLoading ? 'Evaluating...' : 'Dry-Run Preview'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHoldModalOpen(true)}
            className="text-xs gap-1.5 h-8 font-medium border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
          >
            <Lock className="w-3.5 h-3.5" />
            Place Legal Hold
          </Button>
          <Button
            size="sm"
            onClick={() => setIsConfirmExecuteOpen(true)}
            disabled={isExecutingRetention || !retentionPolicy?.isEnabled}
            className="text-xs gap-1.5 h-8 font-medium bg-rose-600 hover:bg-rose-700 text-white"
          >
            <Play className="w-3.5 h-3.5" />
            Execute Purge
          </Button>
        </div>
      </div>

      {/* Retention Policy Configuration */}
      <div className="p-5 rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div>
            <h4 className="text-sm font-bold text-foreground">Lifecycle Policy Settings</h4>
            <p className="text-xs text-muted-foreground">
              Policy version: v{retentionPolicy?.policyVersion || 1} • Safe-by-default activation rules
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleSavePolicy}
            disabled={isSavingPolicy}
            className="text-xs h-7 px-3 bg-primary text-primary-foreground font-medium"
          >
            {isSavingPolicy ? 'Saving...' : 'Save Policy Settings'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Trash Retention Duration</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="365"
                value={retentionForm.trashRetentionDays}
                onChange={(e) => setRetentionForm({ ...retentionForm, trashRetentionDays: Number(e.target.value) })}
                className="h-8 font-mono text-xs"
              />
              <span className="text-muted-foreground font-medium">Days</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Default canonical setting is 30 days.</p>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Historical Version Retention</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                placeholder="Unlimited"
                value={retentionForm.versionRetentionDays}
                onChange={(e) => setRetentionForm({ ...retentionForm, versionRetentionDays: e.target.value })}
                className="h-8 font-mono text-xs"
              />
              <span className="text-muted-foreground font-medium">Days</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Leave blank to retain historical versions indefinitely.</p>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Max Versions Per File</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                placeholder="Unlimited"
                value={retentionForm.maxVersionsPerFile}
                onChange={(e) => setRetentionForm({ ...retentionForm, maxVersionsPerFile: e.target.value })}
                className="h-8 font-mono text-xs"
              />
              <span className="text-muted-foreground font-medium">Versions</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Prune excess non-current historical versions.</p>
          </div>

          <div className="space-y-3 pt-1">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
              <input
                type="checkbox"
                checked={retentionForm.cleanExpiredLinks}
                onChange={(e) => setRetentionForm({ ...retentionForm, cleanExpiredLinks: e.target.checked })}
                className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
              />
              Purge Expired Public Links
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
              <input
                type="checkbox"
                checked={retentionForm.cleanAbandonedSessions}
                onChange={(e) => setRetentionForm({ ...retentionForm, cleanAbandonedSessions: e.target.checked })}
                className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
              />
              Clean Abandoned Uploads (&gt;24h)
            </label>
          </div>
        </div>

        <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
              <input
                type="checkbox"
                checked={retentionForm.isDryRun}
                onChange={(e) => setRetentionForm({ ...retentionForm, isDryRun: e.target.checked })}
                className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
              />
              Dry-Run Mode (Simulation only, never delete)
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
              <input
                type="checkbox"
                checked={retentionForm.requiresApproval}
                onChange={(e) => setRetentionForm({ ...retentionForm, requiresApproval: e.target.checked })}
                className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
              />
              Require Manual Administrator Approval
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-emerald-600 dark:text-emerald-400">
              <input
                type="checkbox"
                checked={retentionForm.isEnabled}
                onChange={(e) => setRetentionForm({ ...retentionForm, isEnabled: e.target.checked })}
                className="rounded border-input text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
              />
              Enable Retention Automation
            </label>
          </div>
        </div>
      </div>

      {/* Dry-Run Candidate Preview Panel */}
      {previewData && (
        <div className="p-5 rounded-xl border border-blue-500/30 bg-blue-500/5 backdrop-blur-md shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <h4 className="text-sm font-bold text-foreground">Candidate Discovery & Protection Summary</h4>
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              Evaluated at: {new Date(previewData.proposedExecutionTime).toLocaleTimeString()}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 rounded-lg bg-card border border-border/50">
              <div className="text-muted-foreground text-[11px]">Eligible Items</div>
              <div className="text-lg font-bold text-foreground">{previewData.eligibleCount} files</div>
              <div className="text-[10px] text-muted-foreground font-sans">Ready for permanent purge</div>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border/50">
              <div className="text-muted-foreground text-[11px]">Reclaimable Storage</div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {previewData.formattedEligibleBytes}
              </div>
              <div className="text-[10px] text-muted-foreground font-sans">Physical disk space</div>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border/50">
              <div className="text-muted-foreground text-[11px]">Legal Hold Protected</div>
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{previewData.heldCount}</div>
              <div className="text-[10px] text-muted-foreground font-sans">Strictly preserved</div>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border/50">
              <div className="text-muted-foreground text-[11px]">Business Protected</div>
              <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                {previewData.protectedCount}
              </div>
              <div className="text-[10px] text-muted-foreground font-sans">MediaUsage & system links</div>
            </div>
          </div>

          {/* Skipped reasons breakdown pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-[11px] font-semibold text-muted-foreground">Protection Filters:</span>
            {Object.entries(previewData.skippedBreakdown || {}).map(([reason, count]) => (
              <Badge key={reason} variant="secondary" className="text-[10px] font-mono">
                {reason}: {String(count)}
              </Badge>
            ))}
          </div>

          {/* Sample Candidates Table */}
          {previewData.sampleCandidates && previewData.sampleCandidates.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase">
                    <th className="py-2 px-3">Candidate File</th>
                    <th className="py-2 px-3">Folder</th>
                    <th className="py-2 px-3">Size</th>
                    <th className="py-2 px-3">Trashed Date</th>
                    <th className="py-2 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono text-xs">
                  {previewData.sampleCandidates.map((c: any) => (
                    <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-2 px-3 font-sans font-medium text-foreground">{c.fileName}</td>
                      <td className="py-2 px-3 text-muted-foreground">{c.folder}</td>
                      <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400">{c.formattedSize}</td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {c.trashedAt ? new Date(c.trashedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-2 px-3 font-sans">
                        <Badge variant="outline" className="text-[10px] h-4 border-rose-500/30 text-rose-500">
                          Eligible for Purge
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Active Legal Holds Table */}
      <div className="p-5 rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-bold text-foreground">Active Legal Holds & Preservation Locks</h4>
            <Badge variant="secondary" className="text-[10px]">
              {legalHolds.filter((h: any) => !h.releasedAt).length} Active
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHoldModalOpen(true)}
            className="text-xs h-7 px-3 gap-1"
          >
            <Lock className="w-3 h-3 text-amber-500" />
            Place New Hold
          </Button>
        </div>

        <div className="rounded-lg border border-border/60 overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase">
                <th className="py-2.5 px-4">Protected File</th>
                <th className="py-2.5 px-4">Legal Hold Reason</th>
                <th className="py-2.5 px-4">Scope</th>
                <th className="py-2.5 px-4">Placed At</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {legalHolds.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-muted-foreground">
                    No active or released legal holds found for this organization.
                  </td>
                </tr>
              ) : (
                legalHolds.map((hold: any) => (
                  <tr key={hold.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">
                      {hold.file?.fileName || hold.fileId}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">{hold.reason}</td>
                    <td className="py-3 px-4 font-mono text-[11px]">{hold.holdScope}</td>
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {new Date(hold.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      {hold.releasedAt ? (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          RELEASED
                        </Badge>
                      ) : (
                        <Badge className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          ACTIVE HOLD
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!hold.releasedAt && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReleasingHold(hold);
                            setIsReleaseModalOpen(true);
                          }}
                          className="text-xs h-7 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                        >
                          <Unlock className="w-3.5 h-3.5 mr-1" />
                          Release
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

      {/* Retention Execution History Log */}
      <div className="p-5 rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-bold text-foreground">Retention Execution Audit Trail</h4>
          </div>
          <span className="text-xs text-muted-foreground font-mono">{retentionJobs.length} recorded runs</span>
        </div>

        <div className="rounded-lg border border-border/60 overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase">
                <th className="py-2.5 px-4">Job ID</th>
                <th className="py-2.5 px-4">Mode</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Eligible</th>
                <th className="py-2.5 px-4">Reclaimed Storage</th>
                <th className="py-2.5 px-4">Execution Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono text-xs">
              {retentionJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-muted-foreground font-sans">
                    No retention execution history yet. Generate a preview or execute a job.
                  </td>
                </tr>
              ) : (
                retentionJobs.map((job: any) => (
                  <tr key={job.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">{job.id.slice(0, 8)}...</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px]">
                        {job.isDryRun ? 'DRY-RUN' : 'LIVE'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <Badge
                        className={`text-[10px] ${
                          job.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : job.status === 'FAILED'
                            ? 'bg-rose-500/10 text-rose-500'
                            : 'bg-blue-500/10 text-blue-500'
                        }`}
                      >
                        {job.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">{job.eligibleCount} items</td>
                    <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-bold">
                      {job.formattedDeletedBytes || '0 B'}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-sans">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Dialog: Place Legal Hold ── */}
      <Dialog open={isHoldModalOpen} onOpenChange={setIsHoldModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500" />
              Place Legal Preservation Hold
            </DialogTitle>
            <DialogDescription className="text-xs">
              Designate a file or version under legal hold. Items under legal hold are strictly protected from retention deletion.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Target File UUID</label>
              <Input
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                value={newHoldFileId}
                onChange={(e) => setNewHoldFileId(e.target.value)}
                className="font-mono text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Legal Hold Reason</label>
              <Input
                placeholder="e.g. Pending litigation case #4028 or regulatory audit"
                value={newHoldReason}
                onChange={(e) => setNewHoldReason(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Hold Scope</label>
              <select
                value={newHoldScope}
                onChange={(e) => setNewHoldScope(e.target.value as any)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="FILE">Entire File & All Versions</option>
                <option value="VERSION">Specific Historical Version</option>
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsHoldModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateLegalHold}
              disabled={isCreatingHold}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isCreatingHold ? 'Placing Hold...' : 'Lock File Under Hold'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Release Legal Hold ── */}
      <Dialog open={isReleaseModalOpen} onOpenChange={setIsReleaseModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Unlock className="w-4 h-4 text-primary" />
              Release Legal Preservation Hold
            </DialogTitle>
            <DialogDescription className="text-xs">
              Releasing this legal hold will return the file to standard retention lifecycle rules.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-lg bg-muted/40 space-y-1">
              <div className="font-semibold text-foreground">
                Target: {releasingHold?.file?.fileName || releasingHold?.fileId}
              </div>
              <div className="text-muted-foreground text-[11px]">Hold Reason: {releasingHold?.reason}</div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Release Justification / Reason</label>
              <Input
                placeholder="e.g. Audit concluded, matter settled"
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsReleaseModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleReleaseLegalHold}
              disabled={isReleasingHold}
              className="bg-primary text-primary-foreground"
            >
              {isReleasingHold ? 'Releasing...' : 'Confirm Release'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirm Permanent Retention Execution ── */}
      <Dialog open={isConfirmExecuteOpen} onOpenChange={setIsConfirmExecuteOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Confirm Permanent Storage Purge
            </DialogTitle>
            <DialogDescription className="text-xs">
              This action permanently removes eligible trash items and excess versions from object storage. This action is irreversible.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-800 dark:text-rose-200 space-y-2">
            <div className="font-semibold flex items-center gap-1.5">
              <span>⚠️ Destructive Operation Notice</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Active files, files with business references, and files under legal hold are strictly protected.
              Only items past the {retentionForm.trashRetentionDays}-day retention threshold will be purged.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsConfirmExecuteOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteRetention}
              disabled={isExecutingRetention}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isExecutingRetention ? 'Executing Purge...' : 'Confirm & Execute Purge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
