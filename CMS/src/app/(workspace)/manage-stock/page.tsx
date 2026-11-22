'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Package,
  Search,
  Printer,
  AlertTriangle,
  Boxes,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

export default function ManageStockPage() {
  const [search, setSearch] = useState('');

  const { data: productsData, isLoading } = useQuery<any>({
    queryKey: ['manage-stock-products'],
    queryFn: async () => {
      const res = await api.get<any>('/api/products?limit=100');
      return res.data;
    },
  });

  const products = Array.isArray(productsData?.products)
    ? productsData.products
    : Array.isArray(productsData)
    ? productsData
    : [];

  const filtered = useMemo(() => {
    return products.filter((p: any) => {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    });
  }, [products, search]);

  const totalStockQty = products.reduce((acc: number, p: any) => {
    const qty = p.stocks?.reduce((s: number, st: any) => s + (Number(st.quantity) || 0), 0) || 0;
    return acc + qty;
  }, 0);

  const lowStockCount = products.filter((p: any) => {
    const qty = p.stocks?.reduce((s: number, st: any) => s + (Number(st.quantity) || 0), 0) || 0;
    return qty <= (p.lowStockThreshold || 5);
  }).length;

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Manage Stock & On-Hand Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Live multi-warehouse stock balances, bin levels, and reorder alerts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-4 h-4" /> Print Valuation
          </Button>
          <Link href="/adjustments">
            <Button size="sm" className="gap-1.5 bg-primary">
              <Plus className="w-4 h-4" /> Adjust Stock
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Tracked Products</p>
              <h3 className="text-2xl font-bold mt-1">{products.length}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600">
              <Package className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Total Units On Hand</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">{totalStockQty.toLocaleString()} Units</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600">
              <Boxes className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Low Stock Alerts</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600">{lowStockCount}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search product name, SKU, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">On Hand Qty</TableHead>
                <TableHead className="text-right">Threshold</TableHead>
                <TableHead className="text-center">Stock Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Loading stock inventory...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No stock items found.</TableCell>
                </TableRow>
              ) : (
                filtered.map((p: any) => {
                  const qty = p.stocks?.reduce((s: number, st: any) => s + (Number(st.quantity) || 0), 0) || 0;
                  const isLow = qty <= (p.lowStockThreshold || 5);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</div>
                        <div className="text-xs text-muted-foreground">Barcode: {p.barcode || 'N/A'}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                      <TableCell className="text-xs">{p.category?.name || 'General'}</TableCell>
                      <TableCell className="text-right font-bold text-base">
                        {qty} {p.unit?.shortName || 'pcs'}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-xs">
                        {p.lowStockThreshold || 5} pcs
                      </TableCell>
                      <TableCell className="text-center">
                        {qty === 0 ? (
                          <Badge variant="destructive">Out of Stock</Badge>
                        ) : isLow ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">Low Stock</Badge>
                        ) : (
                          <Badge variant="default">In Stock</Badge>
                        )}
                      </TableCell>
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
