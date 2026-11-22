'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatSystemAmount } from '@/lib/currency';
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Barcode,
  Printer,
  Search,
  Check,
} from 'lucide-react';

export default function BarcodePrintPage() {
  const [search, setSearch] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [copies, setCopies] = useState(2);

  const { data: productsData, isLoading } = useQuery<any>({
    queryKey: ['barcode-products'],
    queryFn: async () => {
      const res = await api.get<any>('/api/products?limit=50');
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

  const toggleSelect = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedProducts = products.filter((p: any) => selectedProductIds.includes(p.id));

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Barcode Generation & Thermal Print</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Generate standard Code-128 and EAN barcodes for thermal shelf labels.</p>
        </div>
        <Button
          onClick={() => window.print()}
          disabled={selectedProducts.length === 0}
          className="gap-1.5 bg-primary"
        >
          <Printer className="w-4 h-4" /> Print Selected Barcodes ({selectedProducts.length})
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border">
            <div className="p-4 border-b border-border flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search products to generate barcode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProductIds(filtered.map((p: any) => p.id))}
              >
                Select All
              </Button>
            </div>

            <div className="overflow-x-auto max-h-[450px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-12 text-center">Select</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Barcode Number</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Loading products...</TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No products found.</TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((p: any) => {
                      const isSelected = selectedProductIds.includes(p.id);
                      return (
                        <TableRow
                          key={p.id}
                          className={"cursor-pointer" + (isSelected ? " bg-primary/5" : "")}
                          onClick={() => toggleSelect(p.id)}
                        >
                          <TableCell className="text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(p.id)}
                              className="rounded border-gray-300"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                          <TableCell className="font-mono text-xs text-primary">{p.barcode || p.sku}</TableCell>
                          <TableCell className="text-right font-medium">{formatSystemAmount(Number(p.salePrice) || 0)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        <div>
          <Card className="border-border print:border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Print Preview Sheet</CardTitle>
              <CardDescription>Paper preview before printing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Copies per product</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))}
                />
              </div>

              <div className="border border-dashed border-border rounded-lg p-4 space-y-3 bg-muted/20 min-h-[250px]">
                {selectedProducts.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-center text-muted-foreground">
                    <Barcode className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-xs">Select products from the table to preview barcode stickers.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 print:grid-cols-3">
                    {selectedProducts.flatMap((p: any) =>
                      Array.from({ length: copies }).map((_, i) => (
                        <div key={`${p.id}-${i}`} className="border border-black p-2 rounded bg-white text-black text-center">
                          <div className="text-[10px] font-bold truncate">{p.name}</div>
                          <div className="my-1 flex justify-center">
                            <Barcode className="w-24 h-8" />
                          </div>
                          <div className="text-[9px] font-mono tracking-widest">{p.barcode || p.sku}</div>
                          <div className="text-[10px] font-bold mt-0.5">{formatSystemAmount(Number(p.salePrice) || 0)}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
