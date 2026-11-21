import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
import crypto from "crypto";

const db = rawPrisma || proxiedPrisma;

export type RetainerStatus = "ACTIVE" | "DEPLETED" | "CLOSED";
export type RetainerTransactionType = "DEPOSIT" | "DRAWDOWN";

export interface RetainerTransaction {
  id: string;
  date: string;
  type: RetainerTransactionType;
  amount: number;
  description: string;
  milestoneId?: string | null;
  invoiceId?: string | null;
  createdAt: string;
}

export interface RetainerAgreement {
  id: string;
  tenantId: string;
  retainerNo: string;
  clientId: string;
  clientName: string;
  title: string;
  totalAmount: number;
  advanceBalance: number;
  drawnAmount: number;
  startDate: string;
  endDate: string;
  status: RetainerStatus;
  notes?: string | null;
  transactions: RetainerTransaction[];
  createdAt: string;
  updatedAt: string;
}

export class RetainerService {
  private static async getAgreements(tenantId: string): Promise<RetainerAgreement[]> {
    const setting = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "finance", key: "retainer_agreements" },
    });
    if (setting && (setting.valueJson as any)?.items) {
      return (setting.valueJson as any).items;
    }
    return [];
  }

  private static async saveAgreements(tenantId: string, items: RetainerAgreement[]): Promise<void> {
    const existing = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "finance", key: "retainer_agreements" },
    });
    if (existing) {
      await db.setting.update({
        where: { id: existing.id },
        data: { valueJson: { items } as any, version: { increment: 1 } },
      });
    } else {
      await db.setting.create({
        data: {
          scope: "TENANT",
          scopeId: tenantId,
          group: "finance",
          key: "retainer_agreements",
          valueType: "JSON",
          valueJson: { items } as any,
          version: 1,
        },
      });
    }
  }

  /**
   * List retainer agreements for a tenant
   */
  static async list(
    tenantId: string,
    filters?: { status?: RetainerStatus; clientId?: string }
  ): Promise<RetainerAgreement[]> {
    let agreements = await this.getAgreements(tenantId);
    if (filters?.status) {
      agreements = agreements.filter((a) => a.status === filters.status);
    }
    if (filters?.clientId) {
      agreements = agreements.filter((a) => a.clientId === filters.clientId);
    }
    return agreements;
  }

  /**
   * Get retainer agreement by ID
   */
  static async getById(tenantId: string, id: string): Promise<RetainerAgreement | null> {
    const agreements = await this.getAgreements(tenantId);
    return agreements.find((a) => a.id === id) || null;
  }

  /**
   * Create a new retainer agreement
   */
  static async create(
    tenantId: string,
    data: {
      clientId: string;
      clientName: string;
      title: string;
      totalAmount: number;
      startDate: string;
      endDate: string;
      notes?: string;
    }
  ): Promise<RetainerAgreement> {
    const agreements = await this.getAgreements(tenantId);
    const id = `ret_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const count = agreements.length + 1;
    const retainerNo = `RET-${String(count).padStart(4, "0")}`;
    const now = new Date().toISOString();

    const initialTx: RetainerTransaction = {
      id: `tx_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`,
      date: now.split("T")[0],
      type: "DEPOSIT",
      amount: data.totalAmount,
      description: "Initial Retainer Advance Deposit",
      createdAt: now,
    };

    const newAgreement: RetainerAgreement = {
      id,
      tenantId,
      retainerNo,
      clientId: data.clientId,
      clientName: data.clientName,
      title: data.title,
      totalAmount: data.totalAmount,
      advanceBalance: data.totalAmount,
      drawnAmount: 0,
      startDate: data.startDate,
      endDate: data.endDate,
      status: "ACTIVE",
      notes: data.notes || null,
      transactions: [initialTx],
      createdAt: now,
      updatedAt: now,
    };

    agreements.unshift(newAgreement);
    await this.saveAgreements(tenantId, agreements);
    return newAgreement;
  }

  /**
   * Drawdown funds against an active retainer agreement
   */
  static async drawdown(
    tenantId: string,
    id: string,
    data: {
      amount: number;
      description: string;
      milestoneId?: string;
      invoiceId?: string;
    }
  ): Promise<RetainerAgreement> {
    const agreements = await this.getAgreements(tenantId);
    const agreement = agreements.find((a) => a.id === id);
    if (!agreement) {
      throw new Error("Retainer agreement not found.");
    }
    if (agreement.status === "CLOSED") {
      throw new Error("Cannot drawdown against a closed retainer agreement.");
    }
    if (data.amount <= 0) {
      throw new Error("Drawdown amount must be greater than zero.");
    }
    if (agreement.advanceBalance < data.amount) {
      throw new Error(
        `Insufficient retainer balance. Available: ${agreement.advanceBalance}, requested: ${data.amount}`
      );
    }

    const now = new Date().toISOString();
    const newBalance = Math.round((agreement.advanceBalance - data.amount) * 100) / 100;
    const newDrawn = Math.round((agreement.drawnAmount + data.amount) * 100) / 100;

    const tx: RetainerTransaction = {
      id: `tx_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`,
      date: now.split("T")[0],
      type: "DRAWDOWN",
      amount: data.amount,
      description: data.description,
      milestoneId: data.milestoneId || null,
      invoiceId: data.invoiceId || null,
      createdAt: now,
    };

    agreement.advanceBalance = newBalance;
    agreement.drawnAmount = newDrawn;
    agreement.status = newBalance === 0 ? "DEPLETED" : "ACTIVE";
    agreement.transactions.push(tx);
    agreement.updatedAt = now;

    await this.saveAgreements(tenantId, agreements);
    return agreement;
  }

  /**
   * Deposit / top-up funds into retainer
   */
  static async deposit(
    tenantId: string,
    id: string,
    data: { amount: number; description: string }
  ): Promise<RetainerAgreement> {
    const agreements = await this.getAgreements(tenantId);
    const agreement = agreements.find((a) => a.id === id);
    if (!agreement) {
      throw new Error("Retainer agreement not found.");
    }
    if (data.amount <= 0) {
      throw new Error("Deposit amount must be greater than zero.");
    }

    const now = new Date().toISOString();
    const newBalance = Math.round((agreement.advanceBalance + data.amount) * 100) / 100;
    const newTotal = Math.round((agreement.totalAmount + data.amount) * 100) / 100;

    const tx: RetainerTransaction = {
      id: `tx_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`,
      date: now.split("T")[0],
      type: "DEPOSIT",
      amount: data.amount,
      description: data.description,
      createdAt: now,
    };

    agreement.totalAmount = newTotal;
    agreement.advanceBalance = newBalance;
    if (agreement.status === "DEPLETED") {
      agreement.status = "ACTIVE";
    }
    agreement.transactions.push(tx);
    agreement.updatedAt = now;

    await this.saveAgreements(tenantId, agreements);
    return agreement;
  }

  /**
   * Close a retainer agreement
   */
  static async close(tenantId: string, id: string): Promise<RetainerAgreement> {
    const agreements = await this.getAgreements(tenantId);
    const agreement = agreements.find((a) => a.id === id);
    if (!agreement) {
      throw new Error("Retainer agreement not found.");
    }

    agreement.status = "CLOSED";
    agreement.updatedAt = new Date().toISOString();
    await this.saveAgreements(tenantId, agreements);
    return agreement;
  }

  /**
   * Delete retainer agreement
   */
  static async delete(tenantId: string, id: string): Promise<boolean> {
    let agreements = await this.getAgreements(tenantId);
    const countBefore = agreements.length;
    agreements = agreements.filter((a) => a.id !== id);

    if (agreements.length === countBefore) {
      throw new Error("Retainer agreement not found.");
    }

    await this.saveAgreements(tenantId, agreements);
    return true;
  }
}
