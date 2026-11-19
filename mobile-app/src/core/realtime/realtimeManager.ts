import { Config } from '../../config/environment';
import { apiClient } from '../api/apiClient';
import { queryClient } from '../query/queryClient';

export type RealtimeEventHandler = (payload: any, eventName: string) => void;

class RealtimeManager {
  private socketWs: WebSocket | null = null;
  private pusherWs: WebSocket | null = null;
  private socketConnected = false;
  private pusherConnected = false;

  private activeToken: string | null = null;
  private activeUserId: string | null = null;
  private activeTenantId: string | null = null;

  private listeners = new Map<string, Set<RealtimeEventHandler>>();
  private wildcardListeners = new Set<RealtimeEventHandler>();
  private joinedThreadCounts = new Map<string, number>();

  private ackCounter = 1;
  private pendingAcks = new Map<number, (response: any) => void>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pusherPingTimer: ReturnType<typeof setInterval> | null = null;
  private manuallyStopped = false;

  // Short deduplication window when both Socket.IO and Pusher deliver the same event
  private recentEventFingerprints = new Map<string, number>();

  public isConnected(): boolean {
    return this.socketConnected || this.pusherConnected;
  }

  public getActiveContext(): { userId: string | null; tenantId: string | null } {
    return {
      userId: this.activeUserId,
      tenantId: this.activeTenantId,
    };
  }

  /**
   * Connects authenticated, tenant-scoped Socket.IO + Pusher transports.
   * Automatically tears down previous connections if user or tenant changed.
   */
  public connect(params: { token: string; userId: string; tenantId: string }): void {
    const { token, userId, tenantId } = params;
    if (!token || !userId || !tenantId) {
      return;
    }

    if (
      this.activeToken === token &&
      this.activeUserId === userId &&
      this.activeTenantId === tenantId &&
      (this.socketWs || this.pusherWs)
    ) {
      return;
    }

    // Tear down any stale tenant/user connection first
    this.disconnectAll(false);

    this.manuallyStopped = false;
    this.activeToken = token;
    this.activeUserId = userId;
    this.activeTenantId = tenantId;

    this.connectSocketIo(token, tenantId);
    void this.connectPusher(userId, tenantId);
  }

  /**
   * Disconnects all realtime sockets, leaves rooms, cancels timers, and clears state.
   */
  public disconnectAll(clearThreadSubscriptions = true): void {
    this.manuallyStopped = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.pusherPingTimer) {
      clearInterval(this.pusherPingTimer);
      this.pusherPingTimer = null;
    }

    if (this.socketWs) {
      try {
        if (this.socketConnected) {
          for (const threadId of this.joinedThreadCounts.keys()) {
            this.sendSocketPacket(`42${JSON.stringify(['chat:leave', { threadId }])}`);
          }
          this.sendSocketPacket('41');
        }
        this.socketWs.onopen = null;
        this.socketWs.onmessage = null;
        this.socketWs.onerror = null;
        this.socketWs.onclose = null;
        this.socketWs.close();
      } catch {
        // Ignore close errors
      }
      this.socketWs = null;
    }

    if (this.pusherWs) {
      try {
        this.pusherWs.onopen = null;
        this.pusherWs.onmessage = null;
        this.pusherWs.onerror = null;
        this.pusherWs.onclose = null;
        this.pusherWs.close();
      } catch {
        // Ignore close errors
      }
      this.pusherWs = null;
    }

    this.socketConnected = false;
    this.pusherConnected = false;
    this.activeToken = null;
    this.activeUserId = null;
    this.activeTenantId = null;
    this.pendingAcks.clear();
    this.recentEventFingerprints.clear();

