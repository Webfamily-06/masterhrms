import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { getTenantDb, getTenantContext } from "../context/tenant-context";
import { getIO } from "../socket";
import { rawPrisma, prisma } from "../prisma";

export interface CreateOutboxEventParams {
  tenantId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
}

export class OutboxService {
  private static processorTimer: NodeJS.Timeout | null = null;
  private static isProcessing = false;

  /**
   * Persists an event into the transactional outbox table.
   * Can be passed an interactive Prisma transaction ($transaction) to ensure
   * atomic database persistence alongside the business mutation.
   */
  public static async createOutboxEvent(
    params: CreateOutboxEventParams,
    tx?: PrismaClient | any
  ): Promise<any> {
    const db = tx || (getTenantContext()?.db ? getTenantDb() : (rawPrisma || prisma));
    const eventId = crypto.randomUUID();

    return await db.outboxEvent.create({
      data: {
        tenantId: params.tenantId,
        eventId,
        eventType: params.eventType,
        entityType: params.entityType,
        entityId: params.entityId,
        actorId: params.actorId ?? null,
        status: "PENDING",
        payload: {
          ...params.payload,
          ...(params.metadata ? { _metadata: params.metadata } : {}),
        },
      },
    });
  }

  public static async createEvent(
    paramsOrTenantId: CreateOutboxEventParams | string,
    arg2?: any,
    arg3?: any,
    arg4?: any,
    arg5?: any
  ): Promise<any> {
    if (typeof paramsOrTenantId === "string") {
      return this.createOutboxEvent({
        tenantId: paramsOrTenantId,
        eventType: arg2,
        entityType: arg3,
        entityId: arg4,
        payload: arg5 || {},
      });
    }
    return this.createOutboxEvent(paramsOrTenantId, arg2);
  }

  public static async publish(
    params: {
      tenantId: string;
      eventType: string;
      entityId: string;
      entityType?: string;
      actorId?: string | null;
      payload: Record<string, any>;
      metadata?: Record<string, any>;
    },
    tx?: PrismaClient | any
  ): Promise<any> {
    return this.createOutboxEvent(
      {
        tenantId: params.tenantId,
        eventType: params.eventType,
        entityType: params.entityType || "RECRUITMENT",
        entityId: params.entityId,
        actorId: params.actorId,
        payload: params.payload,
        metadata: params.metadata,
      },
      tx
    );
  }

  /**
   * Sweeps pending outbox events and dispatches them to authorized Realtime rooms.
   */
  public static async processPendingEvents(batchSize = 25): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    let processedCount = 0;
    const db = rawPrisma || prisma;

    try {
      const pendingEvents = await db.outboxEvent.findMany({
        where: {
          status: "PENDING",
          retryCount: { lt: 5 },
          eventType: { notIn: ["COMMERCE_ORDER_PAID"] },
        },
        orderBy: { createdAt: "asc" },
        take: batchSize,
      });

      if (!pendingEvents || pendingEvents.length === 0) {
        this.isProcessing = false;
        return 0;
      }

      const io = getIO();

      for (const event of pendingEvents) {
        try {
          const metadata = (event.payload as any)?._metadata;
          // Standard Event Envelope
          const envelope = {
            eventId: event.eventId,
            eventType: event.eventType,
            tenantId: event.tenantId,
            entityType: event.entityType,
            entityId: event.entityId,
            actorId: event.actorId,
            occurredAt: event.occurredAt || event.createdAt,
            payload: event.payload,
            metadata,
          };

          if (io) {
            // 1. Dispatch to tenant room
            io.to(`tenant:${event.tenantId}`).emit("domain:event", envelope);
            io.to(`tenant:${event.tenantId}`).emit(event.eventType, envelope);

            // 2. Dispatch to specific record room if subscribed
            io.to(`record:${event.entityType}:${event.entityId}`).emit(event.eventType, envelope);

            // 3. Dispatch to targeted user room if present in metadata/payload
            const recipientUserId =
              (metadata as any)?.targetUserId ||
              (event.payload as any)?.recipientId ||
              (event.payload as any)?.requesterId;
            if (recipientUserId) {
              io.to(`user:${recipientUserId}`).emit(event.eventType, envelope);
            }
          }

          // Mark event as processed
          await db.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: "PROCESSED",
              processedAt: new Date(),
            },
          });

          processedCount++;
        } catch (err: any) {
          console.error(`[OutboxService] Failed processing event ${event.id}:`, err.message);
          await db.outboxEvent.update({
            where: { id: event.id },
            data: {
              retryCount: { increment: 1 },
              error: err.message,
              status: event.retryCount >= 4 ? "FAILED" : "PENDING",
            },
          });
        }
      }
    } catch (err: any) {
      console.error("[OutboxService] Processing sweep error:", err.message);
    } finally {
      this.isProcessing = false;
    }

    return processedCount;
  }

  /**
   * Starts the background outbox event processor.
   */
  public static startProcessor(intervalMs = 3000): void {
    if (this.processorTimer) return;
    this.processorTimer = setInterval(() => {
      this.processPendingEvents().catch((err) =>
        console.error("[OutboxService] Unhandled processor loop error:", err)
      );
    }, intervalMs);
  }

  /**
   * Stops the background outbox processor.
   */
  public static stopProcessor(): void {
    if (this.processorTimer) {
      clearInterval(this.processorTimer);
      this.processorTimer = null;
    }
  }
}
