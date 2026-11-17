import { apiClient } from '../api/apiClient';
import { exportAndShareIcs, resolveSafeBackendUrl } from '../storage/attachmentHelper';

export interface CalendarCategory {
  id: string;
  name: string;
  color: string;
  description?: string;
  isSystem?: boolean;
}

export interface CalendarShare {
  recipientId: string;
  recipientName?: string;
  recipientEmail?: string;
  permission: 'view' | 'edit';
  rsvpStatus?: 'pending' | 'accepted' | 'declined' | 'tentative';
}

export interface CalendarReminder {
  id?: string;
  minutesBefore: number;
  channel: 'in_app' | 'email' | 'both';
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  category: string;
  color?: string;
  location?: string;
  meetingLink?: string;
  roomId?: string;
  roomName?: string;
  timezone?: string;
  visibility?: 'private' | 'team' | 'organization' | string;
  recurrenceRule?: string | null;
  recurrenceParentId?: string | null;
  shares?: CalendarShare[];
  reminders?: CalendarReminder[];
  status?: 'confirmed' | 'cancelled' | 'tentative' | string;
  userPermission?: 'owner' | 'edit' | 'view';
  myRsvpStatus?: 'pending' | 'accepted' | 'declined' | 'tentative';
  userId?: string;
  isReadOnly?: boolean;
  sourceDomain?: string;
  linkedTaskId?: string;
}

export interface MeetingRoom {
  id: string;
  name: string;
  capacity: number;
  location?: string;
}

export interface CalendarRecipient {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  department?: string;
}

export interface CalendarAuditLog {
  id: string;
  action: string;
  createdAt: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  details?: any;
}

export interface CalendarEventUpsertPayload {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay?: boolean;
  category?: string;
  location?: string;
  meetingLink?: string;
  roomId?: string;
  timezone?: string;
  visibility?: 'private' | 'team' | 'organization';
  recurrenceRule?: string;
  recurrenceUntil?: string;
  recurrenceScope?: 'this_occurrence' | 'all';
  occurrenceDate?: string;
  sharedWith?: Array<{ recipientId: string; permission: 'view' | 'edit' }>;
  reminders?: CalendarReminder[];
  ignoreConflicts?: boolean;
}

export function normalizeCalendarEvent(raw: any): CalendarEvent {
  const rawId = String(raw?.id || '');
  const sourceDomain = String(
    raw?.sourceDomain ||
      (rawId.startsWith('todo-')
        ? 'todo'
        : rawId.startsWith('leave-')
        ? 'leave'
        : 'calendar')
  );

  const isTodoProjection =
    sourceDomain === 'todo' ||
    sourceDomain === 'workspace_todo' ||
    rawId.startsWith('todo-');

  const linkedTaskId = isTodoProjection
    ? String(raw?.sourceId || raw?.todoId || rawId.replace(/^todo-/, ''))
    : undefined;

  const isReadOnly = Boolean(
    raw?.isReadOnly || (sourceDomain && sourceDomain !== 'calendar')
  );

  const shares: CalendarShare[] = Array.isArray(raw?.shares)
    ? raw.shares.map((s: any) => ({
        recipientId: String(s?.recipientId || s?.userId || s?.id || ''),
        recipientName: s?.recipientName || s?.recipient?.name || s?.name,
        recipientEmail: s?.recipientEmail || s?.recipient?.email || s?.email,
        permission: s?.permission === 'edit' ? 'edit' : 'view',
        rsvpStatus: s?.rsvpStatus || 'pending',
      }))
    : [];

  const reminders: CalendarReminder[] = Array.isArray(raw?.reminders)
    ? raw.reminders.map((r: any) => ({
        id: r?.id ? String(r.id) : undefined,
        minutesBefore: Number(r?.minutesBefore ?? 15),
        channel:
          r?.channel === 'email' || r?.channel === 'both' ? r.channel : 'in_app',
      }))
    : [];

  return {
    id: rawId,
    title: String(raw?.title || 'Untitled Event'),
    description: raw?.description || '',
    startDate: String(raw?.startDate || raw?.start || new Date().toISOString()),
    endDate: String(
      raw?.endDate || raw?.end || raw?.startDate || new Date().toISOString()
    ),
    allDay: Boolean(raw?.allDay ?? raw?.isAllDay),
    category: String(raw?.category || 'Meetings'),
    color: raw?.color,
    location: raw?.location || '',
    meetingLink: raw?.meetingLink || '',
    roomId: raw?.roomId || (typeof raw?.room === 'object' ? raw?.room?.id : undefined),
    roomName:
      typeof raw?.room === 'object'
        ? raw?.room?.name
        : typeof raw?.room === 'string'
        ? raw.room
        : raw?.roomName,
    timezone: raw?.timezone || 'Asia/Kolkata',
    visibility: raw?.visibility || 'private',
    recurrenceRule: raw?.recurrenceRule || null,
    recurrenceParentId: raw?.recurrenceParentId || raw?.recurringSeriesId || null,
    shares,
    reminders,
    status: String(raw?.status || 'confirmed').toLowerCase(),
    userPermission: raw?.userPermission,
    myRsvpStatus: raw?.myRsvpStatus || raw?.userRsvp,
    userId: raw?.userId || raw?.organizerId,
    isReadOnly,
    sourceDomain,
    linkedTaskId,
  };
}

