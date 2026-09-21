import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { prisma } from "./prisma";
import { verifyToken } from "./lib/jwt";
import { assertWorkspaceActive, getWorkspacePolicy } from "./services/workspace-policy.service";

let ioInstance: SocketIOServer | null = null;

export function initSocket(server: HttpServer, allowedOrigins: string[]) {
  ioInstance = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === "development") {
          return callback(null, true);
        }
        return callback(new Error("Origin not allowed"));
      },
      credentials: true,
    },
  });

  ioInstance.use(async (socket, next) => {
    try {
      const identity = verifyToken(socket.handshake.auth?.token || "");
      if ((identity as any).mfaPending) throw new Error("Complete two-factor verification");
      const user = await prisma.user.findUnique({ where: { id: identity.userId }, include: { profile: true, roles: true } });
      if (!user) throw new Error("Account not found");
      const isSuper = user.roles.some((role) => role.role === "super_admin");
      const tenantId = isSuper ? identity.tenantId : user.profile?.tenantId;
      if (!tenantId) throw new Error("Workspace context required");
      const policy = await getWorkspacePolicy(tenantId);
      if (!isSuper) assertWorkspaceActive(policy);
      const tokenExpiry = Number((identity as any).exp) * 1000;
      const expiry = !isSuper && policy.expiresAt ? Math.min(tokenExpiry, new Date(policy.expiresAt).getTime()) : tokenExpiry;
      socket.data = { tenantId, userId: user.id, name: user.profile?.fullName || user.email, avatar: user.profile?.avatarUrl, isSuper, expiry };
      next();
    } catch { next(new Error("Workspace authentication required")); }
  });

  ioInstance.on("connection", (socket: Socket) => {
    console.log(`⚡ [WebSocket] Client connected: ${socket.id}`);
    socket.join(`tenant:${socket.data.tenantId}`);
    const expiryTimer = setTimeout(() => socket.disconnect(true), Math.max(0, Math.min(socket.data.expiry - Date.now(), 2147483647)));
    expiryTimer.unref();
    socket.use(async (_packet, next) => {
      try {
        verifyToken(socket.handshake.auth?.token || "");
        if (!socket.data.isSuper) assertWorkspaceActive(await getWorkspacePolicy(socket.data.tenantId));
        next();
      } catch { socket.disconnect(true); next(new Error("Workspace access expired")); }
    });

    // Join tenant room for isolated multi-tenant broadcasting
    socket.on("join-tenant", (tenantId: string) => {
      if (tenantId === socket.data.tenantId) {
        socket.join(`tenant:${tenantId}`);
        console.log(`⚡ [WebSocket] Socket ${socket.id} joined room tenant:${tenantId}`);
      }
    });

    // Handle real-time chat direct messages with DB persistence
    socket.on("chat:send", async (payload: { tenantId?: string; threadId: string; message: any }) => {
      try {
        const tenantId = socket.data.tenantId;
        const msg = payload.message || {};
        const saved = await prisma.chatMessage.create({
          data: {
            tenantId,
            threadId: payload.threadId || "general",
            senderId: socket.data.userId,
            senderName: socket.data.name,
            senderAvatar: socket.data.avatar || null,
            content: msg.content || msg.text || "",
            attachments: msg.attachments || null,
          },
        });

        ioInstance?.to(`tenant:${tenantId}`).emit("chat:message", {
          threadId: payload.threadId,
          message: saved,
        });
      } catch (err: any) {
        console.error("Socket chat:send DB error:", err.message);
        socket.emit("chat:error", { error: "Message could not be saved" });
      }
    });

    // Handle Dual-Screen Customer Display Cart Sync
    socket.on("pos:cart_update", (payload: any) => {
      const tenantId = socket.data.tenantId;
      socket.to(`tenant:${tenantId}`).emit("pos:cart_sync", { ...payload, tenantId });
    });

    // Handle biometric live punch streaming
    socket.on("punch:simulate", (payload: { tenantId?: string; punch: any }) => {
      if (socket.data.isSuper) ioInstance?.to(`tenant:${socket.data.tenantId}`).emit("punch:new", payload.punch);
    });

    socket.on("disconnect", () => {
      clearTimeout(expiryTimer);
      console.log(`⚡ [WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
}

export function getIO(): SocketIOServer | null {
  return ioInstance;
}

export function broadcastToTenant(tenantId: string, event: string, payload: any) {
  if (!ioInstance) return;
  ioInstance.to(`tenant:${tenantId}`).emit(event, payload);
}

export function broadcastToAll(event: string, payload: any) {
  if (!ioInstance) return;
  ioInstance.emit(event, payload);
}
