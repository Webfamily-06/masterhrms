'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatSystemAmount } from '@/lib/currency';
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
  BadgePercent,
  Plus,
  Printer,
} from 'lucide-react';
import Link from 'next/link';

export default function DealsPage() {
  const { data: deals = [], isLoading } = useQuery<any[]>({
    queryKey: ['crm-deals-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/crm/deals');
      return Array.isArray(res.data) ? res.data : res.data?.deals || res.data?.data || [];
    },
  });

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">CRM Deals & Opportunities</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pipeline stage tracking, expected closing dates, and contract valuations.</p>
        </div>
        <Link href="/crm">
          <Button size="sm" className="gap-1.5 bg-primary">
            <Plus className="w-4 h-4" /> New Opportunity
          </Button>
        </Link>
      </div>

      <Card className="border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Deal Title</TableHead>
                <TableHead>Client / Account</TableHead>
                <TableHead className="text-right">Deal Value</TableHead>
                <TableHead className="text-center">Stage</TableHead>
                <TableHead className="text-center">Probability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Loading deals...</TableCell>
                </TableRow>
              ) : deals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No CRM opportunities in pipeline.</TableCell>
                </TableRow>
              ) : (
                deals.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-semibold text-gray-900 dark:text-gray-100">{d.title || d.name}</TableCell>
                    <TableCell>{d.companyName || d.clientName || 'Prospective Enterprise'}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      {formatSystemAmount(Number(d.value || d.amount) || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{d.stage || 'NEGOTIATION'}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs font-bold">
                      {d.probability || 80}%
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
