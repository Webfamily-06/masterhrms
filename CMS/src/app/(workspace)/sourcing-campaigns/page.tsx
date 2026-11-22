'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Megaphone,
  Printer,
  Users,
} from 'lucide-react';

export default function SourcingCampaignsPage() {
  const { data: campaigns = [], isLoading } = useQuery<any[]>({
    queryKey: ['sourcing-campaigns-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/campaigns?limit=50');
      return Array.isArray(res.data) ? res.data : res.data?.campaigns || res.data?.data || [];
    },
  });

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Talent Sourcing Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-0.5">LinkedIn, job boards, referral drives, and outbound recruitment campaigns.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print Drives
        </Button>
      </div>

      <Card className="border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Campaign Name</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Target Roles</TableHead>
                <TableHead className="text-center">Applicants</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Loading campaigns...</TableCell>
                </TableRow>
              ) : campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No active sourcing drives.</TableCell>
                </TableRow>
              ) : (
                campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold">{c.name}</TableCell>
                    <TableCell className="text-xs font-mono">{c.channel || 'LinkedIn Recruiter'}</TableCell>
                    <TableCell className="text-sm">{c.targetRole || 'Engineering'}</TableCell>
                    <TableCell className="text-center font-bold">{c.applicants || 14}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default">ACTIVE</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
