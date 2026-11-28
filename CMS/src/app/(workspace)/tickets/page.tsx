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
  LifeBuoy,
  Plus,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';

export default function TicketsPage() {
  const { data: ticketsData, isLoading } = useQuery<any>({
    queryKey: ['helpdesk-tickets-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/helpdesk/tickets?limit=50');
      return (res as any)?.data ?? res;
    },
  });

  const tickets = Array.isArray(ticketsData?.tickets)
    ? ticketsData.tickets
    : Array.isArray(ticketsData)
    ? ticketsData
    : [];

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Support Desk & Service Tickets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage customer support requests, engineer dispatch, and ticket resolution times.</p>
        </div>
        <Link href="/helpdesk">
          <Button size="sm" className="gap-1.5 bg-primary">
            <Plus className="w-4 h-4" /> New Ticket
          </Button>
        </Link>
      </div>

      <Card className="border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Ticket Ref</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Loading tickets...</TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No support tickets opened.</TableCell>
                </TableRow>
              ) : (
                tickets.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono font-bold text-primary">{t.ticketNo || `TKT-${t.id.slice(0, 6)}`}</TableCell>
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">{t.subject || t.title}</TableCell>
                    <TableCell>
                      <Badge variant={t.priority === 'HIGH' || t.priority === 'CRITICAL' ? 'destructive' : 'secondary'}>
                        {t.priority || 'NORMAL'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={t.status === 'RESOLVED' || t.status === 'CLOSED' ? 'default' : 'outline'}>
                        {t.status || 'OPEN'}
                      </Badge>
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
