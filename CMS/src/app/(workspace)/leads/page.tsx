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
  UserPlus,
  Plus,
  Mail,
  Phone,
} from 'lucide-react';
import Link from 'next/link';

export default function LeadsPage() {
  const { data: leads = [], isLoading } = useQuery<any[]>({
    queryKey: ['crm-leads-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/crm/leads');
      return Array.isArray(res.data) ? res.data : res.data?.leads || res.data?.data || [];
    },
  });

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">CRM Leads Master Directory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Inbound website leads, referrals, and sales qualification pipeline.</p>
        </div>
        <Link href="/crm">
          <Button size="sm" className="gap-1.5 bg-primary">
            <Plus className="w-4 h-4" /> Capture Lead
          </Button>
        </Link>
      </div>

      <Card className="border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Lead Contact</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Loading leads...</TableCell>
                </TableRow>
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No active sales leads.</TableCell>
                </TableRow>
              ) : (
                leads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{l.name || `${l.firstName || ''} ${l.lastName || ''}`}</div>
                      <div className="text-xs text-muted-foreground">Added {new Date(l.createdAt).toLocaleDateString()}</div>
                    </TableCell>
                    <TableCell>{l.company || l.companyName || 'Independent'}</TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        {l.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3 text-muted-foreground" /> {l.email}</div>}
                        {l.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-muted-foreground" /> {l.phone}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{l.source || 'Organic Web'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default">{l.status || 'QUALIFIED'}</Badge>
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
