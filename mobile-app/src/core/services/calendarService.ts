import { apiClient } from '../api/apiClient';

export interface CalendarCategory {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
}

export interface CalendarShare {
  recipientId: string;
  permission: 'view' | 'edit';
  rsvpStatus?: 'pending' | 'accepted' | 'declined' | 'tentative';
  recipientName?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  category: string;
  location?: string;
  room?: string;
  timezone?: string;
  recurrenceFreq?: 'none' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  recurrenceEndType?: 'never' | 'until' | 'count';
  recurrenceUntil?: string;
  recurrenceCount?: number;
  recurrenceWeekdays?: string[];
  shares?: CalendarShare[];
  reminders?: { value: string; label: string }[];
  status?: 'CONFIRMED' | 'CANCELLED';
  userPermission?: 'owner' | 'edit' | 'view';
  userRsvp?: 'pending' | 'accepted' | 'declined' | 'tentative';
  userId?: string;
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

export class CalendarService {
  public static async getCategories(): Promise<CalendarCategory[]> {
    try {
      const res = await apiClient.get('/api/calendar/categories');
      return res.data?.categories || res.data || [];
    } catch {
      return [];
    }
  }

  public static async getEvents(params?: {
    start?: string;
    end?: string;
    categoryId?: string;
    search?: string;
  }): Promise<CalendarEvent[]> {
    try {
      const res = await apiClient.get('/api/calendar/events', { params });
      return res.data?.events || res.data || [];
    } catch {
      return [];
    }
  }

  public static async createEvent(payload: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
    const res = await apiClient.post('/api/calendar/events', payload);
    return res.data?.event || res.data;
  }

  public static async updateEvent(id: string, payload: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
    const res = await apiClient.put(`/api/calendar/events/${id}`, payload);
    return res.data?.event || res.data;
  }

  public static async deleteEvent(id: string): Promise<boolean> {
    await apiClient.delete(`/api/calendar/events/${id}`);
    return true;
  }

  public static async cancelEvent(id: string, reason?: string): Promise<CalendarEvent | null> {
    const res = await apiClient.post(`/api/calendar/events/${id}/cancel`, { reason });
    return res.data?.event || res.data;
  }

  public static async rsvpEvent(id: string, status: 'accepted' | 'declined' | 'tentative'): Promise<boolean> {
    await apiClient.post(`/api/calendar/events/${id}/rsvp`, { status });
    return true;
  }

  public static async getRooms(): Promise<MeetingRoom[]> {
    try {
      const res = await apiClient.get('/api/calendar/rooms');
      return res.data?.rooms || res.data || [];
    } catch {
      return [];
    }
  }

  public static async checkConflicts(
    roomId: string,
    start: string,
    end: string,
    excludeEventId?: string
  ): Promise<{ hasConflict: boolean; conflictingEvent?: any }> {
    try {
      const res = await apiClient.post('/api/calendar/check-conflicts', {
        roomId,
        start,
        end,
        excludeEventId,
      });
      return res.data || { hasConflict: false };
    } catch {
      return { hasConflict: false };
    }
  }

  public static async getEligibleRecipients(search?: string): Promise<CalendarRecipient[]> {
    try {
      const res = await apiClient.get('/api/calendar/eligible-recipients', {
        params: { search },
      });
      return res.data?.recipients || res.data || [];
    } catch {
      return [];
    }
  }
}
