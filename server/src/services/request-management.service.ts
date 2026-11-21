import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
import crypto from "crypto";

const db = rawPrisma || proxiedPrisma;

export type RequestCategory = "IT_HARDWARE" | "STATIONERY" | "TRAVEL" | "FACILITIES" | "GENERAL";
export type RequestPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type RequestStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "FULFILLED";

export interface ServiceRequest {
  id: string;
  tenantId: string;
  requestNo: string;
  employeeId: string;
  employeeName: string;
  category: RequestCategory;
  title: string;
  details: string;
  priority: RequestPriority;
  status: RequestStatus;
  assignedTo?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export class RequestManagementService {
  private static async getRequests(tenantId: string): Promise<ServiceRequest[]> {
    const setting = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "request_management", key: "requests" },
    });
    if (setting && (setting.valueJson as any)?.items) {
      return (setting.valueJson as any).items;
    }
    return [];
  }

  private static async saveRequests(tenantId: string, items: ServiceRequest[]): Promise<void> {
    const existing = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "request_management", key: "requests" },
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
          group: "request_management",
          key: "requests",
          valueType: "JSON",
          valueJson: { items } as any,
          version: 1,
        },
      });
    }
  }

  /**
   * List employee service requests
   */
  static async listRequests(
    tenantId: string,
    filters?: { employeeId?: string; status?: RequestStatus; category?: RequestCategory }
  ): Promise<ServiceRequest[]> {
    let requests = await this.getRequests(tenantId);
    if (filters?.employeeId) {
      requests = requests.filter((r) => r.employeeId === filters.employeeId);
    }
    if (filters?.status) {
      requests = requests.filter((r) => r.status === filters.status);
    }
    if (filters?.category) {
      requests = requests.filter((r) => r.category === filters.category);
    }
    return requests;
  }

  /**
   * Get single request by ID
   */
  static async getById(tenantId: string, id: string): Promise<ServiceRequest | null> {
    const requests = await this.getRequests(tenantId);
    return requests.find((r) => r.id === id) || null;
  }

  /**
   * Submit new service request
   */
  static async createRequest(
    tenantId: string,
    data: {
      employeeId: string;
      employeeName: string;
      category: RequestCategory;
      title: string;
      details: string;
      priority?: RequestPriority;
    }
  ): Promise<ServiceRequest> {
    const requests = await this.getRequests(tenantId);
    const count = requests.length + 1;
    const requestNo = `REQ-${String(count).padStart(4, "0")}`;
    const now = new Date().toISOString();

    const newRequest: ServiceRequest = {
      id: `req_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`,
      tenantId,
      requestNo,
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      category: data.category,
      title: data.title,
      details: data.details,
      priority: data.priority || "MEDIUM",
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    };

    requests.unshift(newRequest);
    await this.saveRequests(tenantId, requests);
    return newRequest;
  }

  /**
   * Review / transition service request status
   */
  static async reviewRequest(
    tenantId: string,
    id: string,
    status: RequestStatus,
    reviewer: string,
    reviewNotes?: string
  ): Promise<ServiceRequest> {
    const requests = await this.getRequests(tenantId);
    const request = requests.find((r) => r.id === id);
    if (!request) {
      throw new Error("Service request not found.");
    }

    const now = new Date().toISOString();
    request.status = status;
    request.reviewedBy = reviewer;
    request.reviewedAt = now;
    request.reviewNotes = reviewNotes || null;
    request.updatedAt = now;

    await this.saveRequests(tenantId, requests);
    return request;
  }

  /**
   * Delete request
   */
  static async deleteRequest(tenantId: string, id: string): Promise<boolean> {
    let requests = await this.getRequests(tenantId);
    const countBefore = requests.length;
    requests = requests.filter((r) => r.id !== id);

    if (requests.length === countBefore) {
      throw new Error("Service request not found.");
    }

    await this.saveRequests(tenantId, requests);
    return true;
  }
}