    if (clearThreadSubscriptions) {
      this.joinedThreadCounts.clear();
    }
  }

  /**
   * Subscribes to a specific realtime event name. Returns an unsubscribe cleanup callback.
   */
  public subscribe(eventName: string, handler: RealtimeEventHandler): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(handler);

    return () => {
      const set = this.listeners.get(eventName);
      if (set) {
        set.delete(handler);
        if (set.size === 0) {
          this.listeners.delete(eventName);
        }
      }
    };
  }

  /**
   * Subscribes to all incoming realtime events. Returns an unsubscribe cleanup callback.
   */
  public subscribeAll(handler: RealtimeEventHandler): () => void {
    this.wildcardListeners.add(handler);
    return () => {
      this.wildcardListeners.delete(handler);
    };
  }

  /**
   * Joins a tenant-scoped chat thread room with reference counting for clean unmount behavior.
   */
  public joinChatThread(threadId: string): () => void {
    if (!threadId) return () => {};

    const prevCount = this.joinedThreadCounts.get(threadId) || 0;
    this.joinedThreadCounts.set(threadId, prevCount + 1);

    if (prevCount === 0 && this.socketConnected) {
      this.emit('chat:join', { threadId });
    }

    return () => {
      this.leaveChatThread(threadId);
    };
  }

  public leaveChatThread(threadId: string): void {
    if (!threadId) return;
    const current = this.joinedThreadCounts.get(threadId) || 0;
    if (current <= 1) {
      this.joinedThreadCounts.delete(threadId);
      if (this.socketConnected) {
        this.emit('chat:leave', { threadId });
      }
    } else {
      this.joinedThreadCounts.set(threadId, current - 1);
    }
  }

  /**
   * Emits a Socket.IO event with optional acknowledgement callback.
   */
  public emit(eventName: string, payload?: any, onAck?: (res: any) => void): boolean {
    if (!this.socketConnected || !this.socketWs) {
      return false;
    }

    if (onAck) {
      const ackId = this.ackCounter++;
      this.pendingAcks.set(ackId, onAck);
      return this.sendSocketPacket(`42${ackId}${JSON.stringify([eventName, payload ?? {}])}`);
    }

    return this.sendSocketPacket(`42${JSON.stringify([eventName, payload ?? {}])}`);
  }

  /**
   * Dispatches an event to registered listeners (also exposed for unit tests).
   */
  public dispatchIncomingEvent(eventName: string, payload: any): void {
    if (!eventName) return;

    // Deduplicate identical message events within 1.5s across dual Socket.IO + Pusher transport
    const dedupId = payload?.message?.id || payload?.id;
    if (dedupId) {
      const fp = `${eventName}::${dedupId}`;
      const now = Date.now();
      const prev = this.recentEventFingerprints.get(fp);
      if (prev && now - prev < 1500) {
        return;
      }
      this.recentEventFingerprints.set(fp, now);
      if (this.recentEventFingerprints.size > 200) {
        const cutoff = now - 5000;
        for (const [k, ts] of this.recentEventFingerprints.entries()) {
          if (ts < cutoff) this.recentEventFingerprints.delete(k);
        }
      }
    }

    // Built-in cross-module React Query cache invalidation
    if (eventName.startsWith('calendar:') && this.activeTenantId) {
      void queryClient.invalidateQueries({ queryKey: [this.activeTenantId, 'calendar'] });
    }
    if (eventName === 'notification:new' && this.activeTenantId) {
      void queryClient.invalidateQueries({ queryKey: [this.activeTenantId, 'todos'] });
      void queryClient.invalidateQueries({ queryKey: [this.activeTenantId, 'calendar'] });
    }

    const handlers = this.listeners.get(eventName);
    if (handlers) {
      handlers.forEach((fn) => {
        try {
          fn(payload, eventName);
        } catch {
          // Isolate subscriber errors
        }
      });
    }

    this.wildcardListeners.forEach((fn) => {
      try {
        fn(payload, eventName);
      } catch {
        // Isolate subscriber errors
      }
    });
  }

  private buildWsBaseUrl(): string {
    const httpBase = Config.API_BASE_URL.replace(/\/+$/, '');
    if (httpBase.startsWith('https://')) {
      return `wss://${httpBase.slice('https://'.length)}`;
    }
    if (httpBase.startsWith('http://')) {
      return `ws://${httpBase.slice('http://'.length)}`;
    }
    return `ws://${httpBase}`;
  }

  private connectSocketIo(token: string, tenantId: string): void {
    if (typeof WebSocket === 'undefined') return;

    try {
      const wsUrl = `${this.buildWsBaseUrl()}/socket.io/?EIO=4&transport=websocket`;
      const ws = new WebSocket(wsUrl);
      this.socketWs = ws;

      ws.onmessage = (event) => {
        const raw = typeof event.data === 'string' ? event.data : '';
        if (!raw) return;

        // Engine.IO open packet '0{...}' -> send Socket.IO connect with JWT handshake auth
        if (raw.startsWith('0')) {
          this.sendSocketPacket(`40${JSON.stringify({ token })}`);
          return;
        }

        // Engine.IO ping '2' -> respond pong '3'
        if (raw === '2') {
          this.sendSocketPacket('3');
          return;
        }

        // Socket.IO connect ack '40{...}'
        if (raw.startsWith('40')) {
          this.socketConnected = true;
          this.emit('join-tenant', tenantId);
          for (const threadId of this.joinedThreadCounts.keys()) {
            this.emit('chat:join', { threadId });
          }
          this.dispatchIncomingEvent('realtime:connected', { transport: 'socketio' });
          return;
        }

        // Socket.IO server disconnect '41' or connect_error '44'
        if (raw.startsWith('41') || raw.startsWith('44')) {
          this.socketConnected = false;
          return;
        }

        // Socket.IO ack '43<id>[...]'
        if (raw.startsWith('43')) {
          const match = raw.match(/^43(\d+)(\[[\s\S]*\])$/);
          if (match) {
            const ackId = Number(match[1]);
            const ackFn = this.pendingAcks.get(ackId);
            if (ackFn) {
              this.pendingAcks.delete(ackId);
              try {
                const parsed = JSON.parse(match[2]);
                ackFn(Array.isArray(parsed) ? parsed[0] : parsed);
              } catch {
                ackFn(null);
              }
            }
          }
          return;
        }

        // Socket.IO event '42["eventName", payload]' (or '42<id>[...]')
        if (raw.startsWith('42')) {
          const bracketIdx = raw.indexOf('[');
          if (bracketIdx > 0) {
            try {
              const tuple = JSON.parse(raw.slice(bracketIdx));
              if (Array.isArray(tuple) && typeof tuple[0] === 'string') {
                this.dispatchIncomingEvent(tuple[0], tuple[1]);
              }
            } catch {
              // Ignore malformed frames
            }
          }
        }
      };

      ws.onclose = () => {
        this.socketConnected = false;
        if (!this.manuallyStopped && this.activeToken && this.activeTenantId) {
          this.scheduleReconnect();
        }
      };

      ws.onerror = () => {
        this.socketConnected = false;
      };
    } catch {
      this.socketConnected = false;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.manuallyStopped) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.manuallyStopped && this.activeToken && this.activeTenantId) {
        this.connectSocketIo(this.activeToken, this.activeTenantId);
      }
    }, 4000);
  }

  private sendSocketPacket(packet: string): boolean {
    try {
      if (this.socketWs && this.socketWs.readyState === WebSocket.OPEN) {
        this.socketWs.send(packet);
        return true;
      }
    } catch {
      // Ignore transient socket write failures
    }
    return false;
  }

  private async connectPusher(userId: string, tenantId: string): Promise<void> {
    if (typeof WebSocket === 'undefined') return;

    try {
      let key = Config.PUSHER?.KEY || '';
      let cluster = Config.PUSHER?.CLUSTER || 'ap2';
      let enabled = Config.PUSHER?.ENABLED ?? true;

      try {
        const cfgRes = await apiClient.get('/api/pusher/config');
        const cfg = cfgRes.data?.data || cfgRes.data;
        if (cfg?.key) key = cfg.key;
        if (cfg?.cluster) cluster = cfg.cluster;
        if (cfg?.enabled !== undefined) enabled = cfg.enabled;
      } catch {
        // Fall back to configured environment credentials
      }

      if (!enabled || !key || !cluster) {
        return;
      }
      if (this.manuallyStopped || this.activeUserId !== userId || this.activeTenantId !== tenantId) {
        return;
      }

      const pusherUrl = `wss://ws-${cluster}.pusher.com:443/app/${key}?protocol=7&client=masterhrms-mobile&version=1.0.0&flash=false`;
      const ws = new WebSocket(pusherUrl);
      this.pusherWs = ws;

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(typeof event.data === 'string' ? event.data : '{}');
          const evtName: string = msg.event || '';
          const parsedData =
            typeof msg.data === 'string'
              ? (() => {
                  try {
                    return JSON.parse(msg.data);
                  } catch {
                    return msg.data;
                  }
                })()
              : msg.data;

          if (evtName === 'pusher:connection_established') {
            const socketId = parsedData?.socket_id;
            if (!socketId) return;
            this.pusherConnected = true;

            const channels = [`private-user-${userId}`, `private-tenant-${tenantId}`];
            for (const channelName of channels) {
              try {
                const authRes = await apiClient.post('/api/pusher/auth', {
                  socket_id: socketId,
                  channel_name: channelName,
                });
                const authToken = authRes.data?.auth;
                if (authToken && ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      event: 'pusher:subscribe',
                      data: {
                        auth: authToken,
                        channel: channelName,
                        ...(authRes.data?.channel_data
                          ? { channel_data: authRes.data.channel_data }
                          : {}),
                      },
                    })
                  );
                }
              } catch {
                // Skip unauthorized channel
              }
            }

            if (this.pusherPingTimer) clearInterval(this.pusherPingTimer);
            this.pusherPingTimer = setInterval(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
              }
            }, 60000);
            return;
          }

          if (evtName === 'pusher:ping') {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ event: 'pusher:pong', data: {} }));
            }
            return;
          }

          if (!evtName.startsWith('pusher:') && !evtName.startsWith('pusher_internal:')) {
            this.dispatchIncomingEvent(evtName, parsedData);
          }
        } catch {
          // Ignore malformed Pusher frames
        }
      };

      ws.onclose = () => {
        this.pusherConnected = false;
      };
      ws.onerror = () => {
        this.pusherConnected = false;
      };
    } catch {
      // Pusher not configured or offline — Socket.IO / REST handles traffic
    }
  }
}

export const realtimeManager = new RealtimeManager();
