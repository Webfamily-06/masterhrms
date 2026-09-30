import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DataTable, Column } from "@/components/ui/data-table";
import { formatSystemAmount } from "@/lib/currency";
import { Plus, Search, FileText, Layers, CheckCircle2 } from "lucide-react";

export interface AccountItem {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: "asset" | "liability" | "equity" | "revenue" | "expense" | string;
  category?: string;
  balance: number;
  description?: string;
  isBankOrCash?: boolean;
  isActive?: boolean;
}

export interface ChartOfAccountsTableProps {
  accounts: AccountItem[];
  isLoading?: boolean;
  onSelectLedgerAccount: (accountId: string) => void;
  onCreateAccount: (accountData: {
    accountCode: string;
    accountName: string;
    accountType: string;
    category?: string;
    description?: string;
    balance: string;
  }) => Promise<any> | void;
  isCreating?: boolean;
}

export function ChartOfAccountsTable({
  accounts = [],
  isLoading = false,
  onSelectLedgerAccount,
  onCreateAccount,
  isCreating = false,
}: ChartOfAccountsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    accountCode: "",
    accountName: "",
    accountType: "asset",
    category: "current_asset",
    description: "",
    balance: "0",
  });

  // Filter accounts by type & classification
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchesType = typeFilter === "all" || acc.accountType === typeFilter;
      return matchesType;
    });
  }, [accounts, typeFilter]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountCode.trim() || !form.accountName.trim()) return;
    await onCreateAccount(form);
    setIsModalOpen(false);
    setForm({
      accountCode: "",
      accountName: "",
      accountType: "asset",
      category: "current_asset",
      description: "",
      balance: "0",
    });
  };

  // Define Columns for DataTable
  const columns: Column<AccountItem>[] = [
    {
      key: "accountCode",
      header: "Code",
      sortable: true,
      className: "w-[120px]",
      render: (val, row) => (
        <button
          type="button"
          onClick={() => onSelectLedgerAccount(row.id)}
          className="font-mono font-bold text-primary hover:underline text-left"
          title="View General Ledger Statement"
        >
          {val}
        </button>
      ),
    },
    {
      key: "accountName",
      header: "Account Name",
      sortable: true,
      render: (val, row) => (
        <div>
          <button
            type="button"
            onClick={() => onSelectLedgerAccount(row.id)}
            className="font-semibold text-foreground hover:underline text-left block"
            title="View General Ledger Statement"
          >
            {val}
          </button>
          {row.description && (
            <span className="text-[10px] text-muted-foreground line-clamp-1">
              {row.description}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "accountType",
      header: "Classification",
      sortable: true,
      className: "w-[140px]",
      render: (val) => {
        const typeStr = String(val).toLowerCase();
        let badgeStyle = "bg-muted text-muted-foreground";
        if (typeStr === "asset") badgeStyle = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
        else if (typeStr === "liability") badgeStyle = "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800";
        else if (typeStr === "revenue") badgeStyle = "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800";
        else if (typeStr === "equity" || typeStr === "expense") badgeStyle = "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800";

        return (
          <Badge variant="outline" className={`text-[10px] capitalize font-semibold ${badgeStyle}`}>
            {val}
          </Badge>
        );
      },
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      className: "w-[150px]",
      render: (val) => (
        <span className="text-muted-foreground capitalize text-xs">
          {val ? String(val).replace("_", " ") : "General"}
        </span>
      ),
    },
    {
      key: "balance",
      header: "Current Balance",
      sortable: true,
      align: "right",
      className: "w-[150px]",
      render: (val) => (
        <span className="font-mono font-bold text-foreground">
          {formatSystemAmount(Number(val) || 0)}
        </span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      align: "center",
      className: "w-[90px]",
      render: () => (
        <Badge className="text-[9px] bg-emerald-500 text-white font-bold py-0 h-4">
          Active
        </Badge>
      ),
    },
    {
      key: "id",
      header: "Statement",
      align: "right",
      className: "w-[100px]",
      render: (_, row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onSelectLedgerAccount(row.id)}
          className="h-6 text-[10px] px-2 gap-1 text-primary hover:bg-primary/10 border-primary/20"
        >
          <FileText className="size-3" /> Ledger
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search account code or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="asset">Assets (1000–1999)</SelectItem>
              <SelectItem value="liability">Liabilities (2000–2999)</SelectItem>
              <SelectItem value="equity">Equity (3000–3999)</SelectItem>
              <SelectItem value="revenue">Revenue (4000–4999)</SelectItem>
              <SelectItem value="expense">Expenses (5000–6999)</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="h-8 text-xs font-bold gap-1 bg-primary"
          >
            <Plus className="size-3.5" /> New Account
          </Button>
        </div>
      </div>

      {/* Standardized DataTable */}
      <DataTable
        data={filteredAccounts}
        columns={columns}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        showPagination={true}
        pageSize={15}
        pageSizeOptions={[15, 30, 50, 100]}
        loading={isLoading}
        emptyTitle="No Chart of Accounts Found"
        emptyMessage="No ledger accounts match your selected classification or search query."
      />

      {/* CREATE ACCOUNT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Plus className="size-4 text-primary" /> Create New Account
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add an account to the 5-tier General Ledger Chart of Accounts.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Account Code *</Label>
                <Input
                  placeholder="e.g. 1050"
                  value={form.accountCode}
                  onChange={(e) => setForm({ ...form, accountCode: e.target.value })}
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Account Classification *</Label>
                <Select
                  value={form.accountType}
                  onValueChange={(val) => setForm({ ...form, accountType: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Asset (1000–1999)</SelectItem>
                    <SelectItem value="liability">Liability (2000–2999)</SelectItem>
                    <SelectItem value="equity">Equity (3000–3999)</SelectItem>
                    <SelectItem value="revenue">Revenue (4000–4999)</SelectItem>
                    <SelectItem value="expense">Expense (5000–6999)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Account Title / Name *</Label>
              <Input
                placeholder="e.g. ICICI Bank Primary Operating A/C"
                value={form.accountName}
                onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label>Description / Purpose</Label>
              <Input
                placeholder="e.g. Current account for operational inflows"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label>Opening Balance</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreating || !form.accountCode || !form.accountName}
              >
                {isCreating ? "Creating..." : "Save Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ChartOfAccountsTable;
