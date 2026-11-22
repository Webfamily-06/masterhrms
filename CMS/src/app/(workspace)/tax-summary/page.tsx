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
  Calculator,
  Printer,
  ShieldCheck,
  Building,
} from 'lucide-react';

export default function TaxSummaryPage() {
  const { data: salesList = [], isLoading } = useQuery<any[]>({
    queryKey: ['tax-summary-sales'],
    queryFn: async () => {
      const res = await api.get<any>('/api/sales?limit=100');
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  const totalCGST = salesList.reduce((acc, s) => acc + (Number(s.cgst) || 0), 0);
  const totalSGST = salesList.reduce((acc, s) => acc + (Number(s.sgst) || 0), 0);
  const totalIGST = salesList.reduce((acc, s) => acc + (Number(s.igst) || 0), 0);
  const grossTaxLiability = totalCGST + totalSGST + totalIGST;

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">GST & Tax Summary</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Output GST liability, CGST/SGST reconciliations, and statutory filing readiness.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print GSTR Summary
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase">Total GST Collected</p>
            <h3 className="text-2xl font-bold mt-1 text-primary">{formatSystemAmount(grossTaxLiability)}</h3>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase">Output CGST (Central)</p>
            <h3 className="text-2xl font-bold mt-1 text-blue-600">{formatSystemAmount(totalCGST)}</h3>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase">Output SGST (State)</p>
            <h3 className="text-2xl font-bold mt-1 text-emerald-600">{formatSystemAmount(totalSGST)}</h3>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase">Output IGST (Inter-state)</p>
            <h3 className="text-2xl font-bold mt-1 text-purple-600">{formatSystemAmount(totalIGST)}</h3>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Invoice ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead className="text-right">Taxable Value</TableHead>
                <TableHead className="text-right">CGST</TableHead>
                <TableHead className="text-right">SGST</TableHead>
                <TableHead className="text-right">Total GST</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Calculating tax ledger...</TableCell>
                </TableRow>
              ) : salesList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No taxable transactions found.</TableCell>
                </TableRow>
              ) : (
                salesList.map((s) => {
                  const itemGst = (Number(s.cgst) || 0) + (Number(s.sgst) || 0) + (Number(s.igst) || 0);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono font-semibold text-primary">{s.invoiceNo}</TableCell>
                      <TableCell className="font-medium">{s.customerName || 'Customer'}</TableCell>
                      <TableCell className="font-mono text-xs">{s.customerGstin || 'B2C'}</TableCell>
                      <TableCell className="text-right font-medium">{formatSystemAmount(Number(s.subtotal) || 0)}</TableCell>
                      <TableCell className="text-right text-xs">{formatSystemAmount(Number(s.cgst) || 0)}</TableCell>
                      <TableCell className="text-right text-xs">{formatSystemAmount(Number(s.sgst) || 0)}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{formatSystemAmount(itemGst)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