export class CalendarService {
  // ── Categories ──────────────────────────────────────────────
  public static async getCategories(): Promise<CalendarCategory[]> {
    const res = await apiClient.get('/api/calendar/categories');
    const list = Array.isArray(res.data?.data)
      ? res.data.data
      : Array.isArray(res.data?.categories)
      ? res.data.categories
      : Array.isArray(res.data)
      ? res.data
      : [];
    return list.map((c: any) => ({
      id: String(c?.id || c?.name || ''),
      name: String(c?.name || 'General'),
      color: String(c?.color || '#4F46E5'),
      description: c?.description,
      isSystem: Boolean(c?.isSystem ?? c?.isDefault),
    }));
  }

  public static async createCategory(payload: {
    name: string;
    color: string;
    description?: string;
  }): Promise<CalendarCategory> {
    const res = await apiClient.post('/api/calendar/categories', payload);
    const c = res.data?.data || res.data;
    return {
      id: String(c?.id || payload.name),
      name: String(c?.name || payload.name),
      color: String(c?.color || payload.color),
      isSystem: false,
    };
  }

  public static async updateCategory(
    id: string,
    payload: { name?: string; color?: string }
  ): Promise<CalendarCategory> {
    const res = await apiClient.put(
      `/api/calendar/categories/${encodeURIComponent(id)}`,
      payload
    );
    const c = res.data?.data || res.data;
    return {
      id: String(c?.id || id),
      name: String(c?.name || payload.name || ''),
      color: String(c?.color || payload.color || '#4F46E5'),
      isSystem: false,
    };
  }

  public static async deleteCategory(id: string): Promise<boolean> {
    await apiClient.delete(`/api/calendar/categories/${encodeURIComponent(id)}`);
    return true;
  }

  // ── Events & Composite HR / Employee / Todo Projections ─────
  public static async getEvents(params?: {
    startDate?: string;
    endDate?: string;
    category?: string;
    search?: string;
  }): Promise<CalendarEvent[]> {
    const res = await apiClient.get('/api/calendar/events', {
      params: {
        startDate: params?.startDate,
        endDate: params?.endDate,
        category: params?.category,
        search: params?.search,
      },
    });
    const list = Array.isArray(res.data?.data)
      ? res.data.data
      : Array.isArray(res.data?.events)
      ? res.data.events
      : Array.isArray(res.data)
      ? res.data
      : [];
    return list.map(normalizeCalendarEvent);
  }

  public static async getCompositeEvents(params: {
    startDate: string;
    endDate: string;
    scope: 'hr' | 'me';
  }): Promise<CalendarEvent[]> {
    const endpoint =
      params.scope === 'hr' ? '/api/v1/hr/calendar/events' : '/api/v1/me/calendar/events';

    const [primaryEvents, compositeRes] = await Promise.all([
      this.getEvents({ startDate: params.startDate, endDate: params.endDate }),
      apiClient
        .get(endpoint, {
          params: { startDate: params.startDate, endDate: params.endDate },
        })
        .catch(() => ({ data: [] })),
    ]);

    const rawComposite = Array.isArray(compositeRes.data?.data)
      ? compositeRes.data.data
      : Array.isArray(compositeRes.data?.events)
      ? compositeRes.data.events
      : Array.isArray(compositeRes.data)
      ? compositeRes.data
      : [];

    const mergedMap = new Map<string, CalendarEvent>();
    for (const evt of primaryEvents) {
      if (evt.id) mergedMap.set(evt.id, evt);
    }

    for (const raw of rawComposite) {
      const norm = normalizeCalendarEvent({
        ...raw,
        isReadOnly: raw?.sourceDomain && raw.sourceDomain !== 'calendar' ? true : raw?.isReadOnly,
      });
      if (!norm.id) continue;
      // Only merge non-calendar projections (holidays, birthdays, leaves, interviews, todos)
      if (norm.sourceDomain !== 'calendar' && !mergedMap.has(norm.id)) {
        mergedMap.set(norm.id, { ...norm, isReadOnly: true });
      }
    }

    return Array.from(mergedMap.values()).sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }

  public static async createEvent(payload: CalendarEventUpsertPayload): Promise<CalendarEvent> {
    const res = await apiClient.post('/api/calendar/events', payload);
    return normalizeCalendarEvent(res.data?.data || res.data?.event || res.data);
  }

  public static async updateEvent(
    id: string,
    payload: Partial<CalendarEventUpsertPayload>
  ): Promise<CalendarEvent> {
    const res = await apiClient.put(`/api/calendar/events/${encodeURIComponent(id)}`, payload);
    return normalizeCalendarEvent(res.data?.data || res.data?.event || res.data);
  }

  public static async cancelEvent(
    id: string,
    options?: { recurrenceScope?: 'this_occurrence' | 'all'; occurrenceDate?: string }
  ): Promise<CalendarEvent> {
    const res = await apiClient.post(
      `/api/calendar/events/${encodeURIComponent(id)}/cancel`,
      options || {}
    );
    return normalizeCalendarEvent(res.data?.data || res.data?.event || res.data);
  }

