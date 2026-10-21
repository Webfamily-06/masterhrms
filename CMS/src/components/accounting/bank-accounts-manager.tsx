import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, pastelCardTokens } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatSystemAmount } from "@/lib/currency";
import { cn } from "@/lib/utils";
import {
  Landmark,
  ArrowRightLeft,
  Wallet,
  Building2,
  TrendingUp,
  CreditCard,
  Plus,
} from "lucide-react";

export interface BankAccountItem {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  category?: string;
  balance: number;
  description?: string;
  isBankOrCash?: boolean;
}

export interface BankAccountsManagerProps {
  accounts: BankAccountItem[];
  isLoading?: boolean;
  onExecuteTransfer: (transferData: {
    fromAccount: string;
    toAccount: string;
    amount: string;
    reference?: string;
    notes?: string;
  }) => Promise<any> | void;
  isTransferring?: boolean;
}

export function BankAccountsManager({
  accounts = [],
  isLoading = false,
  onExecuteTransfer,
  isTransferring = false,
}: BankAccountsManagerProps) {
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Bank & Cash accounts are asset accounts with code 10xx or category current_asset
  const bankAccounts = accounts.filter(
    (a) =>
      a.accountType === "asset" &&
      (a.accountCode?.startsWith("10") ||
        a.category === "current_asset" ||
        a.isBankOrCash ||
        a.accountName?.toLowerCase().includes("bank") ||
        a.accountName?.toLowerCase().includes("cash"))
  );

  const [transferForm, setTransferForm] = useState({
    fromAccount: bankAccounts[0]?.id || "",
    toAccount: bankAccounts[1]?.id || "",
    amount: "",
    reference: "",
    notes: "",
  });

  // Calculate cumulative liquidity
  const totalLiquidity = bankAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  const primaryAccount = bankAccounts[0];

  const handleOpenTransfer = (defaultFromId?: string) => {
    if (defaultFromId) {
      const target = bankAccounts.find((a) => a.id !== defaultFromId);
      setTransferForm({
        fromAccount: defaultFromId,
        toAccount: target ? target.id : "",
        amount: "",
        reference: `TRF-${Date.now().toString().slice(-6)}`,
        notes: "",
      });
    } else {
      setTransferForm({
        fromAccount: bankAccounts[0]?.id || "",
        toAccount: bankAccounts[1]?.id || "",
        amount: "",
        reference: `TRF-${Date.now().toString().slice(-6)}`,
        notes: "",
      });
    }
    setIsTransferModalOpen(true);
  };

  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !transferForm.fromAccount ||
      !transferForm.toAccount ||
      !transferForm.amount ||
      parseFloat(transferForm.amount) <= 0 ||
      transferForm.fromAccount === transferForm.toAccount
    ) {
      return;
    }
    await onExecuteTransfer(transferForm);
    setIsTransferModalOpen(false);
    setTransferForm({
      fromAccount: bankAccounts[0]?.id || "",
      toAccount: bankAccounts[1]?.id || "",
      amount: "",
      reference: "",
      notes: "",
    });
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Liquidity Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Liquid Vaults (Pastel Blue) */}
        <Card className={cn("p-4 border shadow-2xs", pastelCardTokens.blue)}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Total Liquidity</span>
            <Wallet className="size-4" />
          </div>
          <div className="text-2xl font-black font-mono mt-2 tracking-tight">
            {formatSystemAmount(totalLiquidity)}
          </div>
          <p className="text-[11px] opacity-80 mt-0.5">Across {bankAccounts.length} operational vaults</p>
        </Card>

        {/* Card 2: Primary Vault (Pastel Green) */}
        <Card className={cn("p-4 border shadow-2xs", pastelCardTokens.green)}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Primary Account</span>
            <Landmark className="size-4" />
          </div>
          <div className="text-2xl font-black font-mono mt-2 tracking-tight">
            {formatSystemAmount(primaryAccount ? Number(primaryAccount.balance) || 0 : 0)}
          </div>
          <p className="text-[11px] opacity-80 mt-0.5 line-clamp-1">
            {primaryAccount ? `${primaryAccount.accountName} (${primaryAccount.accountCode})` : "No primary vault"}
          </p>
        </Card>

        {/* Card 3: Quick Action (Pastel Purple) */}
        <Card className={cn("p-4 border shadow-2xs flex flex-col justify-between", pastelCardTokens.purple)}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Internal Transfers</span>
            <ArrowRightLeft className="size-4" />
          </div>
          <div className="pt-2">
            <Button
              onClick={() => handleOpenTransfer()}
              size="sm"
              className="w-full h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs"
            >
              <ArrowRightLeft className="size-3.5" /> Execute Transfer
            </Button>
          </div>
        </Card>
      </div>

      {/* Vaults Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Operational Bank & Cash Accounts</h3>
            <p className="text-xs text-muted-foreground">
              Checking, savings, credit line, and petty cash repositories with double-entry ledger integration.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenTransfer()}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            <ArrowRightLeft className="size-3.5" /> Transfer Funds
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankAccounts.map((bankAcc, index) => {
            // Assign gradient accent based on index
            const gradientAccents = [
              pastelCardTokens.blue,
              pastelCardTokens.green,
              pastelCardTokens.orange,
              pastelCardTokens.purple,
            ];
            const token = gradientAccents[index % gradientAccents.length];

            return (
              <Card
                key={bankAcc.id}
                className="border shadow-xs p-4.5 space-y-3 bg-card hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] font-bold font-mono">
                    {bankAcc.accountCode}
                  </Badge>
                  <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Landmark className="size-3.5" />
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-foreground leading-snug">
                    {bankAcc.accountName}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                    {bankAcc.description || "Active Operating Vault"}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Current Balance</span>
                  <div className="text-xl font-black font-mono tracking-tight text-foreground">
                    {formatSystemAmount(Number(bankAcc.balance) || 0)}
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between border-t text-[11px]">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500 inline-block" /> Active Vault
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenTransfer(bankAcc.id)}
                    className="h-6 text-[10px] px-2 text-primary hover:bg-primary/10 font-bold"
                  >
                    Transfer <ArrowRightLeft className="size-3 ml-1" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* INTERNAL BANK TRANSFER MODAL */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <ArrowRightLeft className="size-4 text-primary" /> Internal Bank / Cash Transfer
            </DialogTitle>
            <DialogDescription className="text-xs">
              Transfer funds between checking, savings, and petty cash vaults with double-entry audit.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitTransfer} className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>From Account *</Label>
                <Select
                  value={transferForm.fromAccount}
                  onValueChange={(val) => setTransferForm({ ...transferForm, fromAccount: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Source Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="text-xs">
                        {a.accountCode} - {a.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>To Account *</Label>
                <Select
                  value={transferForm.toAccount}
                  onValueChange={(val) => setTransferForm({ ...transferForm, toAccount: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Target Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="text-xs">
                        {a.accountCode} - {a.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {transferForm.fromAccount === transferForm.toAccount && transferForm.fromAccount !== "" && (
              <p className="text-[10px] text-destructive font-medium">
                Source and target accounts must be different.
              </p>
            )}

            <div className="space-y-1">
              <Label>Transfer Amount *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 25000"
                value={transferForm.amount}
                onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                className="h-8 text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <Label>Reference Number</Label>
              <Input
                placeholder="e.g. TRF-90214"
                value={transferForm.reference}
                onChange={(e) => setTransferForm({ ...transferForm, reference: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label>Reference Note / Purpose</Label>
              <Input
                placeholder="e.g. Weekly Petty Cash Replenishment"
                value={transferForm.notes}
                onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsTransferModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  isTransferring ||
                  !transferForm.amount ||
                  parseFloat(transferForm.amount) <= 0 ||
                  transferForm.fromAccount === transferForm.toAccount ||
                  !transferForm.fromAccount ||
                  !transferForm.toAccount
                }
                className="bg-primary text-primary-foreground font-semibold"
              >
                {isTransferring ? "Executing Transfer..." : "Process Transfer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BankAccountsManager;
