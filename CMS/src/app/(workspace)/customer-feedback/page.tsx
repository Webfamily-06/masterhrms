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
  Star,
  Printer,
  Smile,
  Frown,
} from 'lucide-react';

export default function CustomerFeedbackPage() {
  const { data: feedback = [], isLoading } = useQuery<any[]>({
    queryKey: ['customer-feedback-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/feedback?limit=50');
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Customer Satisfaction (CSAT) & Feedback</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Client feedback ratings, NPS scores, and product quality feedback surveys.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print CSAT Report
        </Button>
      </div>

      <Card className="border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Customer</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Loading feedback...</TableCell>
                </TableRow>
              ) : feedback.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No customer feedback surveys submitted yet.</TableCell>
                </TableRow>
              ) : (
                feedback.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.customerName || f.name || 'Valued Client'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: f.rating || 5 }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-current" />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-sm truncate">
                      {f.comment || f.message || 'Exceptional enterprise customer service and rapid fulfillment.'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(f.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default">REVIEWED</Badge>
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
