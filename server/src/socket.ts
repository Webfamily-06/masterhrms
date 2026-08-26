import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

let ioInstance: SocketIOServer | null = null;

export function initSocket(server: HttpServer, allowedOrigins: string[]) {
  ioInstance = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === "development") {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
    },
  });

  ioInstance.on("connection", (socket: Socket) => {
    console.log(`⚡ [WebSocket] Client connected: ${socket.id}`);

    // Join tenant room for isolated multi-tenant broadcasting
    socket.on("join-tenant", (tenantId: string) => {
      if (tenantId) {
        socket.join(`tenant:${tenantId}`);
        console.log(`⚡ [WebSocket] Socket ${socket.id} joined room tenant:${tenantId}`);
      }
    });

    // Handle real-time chat direct messages
    socket.on("chat:send", (payload: { tenantId?: string; threadId: string; message: any }) => {
      if (payload.tenantId) {
        socket.to(`tenant:${payload.tenantId}`).emit("chat:message", payload);
      } else {
        socket.broadcast.emit("chat:message", payload);
      }
    });

    // Handle biometric live punch streaming
    socket.on("punch:simulate", (payload: { tenantId?: string; punch: any }) => {
      if (payload.tenantId) {
        ioInstance?.to(`tenant:${payload.tenantId}`).emit("punch:new", payload.punch);
      } else {
        ioInstance?.emit("punch:new", payload.punch);
      }
    });

    socket.on("disconnect", () => {
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