  public static async deleteEvent(id: string): Promise<boolean> {
    await apiClient.delete(`/api/calendar/events/${encodeURIComponent(id)}`);
    return true;
  }

  public static async rsvpEvent(
    id: string,
    rsvpStatus: 'accepted' | 'declined' | 'tentative' | 'pending'
  ): Promise<boolean> {
    await apiClient.post(`/api/calendar/events/${encodeURIComponent(id)}/rsvp`, { rsvpStatus });
    return true;
  }

  public static async shareEvent(
    id: string,
    recipientId: string,
    permission: 'view' | 'edit' = 'view'
  ): Promise<CalendarShare[]> {
    const res = await apiClient.post(`/api/calendar/events/${encodeURIComponent(id)}/share`, {
      recipientId,
      permission,
    });
    const list = Array.isArray(res.data?.shares) ? res.data.shares : [];
    return list.map((s: any) => ({
      recipientId: String(s?.recipientId || s?.userId || ''),
      recipientName: s?.recipientName || s?.name,
      permission: s?.permission === 'edit' ? 'edit' : 'view',
      rsvpStatus: s?.rsvpStatus || 'pending',
    }));
  }

  public static async revokeEventShare(id: string, recipientId: string): Promise<boolean> {
    await apiClient.delete(
      `/api/calendar/events/${encodeURIComponent(id)}/share/${encodeURIComponent(recipientId)}`
    );
    return true;
  }

  public static async getRooms(): Promise<MeetingRoom[]> {
    const res = await apiClient.get('/api/calendar/rooms');
    const list = Array.isArray(res.data?.data)
      ? res.data.data
      : Array.isArray(res.data?.rooms)
      ? res.data.rooms
      : Array.isArray(res.data)
      ? res.data
      : [];
    return list.map((r: any) => ({
      id: String(r?.id || ''),
      name: String(r?.name || 'Room'),
      capacity: Number(r?.capacity ?? 0),
      location: r?.location,
    }));
  }

  public static async checkConflicts(params: {
    startDate: string;
    endDate: string;
    attendeeIds?: string[];
    roomId?: string;
    excludeEventId?: string;
  }): Promise<{ hasConflict: boolean; attendeeConflicts: any[]; roomConflict: any | null }> {
    const res = await apiClient.post('/api/calendar/check-conflicts', params);
    const data = res.data?.data || res.data || {};
    return {
      hasConflict: Boolean(data.hasConflict ?? data.hasConflicts),
      attendeeConflicts: Array.isArray(data.attendeeConflicts) ? data.attendeeConflicts : [],
      roomConflict: data.roomConflict || null,
    };
  }

  public static async previewRecurrence(params: {
    startDate: string;
    recurrenceRule: string;
    recurrenceUntil?: string;
  }): Promise<Array<{ startDate: string; endDate: string }>> {
    const res = await apiClient.post('/api/calendar/recurrence/preview', params);
    const data = res.data?.data || res.data;
    return Array.isArray(data?.occurrences) ? data.occurrences : [];
  }

  public static async getEligibleRecipients(query?: string): Promise<CalendarRecipient[]> {
    const res = await apiClient.get('/api/calendar/eligible-recipients', {
      params: query ? { q: query } : undefined,
    });
    const list = Array.isArray(res.data?.data)
      ? res.data.data
      : Array.isArray(res.data?.recipients)
      ? res.data.recipients
      : Array.isArray(res.data)
      ? res.data
      : [];
    return list.map((u: any) => ({
      id: String(u?.id || ''),
      name: String(u?.name || u?.email || 'Member'),
      email: String(u?.email || ''),
      department: u?.department,
      avatar: resolveSafeBackendUrl(u?.avatarUrl || u?.avatar) || undefined,
    }));
  }

  public static async getEventAuditLogs(eventId: string): Promise<CalendarAuditLog[]> {
    const res = await apiClient.get(
      `/api/calendar/events/${encodeURIComponent(eventId)}/audit-logs`
    );
    const list = Array.isArray(res.data?.data)
      ? res.data.data
      : Array.isArray(res.data)
      ? res.data
      : [];
    return list.map((log: any) => ({
      id: String(log?.id || ''),
      action: String(log?.action || 'UPDATED'),
      createdAt: log?.createdAt || new Date().toISOString(),
      userId: log?.userId,
      userEmail: log?.user?.email || log?.userEmail,
      ipAddress: log?.ipAddress,
      details: log?.details,
    }));
  }

  public static async exportCalendarIcs(params?: {
    startDate?: string;
    endDate?: string;
    category?: string;
  }): Promise<string> {
    return exportAndShareIcs('/api/calendar/export/ics', params, 'Workspace Calendar (.ics)');
  }

  public static async exportSingleEventIcs(eventId: string, title?: string): Promise<string> {
    return exportAndShareIcs(
      `/api/calendar/events/${encodeURIComponent(eventId)}/export/ics`,
      undefined,
      title ? `${title}.ics` : 'Event.ics'
    );
  }
}
