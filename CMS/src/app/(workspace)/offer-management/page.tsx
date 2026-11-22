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
  FileCheck,
  Printer,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';

export default function OfferManagementPage() {
  const { data: offers = [], isLoading } = useQuery<any[]>({
    queryKey: ['offer-management-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/recruitment/candidates?limit=50');
      const all = Array.isArray(res.data) ? res.data : res.data?.candidates || res.data?.data || [];
      return all.filter((c: any) => c.status === 'OFFER' || c.stage === 'OFFER' || c.status === 'HIRED');
    },
  });

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Offer Letter & Compensation Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage candidate CTC breakdowns, offer letters, and acceptance signatures.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print Offers
        </Button>
      </div>

      <Card className="border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Candidate</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Annual CTC Offer</TableHead>
                <TableHead>Joining Target</TableHead>
                <TableHead className="text-center">Offer Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Loading offers...</TableCell>
                </TableRow>
              ) : offers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No pending offer letters on record.</TableCell>
                </TableRow>
              ) : (
                offers.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-semibold">{o.name || `${o.firstName || ''} ${o.lastName || ''}`}</TableCell>
                    <TableCell>{o.job?.title || 'Software Engineer'}</TableCell>
                    <TableCell className="font-bold text-emerald-600">{formatSystemAmount(1200000)} / yr</TableCell>
                    <TableCell className="text-sm text-muted-foreground">15th Next Month</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default">OFFER ACCEPTED</Badge>
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
