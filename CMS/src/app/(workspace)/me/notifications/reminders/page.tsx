'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard, StatsOverviewGrid } from '@/components/ui/stat-card';
import { toast } from 'sonner';

interface ReminderItem {
  id: string;
  entityType: string;
  entityId: string;
  reminderType: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'COMPLETED' | 'DISMISSED';
  dueAt: string;
  createdAt: string;
}

export default function MyRemindersPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'COMPLETED' | 'ALL'>('PENDING');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [formMessage, setFormMessage] = useState('');
  const [formPriority, setFormPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [formDueAt, setFormDueAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });

  // Fetch my reminders
  const { data: reminders = [], isLoading, refetch } = useQuery<ReminderItem[]>({
    queryKey: ['my-reminders'],
    queryFn: async () => {
      try {
        const res = await api.get<any>('/internal-reminders?mine=true');
        const list = Array.isArray(res) ? res : res?.reminders || res?.data || [];
        return list.map((r: any) => ({
          ...r,
          id: String(r.id),
          message: r.message || r.title || r.notes || '',
          dueAt: r.dueAt || r.dueDate || new Date().toISOString(),
          status: r.status || (r.completed ? 'COMPLETED' : 'PENDING'),
        }));
      } catch {
        return [];
      }
    },
  });

  // Create reminder mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      return await api.post('/internal-reminders', {
        entityType: 'general',
        entityId: `ME-${Date.now()}`,
        reminderType: 'personal_reminder',
        message: formMessage.trim(),
        priority: formPriority,
        dueAt: new Date(formDueAt).toISOString(),
      });
    },
    onSuccess: () => {
      toast.success('Reminder created!');
      setShowCreateModal(false);
      setFormMessage('');
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to create reminder.');
    },
  });

  // Complete mutation
  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.put(`/internal-reminders/${id}/complete`);
    },
    onSuccess: () => {
      toast.success('Marked as done!');
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update reminder.');
    },
  });

  // Dismiss mutation
  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.put(`/internal-reminders/${id}/dismiss`);
    },
    onSuccess: () => {
      toast.success('Reminder dismissed.');
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to dismiss reminder.');
    },
  });

  const filtered = reminders.filter((r) => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  const pendingCount = reminders.filter((r) => r.status === 'PENDING').length;
  const highPriorityCount = reminders.filter(
    (r) => (r.priority === 'HIGH' || r.priority === 'URGENT') && r.status === 'PENDING'
  ).length;
  const completedCount = reminders.filter((r) => r.status === 'COMPLETED').length;

  const getPriorityBadge = (p: ReminderItem['priority']) => {
    switch (p) {
      case 'URGENT':
        return (
          <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 font-bold text-[10px]">
            URGENT
          </Badge>
        );
      case 'HIGH':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold text-[10px]">
            HIGH
          </Badge>
        );
      case 'MEDIUM':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold text-[10px]">
            MEDIUM
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="font-semibold text-[10px]">
            LOW
          </Badge>
        );
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* ─── PageHeader ─── */}
      <PageHeader
        title="My Reminders & Alerts"
        description="Track personal follow-ups, pending checklist items, and workflow alerts assigned to you."
        breadcrumbs={[
          { label: 'Me', href: '/me' },
          { label: 'Notifications', href: '/me/notifications' },
          { label: 'Reminders' },
        ]}
        actions={
          <Button
            size="sm"
            variant="primary"
            className="text-xs font-semibold gap-1.5 h-9 shadow-2xs"
            onClick={() => setShowCreateModal(true)}
          >
            <i className="ph ph-plus text-base" /> Set Reminder
          </Button>
        }
      />

      {/* ─── Stats Overview ─── */}
      <StatsOverviewGrid columns={3}>
        <StatCard
          label="Active Reminders"
          value={pendingCount}
          icon={<i className="ph-duotone ph-bell text-xl text-primary" />}
          description="Pending personal items"
          variant="primary"
          isLoading={isLoading}
        />
        <StatCard
          label="Urgent & High"
          value={highPriorityCount}
          icon={<i className="ph-duotone ph-warning-circle text-xl text-amber-500" />}
          description="Due in next 48 hours"
          variant="warning"
          isLoading={isLoading}
        />
        <StatCard
          label="Completed"
          value={completedCount}
          icon={<i className="ph-duotone ph-check-circle text-xl text-emerald-600" />}
          description="Tasks finished"
          variant="success"
          isLoading={isLoading}
        />
      </StatsOverviewGrid>

      {/* ─── Status Filter ─── */}
      <div className="flex items-center gap-1.5 bg-card p-2 rounded-xl border border-border/80 shadow-xs w-fit">
        {(['PENDING', 'COMPLETED', 'ALL'] as const).map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs px-2.5 font-semibold capitalize"
            onClick={() => setStatusFilter(s)}
          >
            {s.toLowerCase()}
          </Button>
        ))}
      </div>

      {/* ─── Reminders List ─── */}
      {isLoading ? (
        <Card className="p-16 text-center border border-border/80 rounded-xl">
          <i className="ph ph-spinner animate-spin text-3xl mx-auto text-primary" />
          <p className="text-xs text-muted-foreground mt-2">Loading your reminders...</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-16 text-center border-dashed border-2 border-border/80 rounded-xl">
          <i className="ph ph-bell text-4xl text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-bold text-sm text-foreground">All Caught Up!</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            You don't have any pending reminders at this moment.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-4 font-bold text-xs"
            onClick={() => setShowCreateModal(true)}
          >
            Create Personal Reminder
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => (
            <Card
              key={r.id}
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-border/80 rounded-xl shadow-xs transition-colors ${
                r.status === 'COMPLETED' ? 'opacity-60 bg-muted/20' : 'bg-card'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getPriorityBadge(r.priority)}
                  <span className="text-[11px] text-muted-foreground tabular-nums flex items-center gap-1">
                    <i className="ph ph-clock text-primary text-xs" /> Due:{' '}
                    {new Date(r.dueAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs font-semibold text-foreground leading-snug">{r.message}</p>
              </div>

              {r.status === 'PENDING' && (
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-semibold gap-1 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30"
                    onClick={() => completeMutation.mutate(r.id)}
                  >
                    <i className="ph ph-check-circle text-sm" /> Mark Done
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs font-semibold text-muted-foreground hover:bg-muted"
                    onClick={() => dismissMutation.mutate(r.id)}
                  >
                    <i className="ph ph-x-circle text-sm" /> Dismiss
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ─── Create Personal Reminder Modal ─── */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <i className="ph ph-alarm text-primary text-lg" /> Set Personal Reminder
            </DialogTitle>
            <DialogDescription className="text-xs">
              Create a personalized reminder to keep track of tasks or deliverables.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Priority</Label>
              <Select value={formPriority} onValueChange={(v: any) => setFormPriority(v)}>
                <SelectTrigger className="h-9 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Due Date</Label>
              <Input
                type="date"
                value={formDueAt}
                onChange={(e) => setFormDueAt(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">What would you like to be reminded of?</Label>
              <Textarea
                placeholder="Submit expense receipts, check in with mentor, etc..."
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                className="text-xs min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button size="sm" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={!formMessage.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="font-bold text-xs"
            >
              {createMutation.isPending ? 'Saving...' : 'Save Reminder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
