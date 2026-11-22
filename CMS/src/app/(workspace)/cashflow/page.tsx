'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatSystemAmount } from '@/lib/currency';
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  TrendingUp,
  TrendingDown,
  DollarSign,
  Printer,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

export default function CashflowPage() {
  const { data: accountingData, isLoading } = useQuery<any>({
    queryKey: ['cashflow-statement'],
    queryFn: async () => {
      const res = await api.get<any>('/api/accounting/dashboard');
      return res.data;
    },
  });

  const { data: journals = [] } = useQuery<any[]>({
    queryKey: ['cashflow-journal-entries'],
    queryFn: async () => {
      const res = await api.get<any>('/api/accounting/journal-entries?limit=50');
      return Array.isArray(res.data) ? res.data : res.data?.entries || res.data?.data || [];
    },
  });

  const totalInflow = accountingData?.totalRevenue || 0;
  const totalOutflow = accountingData?.totalExpenses || 0;
  const netCashFlow = totalInflow - totalOutflow;

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Cash Flow Statement</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Operational, financing, and investing cash activities audited in real time.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print Cash Flow
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Total Cash Inflow</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">{formatSystemAmount(totalInflow)}</h3>
              <p className="text-xs text-muted-foreground mt-1">Collections & Sales</p>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Total Cash Outflow</p>
              <h3 className="text-2xl font-bold mt-1 text-red-600">{formatSystemAmount(totalOutflow)}</h3>
              <p className="text-xs text-muted-foreground mt-1">Purchases & Payroll</p>
            </div>
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 rounded-lg text-red-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Net Cash Position</p>
              <h3 className={`text-2xl font-bold mt-1 ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatSystemAmount(netCashFlow)}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Net Operating Liquidity</p>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Audited Cash Movement Log</CardTitle>
          <CardDescription>Live journal transactions settling against company bank accounts.</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Ref ID</TableHead>
                <TableHead>Description / Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Posting Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Calculating cash movements...</TableCell>
                </TableRow>
              ) : journals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No cashflow movements logged.</TableCell>
                </TableRow>
              ) : (
                journals.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-mono font-semibold text-primary">
                      {j.entryNumber || `CF-${j.id.slice(0, 6)}`}
                    </TableCell>
                    <TableCell className="font-medium">{j.description || j.memo || 'General Settlement'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-mono uppercase">
                        {j.type || 'OPERATING'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(j.postingDate || j.date || j.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-bold text-gray-900 dark:text-gray-100">
                      {formatSystemAmount(Number(j.amount || j.totalDebit || 0))}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default">POSTED</Badge>
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
