import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface LineItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
  discountType?: "fixed" | "percentage";
  hsnSac?: string;
  productId?: string;
  total?: number;
}

export interface LineItemRepeaterProps {
  value: LineItem[];
  onChange: (items: LineItem[]) => void;
  availableProducts?: any[];
  allowDiscounts?: boolean;
  allowDescriptions?: boolean;
  minItems?: number;
  currency?: string;
  showSummary?: boolean;
  className?: string;
}

export function LineItemRepeater({
  value = [],
  onChange,
  availableProducts = [],
  allowDiscounts = true,
  allowDescriptions = true,
  minItems = 1,
  className = "",
}: LineItemRepeaterProps) {
  const handleItemChange = (index: number, field: keyof LineItem, val: any) => {
    const updated = [...value];
    updated[index] = { ...updated[index], [field]: val };

    // Auto-fill product details if productId changes
    if (field === "productId" && val) {
      const selected = availableProducts.find((p) => p.id === val);
      if (selected) {
        updated[index].name = selected.name || selected.title || "";
        updated[index].unitPrice = Number(selected.sellingPrice || selected.price || 0);
        if (selected.hsnSac) updated[index].hsnSac = selected.hsnSac;
        if (selected.taxRate) updated[index].taxRate = Number(selected.taxRate);
      }
    }

    onChange(updated);
  };

  const addItem = () => {
    const newItem: LineItem = {
      id: `line_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: 18,
      discount: 0,
      discountType: "fixed",
      hsnSac: "",
    };
    onChange([...value, newItem]);
  };

  const removeItem = (index: number) => {
    if (value.length <= minItems) return;
    const updated = value.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/40 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
              <th className="py-2.5 px-3 text-left">Item / Description</th>
              <th className="py-2.5 px-2 text-left w-24">HSN / SAC</th>
              <th className="py-2.5 px-2 text-right w-20">Qty</th>
              <th className="py-2.5 px-2 text-right w-28">Unit Price</th>
              {allowDiscounts && <th className="py-2.5 px-2 text-right w-24">Disc</th>}
              <th className="py-2.5 px-2 text-right w-20">Tax %</th>
              <th className="py-2.5 px-3 text-right w-28">Total</th>
              <th className="py-2.5 px-2 text-center w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {value.map((item, idx) => {
              const qty = Number(item.quantity || 0);
              const price = Number(item.unitPrice || 0);
              const gross = qty * price;
              let disc = Number(item.discount || 0);
              if (item.discountType === "percentage") {
                disc = (gross * disc) / 100;
              }
              const taxable = Math.max(0, gross - disc);
              const tax = (taxable * Number(item.taxRate || 0)) / 100;
              const rowTotal = taxable + tax;

              return (
                <tr key={item.id || idx} className="hover:bg-muted/20">
                  <td className="py-2 px-3 align-top">
                    {availableProducts.length > 0 && (
                      <div className="mb-1">
                        <Select
                          value={item.productId || ""}
                          onValueChange={(val) => handleItemChange(idx, "productId", val)}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Select product or service..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableProducts.map((p) => (
                              <SelectItem key={p.id} value={p.id} className="text-xs">
                                {p.name || p.title} (₹{p.sellingPrice || p.price || 0})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Input
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                      className="h-7 text-xs mb-1 font-medium"
                    />
                    {allowDescriptions && (
                      <Input
                        placeholder="Description (optional)"
                        value={item.description || ""}
                        onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                        className="h-6 text-[11px] text-muted-foreground"
                      />
                    )}
                  </td>
                  <td className="py-2 px-2 align-top">
                    <Input
                      placeholder="HSN"
                      value={item.hsnSac || ""}
                      onChange={(e) => handleItemChange(idx, "hsnSac", e.target.value)}
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="py-2 px-2 align-top">
                    <Input
                      type="number"
                      min="0.01"
                      step="any"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(idx, "quantity", parseFloat(e.target.value) || 0)
                      }
                      className="h-7 text-xs text-right"
                    />
                  </td>
                  <td className="py-2 px-2 align-top">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={item.unitPrice}
                      onChange={(e) =>
                        handleItemChange(idx, "unitPrice", parseFloat(e.target.value) || 0)
                      }
                      className="h-7 text-xs text-right"
                    />
                  </td>
                  {allowDiscounts && (
                    <td className="py-2 px-2 align-top">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={item.discount || 0}
                        onChange={(e) =>
                          handleItemChange(idx, "discount", parseFloat(e.target.value) || 0)
                        }
                        className="h-7 text-xs text-right"
                      />
                    </td>
                  )}
                  <td className="py-2 px-2 align-top">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={item.taxRate ?? 18}
                      onChange={(e) =>
                        handleItemChange(idx, "taxRate", parseFloat(e.target.value) || 0)
                      }
                      className="h-7 text-xs text-right"
                    />
                  </td>
                  <td className="py-2 px-3 align-top text-right font-medium text-xs pt-3">
                    ₹{rowTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-2 align-top text-center pt-2.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(idx)}
                      disabled={value.length <= minItems}
                      className="size-6 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        className="h-8 text-xs font-medium gap-1 text-primary hover:text-primary"
      >
        <Plus className="size-3.5" /> Add Line Item
      </Button>
    </div>
  );
}
