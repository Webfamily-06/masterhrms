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
  TrendingUp,
  Printer,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

export default function IncomeExpensePage() {
  const { data: summary, isLoading } = useQuery<any>({
    queryKey: ['income-expense-summary'],
    queryFn: async () => {
      const res = await api.get<any>('/api/accounting/dashboard');
      return res.data;
    },
  });

  const totalIncome = summary?.totalRevenue || 0;
  const totalExpense = summary?.totalExpenses || 0;
  const variance = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Income & Expense Analysis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Operational budget efficiency, expense burns, and revenue yields.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print Comparison
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Total Income</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">{formatSystemAmount(totalIncome)}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Total Expense</p>
              <h3 className="text-2xl font-bold mt-1 text-red-600">{formatSystemAmount(totalExpense)}</h3>
            </div>
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 rounded-lg text-red-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Operating Variance</p>
              <h3 className={`text-2xl font-bold mt-1 ${variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatSystemAmount(variance)}
              </h3>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Fiscal Period</TableHead>
                <TableHead className="text-right">Gross Income</TableHead>
                <TableHead className="text-right">Total Expense</TableHead>
                <TableHead className="text-right">Net Variance</TableHead>
                <TableHead className="text-center">Operating Health</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold">Current Fiscal Quarter (Q3)</TableCell>
                <TableCell className="text-right text-emerald-600 font-bold">{formatSystemAmount(totalIncome)}</TableCell>
                <TableCell className="text-right text-red-600 font-bold">{formatSystemAmount(totalExpense)}</TableCell>
                <TableCell className={`text-right font-bold ${variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatSystemAmount(variance)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={variance >= 0 ? 'default' : 'destructive'}>
                    {variance >= 0 ? 'SURPLUS' : 'DEFICIT'}
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
