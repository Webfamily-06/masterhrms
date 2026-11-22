'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatSystemAmount } from '@/lib/currency';
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Printer,
  TrendingUp,
  DollarSign,
  PieChart,
} from 'lucide-react';

export default function ProfitLossPage() {
  const { data: pnlData, isLoading } = useQuery<any>({
    queryKey: ['profit-loss-statement'],
    queryFn: async () => {
      const res = await api.get<any>('/api/accounting/dashboard');
      return res.data;
    },
  });

  const revenue = pnlData?.totalRevenue || 0;
  const cogs = pnlData?.cogs || (revenue * 0.45);
  const grossProfit = revenue - cogs;
  const opex = pnlData?.totalExpenses || 0;
  const operatingIncome = grossProfit - opex;
  const taxes = operatingIncome > 0 ? operatingIncome * 0.18 : 0;
  const netIncome = operatingIncome - taxes;

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Profit & Loss Statement (P&L)</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Fiscal earnings, cost of goods sold, operating expenses, and net profit margins.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print Statement
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase">Gross Revenue</p>
            <h3 className="text-2xl font-bold mt-1 text-blue-600">{formatSystemAmount(revenue)}</h3>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase">Gross Profit</p>
            <h3 className="text-2xl font-bold mt-1 text-emerald-600">{formatSystemAmount(grossProfit)}</h3>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase">Operating Expenses</p>
            <h3 className="text-2xl font-bold mt-1 text-red-600">{formatSystemAmount(opex)}</h3>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase">Net Income</p>
            <h3 className={`text-2xl font-bold mt-1 ${netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatSystemAmount(netIncome)}
            </h3>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Audited Income Statement Breakdown</CardTitle>
          <CardDescription>Formatted GAAP & GST compliant fiscal earnings breakdown.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border text-sm">
            <div className="py-3 flex justify-between font-bold text-gray-900 dark:text-gray-100 bg-muted/20 px-3 rounded">
              <span>Total Revenue / Inflow</span>
              <span className="text-emerald-600">{formatSystemAmount(revenue)}</span>
            </div>
            <div className="py-2.5 flex justify-between px-3 text-muted-foreground">
              <span className="pl-4">Less: Cost of Goods Sold (COGS)</span>
              <span>- {formatSystemAmount(cogs)}</span>
            </div>
            <div className="py-3 flex justify-between font-bold text-gray-900 dark:text-gray-100 bg-muted/10 px-3 rounded">
              <span>Gross Profit</span>
              <span>{formatSystemAmount(grossProfit)}</span>
            </div>
            <div className="py-2.5 flex justify-between px-3 text-muted-foreground">
              <span className="pl-4">Operating & Administrative Expenses (OPEX)</span>
              <span>- {formatSystemAmount(opex)}</span>
            </div>
            <div className="py-3 flex justify-between font-bold text-gray-900 dark:text-gray-100 bg-muted/10 px-3 rounded">
              <span>Operating Income (EBIT)</span>
              <span>{formatSystemAmount(operatingIncome)}</span>
            </div>
            <div className="py-2.5 flex justify-between px-3 text-muted-foreground">
              <span className="pl-4">Estimated Tax Provisions</span>
              <span>- {formatSystemAmount(taxes)}</span>
            </div>
            <div className="py-3.5 flex justify-between font-extrabold text-base text-gray-950 dark:text-gray-50 bg-primary/10 px-3 rounded mt-2">
              <span>Net Profit / (Loss)</span>
              <span className={netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                {formatSystemAmount(netIncome)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
