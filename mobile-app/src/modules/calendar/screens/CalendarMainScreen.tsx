import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Text } from '../../../components/common/Text';
import {
  Search,
  Clock,
  MapPin,
  X,
  Repeat,
  Building2,
  Link,
  CheckSquare,
  BarChart2,
  Download,
  FileText,
  Edit,
  Bell,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react-native';
import {
  WorkspaceModuleShell,
  WorkspaceLoadingBlock,
  WorkspaceErrorBlock,
  WorkspaceEmptyBlock,
  useResponsiveLayout,
} from '../../../components/workspace/WorkspaceModuleShell';
import { createTenantQueryKey } from '../../../app/providers/QueryProvider';
import { useAuthStore } from '../../../store/authStore';
import { usePermission } from '../../../hooks/usePermission';
import { realtimeManager } from '../../../core/realtime/realtimeManager';
import {
  CalendarService,
  CalendarEvent,
  CalendarCategory,
  CalendarReminder,
  CalendarEventUpsertPayload,
} from '../../../core/services/calendarService';

type CalendarViewMode = 'agenda' | 'month' | 'week' | 'day';

const COLOR_SWATCHES = [
  '#4F46E5',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#0EA5E9',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
];

const TIMEZONES = [
  'Asia/Kolkata',
  'UTC',
  'America/New_York',
  'Europe/London',
  'Asia/Dubai',
  'Asia/Singapore',
];

const REMINDER_MINUTES = [
  { value: 5, label: '5 min before' },
  { value: 15, label: '15 min before' },
  { value: 30, label: '30 min before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
];

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseRruleFreq(rule?: string | null): 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' {
  if (!rule) return 'NONE';
  const match = rule.match(/FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)/i);
  return match ? (match[1].toUpperCase() as any) : 'NONE';
}

function buildRrule(
  freq: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY',
  untilYmd?: string
): string | undefined {
  if (freq === 'NONE') return undefined;
  let rule = `FREQ=${freq}`;
  if (untilYmd && /^\d{4}-\d{2}-\d{2}$/.test(untilYmd.trim())) {
    const compact = untilYmd.trim().replace(/-/g, '');
    rule += `;UNTIL=${compact}T235959Z`;
  }
  return rule;
}

export const CalendarMainScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const { isTablet } = useResponsiveLayout();
  const user = useAuthStore((s) => s.user);
  const { hasAnyPermission, activeRole } = usePermission();

  const initialDate = useMemo(() => {
    if (route.params?.focusDate) {
      const parsed = new Date(route.params.focusDate);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }, [route.params?.focusDate]);

  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [viewMode, setViewMode] = useState<CalendarViewMode>(
    route.params?.initialView || (isTablet ? 'month' : 'agenda')
  );
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals & Drawers
  const [dateJumpOpen, setDateJumpOpen] = useState(false);
  const [jumpDateInput, setJumpDateInput] = useState(toYmd(initialDate));
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(COLOR_SWATCHES[0]);
  const [editingCat, setEditingCat] = useState<CalendarCategory | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [auditModalOpen, setAuditModalOpen] = useState(false);

  // Create / Edit Event Form Modal
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Meetings');
  const [startDateStr, setStartDateStr] = useState(toYmd(new Date()));
  const [endDateStr, setEndDateStr] = useState(toYmd(new Date()));
  const [startTimeStr, setStartTimeStr] = useState('10:00');
  const [endTimeStr, setEndTimeStr] = useState('11:00');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [roomId, setRoomId] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [visibility, setVisibility] = useState<'private' | 'team' | 'organization'>('private');
  const [recurrenceFreq, setRecurrenceFreq] = useState<
    'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  >('NONE');
  const [recurrenceUntil, setRecurrenceUntil] = useState('');
  const [sharedWith, setSharedWith] = useState<
    Array<{ recipientId: string; name: string; permission: 'view' | 'edit' }>
  >([]);
  const [recipientQuery, setRecipientQuery] = useState('');
  const [reminders, setReminders] = useState<CalendarReminder[]>([
    { minutesBefore: 15, channel: 'in_app' },
  ]);

  // Conflict & Recurrence Scope Modals
  const [conflictPrompt, setConflictPrompt] = useState<{
    conflicts: any[];
    pendingPayload: CalendarEventUpsertPayload;
  } | null>(null);

  const [recurrencePrompt, setRecurrencePrompt] = useState<{
    mode: 'edit' | 'cancel';
    pendingPayload?: CalendarEventUpsertPayload;
  } | null>(null);

  // Live share input inside Event Details
  const [detailShareQuery, setDetailShareQuery] = useState('');
  const [detailSharePerm, setDetailSharePerm] = useState<'view' | 'edit'>('view');

  // Determine composite projection scope from authoritative permissions (not role string guessing alone)
  const useHrCompositeScope =
    activeRole !== 'employee' &&
    (hasAnyPermission(['hrm.dashboard.view', 'hrm.manage', '*']) ||
      activeRole === 'hr_admin' ||
      activeRole === 'tenant_admin');

  const canOverrideConflicts =
    hasAnyPermission(['hrm.dashboard.view', 'hrm.manage', '*']) ||
    activeRole === 'hr_admin' ||
    activeRole === 'tenant_admin' ||
    activeRole === 'manager';

  // 3-month rolling window around currentDate (matches UnifiedCalendarApp)
  const dateWindow = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1, 0, 0, 0);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0, 23, 59, 59);
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    };
  }, [currentDate]);

  // Queries
  const categoriesQuery = useQuery({
    queryKey: createTenantQueryKey(['calendar', 'categories']),
    queryFn: () => CalendarService.getCategories(),
  });

  const roomsQuery = useQuery({
    queryKey: createTenantQueryKey(['calendar', 'rooms']),
    queryFn: () => CalendarService.getRooms(),
  });

  const eventsQuery = useQuery({
    queryKey: createTenantQueryKey([
      'calendar',
      'events',
      dateWindow.startIso,
      dateWindow.endIso,
      useHrCompositeScope ? 'hr' : 'me',
    ]),
    queryFn: () =>
      CalendarService.getCompositeEvents({
        startDate: dateWindow.startIso,
        endDate: dateWindow.endIso,
        scope: useHrCompositeScope ? 'hr' : 'me',
      }),
  });

  const recipientsQuery = useQuery({
    queryKey: createTenantQueryKey([
      'calendar',
      'recipients',
      formModalOpen ? recipientQuery : detailShareQuery,
    ]),
    queryFn: () =>
      CalendarService.getEligibleRecipients(
        (formModalOpen ? recipientQuery : detailShareQuery).trim() || undefined
      ),
    enabled: formModalOpen || Boolean(selectedEvent && !selectedEvent.isReadOnly),
  });

  const auditLogsQuery = useQuery({
    queryKey: createTenantQueryKey(['calendar', 'audit-logs', selectedEvent?.id || 'none']),
    queryFn: () => CalendarService.getEventAuditLogs(selectedEvent!.id),
    enabled: Boolean(auditModalOpen && selectedEvent && !selectedEvent.isReadOnly),
  });

  // Subscribe to realtime Pusher/Socket calendar events
  useEffect(() => {
    const refreshCalendar = () => {
      void queryClient.invalidateQueries({ queryKey: createTenantQueryKey(['calendar']) });
    };
    const unsubs = [
      realtimeManager.subscribe('calendar:reminder-due', refreshCalendar),
      realtimeManager.subscribe('calendar:event-shared', refreshCalendar),
      realtimeManager.subscribe('calendar:event-updated', refreshCalendar),
      realtimeManager.subscribe('calendar:event-cancelled', refreshCalendar),
      realtimeManager.subscribe('calendar:event-deleted', refreshCalendar),
      realtimeManager.subscribe('calendar:rsvp-updated', refreshCalendar),
    ];
    return () => unsubs.forEach((u) => u());
  }, [queryClient]);

  const categories = useMemo(() => {
    const fetched = categoriesQuery.data || [];
    if (fetched.length > 0) return fetched;
    return [
      { id: 'Meetings', name: 'Meetings', color: '#4F46E5', isSystem: true },
      { id: 'Project', name: 'Project', color: '#10B981', isSystem: true },
      { id: 'Holiday', name: 'Holiday', color: '#0EA5E9', isSystem: true },
      { id: 'Training', name: 'Training', color: '#F59E0B', isSystem: true },
    ];
  }, [categoriesQuery.data]);

  const categoryColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) {
      map[c.name.toLowerCase()] = c.color;
    }
    return map;
  }, [categories]);

  const getEventColor = (evt: CalendarEvent) => {
    if (evt.color) return evt.color;
    return categoryColorMap[evt.category.toLowerCase()] || '#4F46E5';
  };

  // Filtered events
  const filteredEvents = useMemo(() => {
    const all = eventsQuery.data || [];
    const q = search.trim().toLowerCase();
    return all.filter((e) => {
      if (
        selectedCategory !== 'all' &&
        e.category.toLowerCase() !== selectedCategory.toLowerCase()
      ) {
        return false;
      }
      if (q) {
        return (
          e.title.toLowerCase().includes(q) ||
          (e.description || '').toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.location || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [eventsQuery.data, selectedCategory, search]);

  // Navigation helpers
  const shiftPeriod = (dir: -1 | 1) => {
    const next = new Date(currentDate);
    if (viewMode === 'day') {
      next.setDate(next.getDate() + dir);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + dir * 7);
    } else {
      next.setMonth(next.getMonth() + dir);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Open Create or Edit Event Modal
  const openCreateModal = (prefillDate?: Date, prefillHour?: number) => {
    const baseDate = prefillDate || new Date();
    const todayFloor = new Date();
    todayFloor.setHours(0, 0, 0, 0);
    const safeDate = baseDate < todayFloor ? new Date() : baseDate;
    const ymd = toYmd(safeDate);
    const hr = prefillHour !== undefined ? prefillHour : 10;

    setEditingEvent(null);
    setTitle('');
    setDescription('');
    setCategory(categories[0]?.name || 'Meetings');
    setStartDateStr(ymd);
    setEndDateStr(ymd);
    setStartTimeStr(`${String(hr).padStart(2, '0')}:00`);
    setEndTimeStr(`${String(Math.min(23, hr + 1)).padStart(2, '0')}:00`);
    setAllDay(false);
    setLocation('');
    setMeetingLink('');
    setRoomId('');
    setTimezone('Asia/Kolkata');
    setVisibility('private');
    setRecurrenceFreq('NONE');
    setRecurrenceUntil('');
    setSharedWith([]);
    setReminders([{ minutesBefore: 15, channel: 'in_app' }]);
    setFormModalOpen(true);
  };

  const openEditModal = (evt: CalendarEvent) => {
    const st = new Date(evt.startDate);
    const en = new Date(evt.endDate);
    setSelectedEvent(null);
    setEditingEvent(evt);
    setTitle(evt.title);
    setDescription(evt.description || '');
    setCategory(evt.category || 'Meetings');
    setStartDateStr(toYmd(st));
    setEndDateStr(toYmd(en));
    setStartTimeStr(
      `${String(st.getHours()).padStart(2, '0')}:${String(st.getMinutes()).padStart(2, '0')}`
    );
    setEndTimeStr(
      `${String(en.getHours()).padStart(2, '0')}:${String(en.getMinutes()).padStart(2, '0')}`
    );
    setAllDay(evt.allDay);
    setLocation(evt.location || '');
    setMeetingLink(evt.meetingLink || '');
    setRoomId(evt.roomId || '');
    setTimezone(evt.timezone || 'Asia/Kolkata');
    setVisibility(
      evt.visibility === 'organization' || evt.visibility === 'team' ? evt.visibility : 'private'
    );
    setRecurrenceFreq(parseRruleFreq(evt.recurrenceRule));
    setRecurrenceUntil('');
    setSharedWith(
      (evt.shares || []).map((s) => ({
        recipientId: s.recipientId,
        name: s.recipientName || s.recipientEmail || s.recipientId,
        permission: s.permission,
      }))
    );
    setReminders(
      evt.reminders && evt.reminders.length > 0
        ? evt.reminders
        : [{ minutesBefore: 15, channel: 'in_app' }]
    );
    setFormModalOpen(true);
  };

  // Save Event Mutation
  const saveEventMutation = useMutation({
    mutationFn: async (payload: CalendarEventUpsertPayload) => {
      if (editingEvent) {
        return CalendarService.updateEvent(editingEvent.id, payload);
      }
      return CalendarService.createEvent(payload);
    },
    onSuccess: () => {
      setFormModalOpen(false);
      setConflictPrompt(null);
      setRecurrencePrompt(null);
      setEditingEvent(null);
      void queryClient.invalidateQueries({ queryKey: createTenantQueryKey(['calendar']) });
    },
    onError: (err: any, variables) => {
      const conflicts = err?.data?.conflicts;
      if (err?.status === 409 || Array.isArray(conflicts)) {
        setConflictPrompt({
          conflicts: Array.isArray(conflicts) ? conflicts : [{ title: err?.message }],
          pendingPayload: variables,
        });
        return;
      }
      Alert.alert('Schedule Error', err?.message || 'Unable to save calendar event.');
    },
  });

  const handleSubmitEventForm = () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Event title is required.');
      return;
    }

    const startIso = allDay
      ? `${startDateStr}T00:00:00`
      : `${startDateStr}T${startTimeStr}:00`;
    const endIso = allDay
      ? `${endDateStr}T23:59:59`
      : `${endDateStr}T${endTimeStr}:00`;

    const sDate = new Date(startIso);
    const eDate = new Date(endIso);
    if (Number.isNaN(sDate.getTime()) || Number.isNaN(eDate.getTime())) {
      Alert.alert('Validation', 'Enter valid YYYY-MM-DD dates and HH:MM times.');
      return;
    }
    if (!allDay && eDate <= sDate) {
      Alert.alert('Validation', 'End date/time must be after start date/time.');
      return;
    }

    const payload: CalendarEventUpsertPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      startDate: sDate.toISOString(),
      endDate: eDate.toISOString(),
      allDay,
      category,
      location: location.trim() || undefined,
      meetingLink: meetingLink.trim() || undefined,
      roomId: roomId || undefined,
      timezone,
      visibility,
      recurrenceRule: buildRrule(recurrenceFreq, recurrenceUntil),
      recurrenceUntil: recurrenceUntil.trim() || undefined,
      sharedWith: sharedWith.map((s) => ({
        recipientId: s.recipientId,
        permission: s.permission,
      })),
      reminders: reminders.slice(0, 5),
    };

    if (editingEvent && (editingEvent.recurrenceRule || editingEvent.recurrenceParentId)) {
      setRecurrencePrompt({ mode: 'edit', pendingPayload: payload });
      return;
    }

    saveEventMutation.mutate(payload);
  };

  // Cancel, Delete, RSVP, Share & Category Mutations
  const cancelMutation = useMutation({
    mutationFn: (params: {
      id: string;
      recurrenceScope?: 'this_occurrence' | 'all';
      occurrenceDate?: string;
    }) =>
      CalendarService.cancelEvent(params.id, {
        recurrenceScope: params.recurrenceScope,
        occurrenceDate: params.occurrenceDate,
      }),
    onSuccess: () => {
      setRecurrencePrompt(null);
      setSelectedEvent(null);
      void queryClient.invalidateQueries({ queryKey: createTenantQueryKey(['calendar']) });
    },
    onError: (err: any) => {
      Alert.alert('Cancel Failed', err?.message || 'Unable to cancel event.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => CalendarService.deleteEvent(id),
    onSuccess: () => {
      setSelectedEvent(null);
      void queryClient.invalidateQueries({ queryKey: createTenantQueryKey(['calendar']) });
    },
    onError: (err: any) => {
      Alert.alert('Delete Failed', err?.message || 'Unable to delete event.');
    },
  });

  const rsvpMutation = useMutation({
    mutationFn: (status: 'accepted' | 'tentative' | 'declined') =>
      CalendarService.rsvpEvent(selectedEvent!.id, status),
    onSuccess: (_res, status) => {
      if (selectedEvent) {
        setSelectedEvent({ ...selectedEvent, myRsvpStatus: status });
      }
      void queryClient.invalidateQueries({ queryKey: createTenantQueryKey(['calendar']) });
    },
    onError: (err: any) => {
      Alert.alert('RSVP Error', err?.message || 'Unable to update RSVP.');
    },
  });

  const saveCategoryMutation = useMutation({
    mutationFn: () =>
      editingCat
        ? CalendarService.updateCategory(editingCat.id, {
            name: newCatName.trim(),
            color: newCatColor,
          })
        : CalendarService.createCategory({
            name: newCatName.trim(),
            color: newCatColor,
          }),
    onSuccess: () => {
      setNewCatName('');
      setEditingCat(null);
      void queryClient.invalidateQueries({
        queryKey: createTenantQueryKey(['calendar', 'categories']),
      });
    },
    onError: (err: any) => {
      Alert.alert('Category Error', err?.message || 'Unable to save category.');
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => CalendarService.deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: createTenantQueryKey(['calendar', 'categories']),
      });
    },
    onError: (err: any) => {
      Alert.alert('Delete Category Error', err?.message || 'System categories cannot be deleted.');
    },
  });

  // Real Month Grid Calculation (no fabricated dates)
  const monthCells = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayWeekday = new Date(year, month, 1).getDay();
    const daysCount = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ key: string; date: Date | null }> = [];
    for (let i = 0; i < firstDayWeekday; i++) {
      cells.push({ key: `pad-${i}`, date: null });
    }
    for (let d = 1; d <= daysCount; d++) {
      cells.push({ key: `day-${d}`, date: new Date(year, month, d) });
    }
    return cells;
  }, [currentDate]);

  // Week Dates (Sun..Sat around currentDate)
  const weekDates = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(start);
      d.setDate(start.getDate() + idx);
      return d;
    });
  }, [currentDate]);

  // Agenda grouped by YYYY-MM-DD for current month (or matching search)
  const agendaGroups = useMemo(() => {
    const monthPrefix = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, '0')}`;
    const relevant = search.trim()
      ? filteredEvents
      : filteredEvents.filter((e) => toYmd(new Date(e.startDate)).startsWith(monthPrefix));

    const grouped = new Map<string, CalendarEvent[]>();
    for (const ev of relevant) {
      const key = toYmd(new Date(ev.startDate));
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(ev);
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredEvents, currentDate, search]);

  // Selected Event Ownership & Permission Flags
  const isSelectedOwnerOrAdmin = Boolean(
    selectedEvent &&
      !selectedEvent.isReadOnly &&
      (selectedEvent.userId === user?.id ||
        selectedEvent.userPermission === 'owner' ||
        activeRole === 'tenant_admin' ||
        activeRole === 'hr_admin')
  );

  const canEditSelected = Boolean(
    selectedEvent &&
      !selectedEvent.isReadOnly &&
      (isSelectedOwnerOrAdmin || selectedEvent.userPermission === 'edit')
  );

  const isSelectedInvitee = Boolean(
    selectedEvent &&
      !selectedEvent.isReadOnly &&
      selectedEvent.shares?.some((s) => s.recipientId === user?.id)
  );

  const periodLabel =
    viewMode === 'day'
      ? currentDate.toLocaleDateString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' });

  const todayYmd = toYmd(new Date());

  return (
    <WorkspaceModuleShell
      activeModule="calendar"
      title="Workspace Calendar"
      rightActions={
        <View style={styles.headerRightRow}>
          <TouchableOpacity
            style={styles.icsBtn}
            onPress={() =>
              CalendarService.exportCalendarIcs({
                startDate: dateWindow.startIso,
                endDate: dateWindow.endIso,
                category: selectedCategory === 'all' ? undefined : selectedCategory,
              }).catch((e) => Alert.alert('ICS Export', e.message))
            }
            accessibilityRole="button"
            accessibilityLabel="Export calendar ICS"
          >
            <Text style={styles.icsBtnText}>ICS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => openCreateModal(currentDate)}
            accessibilityRole="button"
            accessibilityLabel="Create calendar event"
          >
            <Text style={styles.createBtnText}>+ Event</Text>
          </TouchableOpacity>
        </View>
      }
      subHeader={
        <View style={styles.controlsWrap}>
          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Search size={15} color="#94A3B8" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search schedules, rooms, categories..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Date Nav + Date Picker Trigger */}
          <View style={styles.navRow}>
            <TouchableOpacity
              onPress={() => shiftPeriod(-1)}
              style={styles.chevronBtn}
              accessibilityRole="button"
              accessibilityLabel="Previous period"
            >
              <Text style={styles.chevronText}>‹</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setJumpDateInput(toYmd(currentDate));
                setDateJumpOpen(true);
              }}
              style={styles.periodTouch}
              accessibilityRole="button"
              accessibilityLabel="Pick date"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.periodHeading}>{periodLabel}</Text>
                <ChevronDown size={14} color="#0F172A" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => shiftPeriod(1)}
              style={styles.chevronBtn}
              accessibilityRole="button"
              accessibilityLabel="Next period"
            >
              <Text style={styles.chevronText}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleToday} style={styles.todayBtn}>
              <Text style={styles.todayBtnText}>Today</Text>
            </TouchableOpacity>
          </View>

          {/* 4-View Switcher: Agenda | Month | Week | Day */}
          <View style={styles.viewTabs}>
            {(['agenda', 'month', 'week', 'day'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.viewTab, viewMode === mode && styles.viewTabActive]}
                onPress={() => setViewMode(mode)}
              >
                <Text style={[styles.viewTabText, viewMode === mode && styles.viewTabTextActive]}>
                  {mode === 'agenda' ? 'AGENDA' : mode.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category Filter Chips + Custom Category Manager */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catRow}
          >
            <TouchableOpacity
              style={[styles.catChip, selectedCategory === 'all' && styles.catChipActive]}
              onPress={() => setSelectedCategory('all')}
            >
              <Text
                style={[
                  styles.catChipText,
                  selectedCategory === 'all' && styles.catChipTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => {
              const active = selectedCategory.toLowerCase() === cat.name.toLowerCase();
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catChip, active && styles.catChipActive]}
                  onPress={() => setSelectedCategory(cat.name)}
                >
                  <View style={[styles.catColorDot, { backgroundColor: cat.color }]} />
                  <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.manageCatBtn}
              onPress={() => setCategoryModalOpen(true)}
            >
              <Text style={styles.manageCatBtnText}>+ Categories</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      }
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={eventsQuery.isRefetching}
            onRefresh={() => {
              void eventsQuery.refetch();
            }}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {eventsQuery.isLoading ? (
          <WorkspaceLoadingBlock message="Loading calendar & workspace schedules..." />
        ) : eventsQuery.isError ? (
          <WorkspaceErrorBlock
            message={(eventsQuery.error as any)?.message || 'Failed to load calendar events.'}
            onRetry={() => eventsQuery.refetch()}
          />
        ) : (
          <>
            {/* VIEW 1: MONTH GRID */}
            {viewMode === 'month' && (
              <View style={styles.monthCard}>
                <View style={styles.weekdayRow}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                    <Text key={idx} style={styles.weekdayLabel}>
                      {d}
                    </Text>
                  ))}
                </View>
                <View style={styles.monthGrid}>
                  {monthCells.map((cell) => {
                    if (!cell.date) {
                      return <View key={cell.key} style={styles.dayCell} />;
                    }
                    const ymd = toYmd(cell.date);
                    const dayEvents = filteredEvents.filter(
                      (ev) => toYmd(new Date(ev.startDate)) === ymd
                    );
                    const isToday = ymd === todayYmd;
                    const isSelected = ymd === toYmd(currentDate);

                    return (
                      <TouchableOpacity
                        key={cell.key}
                        style={[
                          styles.dayCell,
                          isToday && styles.dayCellToday,
                          isSelected && styles.dayCellSelected,
                        ]}
                        onPress={() => {
                          setCurrentDate(cell.date!);
                          setViewMode('day');
                        }}
                        onLongPress={() => openCreateModal(cell.date!)}
                      >
                        <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>
                          {cell.date.getDate()}
                        </Text>
                        <View style={styles.dotsRow}>
                          {dayEvents.slice(0, 3).map((ev) => (
                            <View
                              key={ev.id}
                              style={[
                                styles.eventDot,
                                { backgroundColor: getEventColor(ev) },
                              ]}
                            />
                          ))}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* VIEW 2: WEEK 7-DAY TIMELINE */}
            {viewMode === 'week' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.weekBoard}>
                  <View style={styles.weekHeaderRow}>
                    <View style={styles.hourLabelCol} />
                    {weekDates.map((wd) => {
                      const isToday = toYmd(wd) === todayYmd;
                      return (
                        <TouchableOpacity
                          key={toYmd(wd)}
                          style={[styles.weekDayColHeader, isToday && styles.dayCellToday]}
                          onPress={() => {
                            setCurrentDate(wd);
                            setViewMode('day');
                          }}
                        >
                          <Text style={styles.weekDayShort}>
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][wd.getDay()]}
                          </Text>
                          <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>
                            {wd.getDate()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {Array.from({ length: 13 }, (_, i) => i + 8).map((hour) => (
                    <View key={hour} style={styles.weekHourRow}>
                      <View style={styles.hourLabelCol}>
                        <Text style={styles.hourLabelText}>
                          {String(hour).padStart(2, '0')}:00
                        </Text>
                      </View>
                      {weekDates.map((wd) => {
                        const ymd = toYmd(wd);
                        const slotEvents = filteredEvents.filter((ev) => {
                          const sd = new Date(ev.startDate);
                          return toYmd(sd) === ymd && (ev.allDay ? hour === 8 : sd.getHours() === hour);
                        });
                        return (
                          <TouchableOpacity
                            key={`${ymd}-${hour}`}
                            style={styles.weekSlotCell}
                            onPress={() => openCreateModal(wd, hour)}
                          >
                            {slotEvents.map((ev) => (
                              <TouchableOpacity
                                key={ev.id}
                                style={[
                                  styles.miniSlotPill,
                                  { backgroundColor: getEventColor(ev) },
                                ]}
                                onPress={() => setSelectedEvent(ev)}
                              >
                                <Text style={styles.miniSlotText} numberOfLines={1}>
                                  {ev.title}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}

            {/* VIEW 3: DAY 24-HOUR TIMELINE */}
            {viewMode === 'day' && (
              <View style={styles.dayTimelineCard}>
                {Array.from({ length: 24 }, (_, hour) => {
                  const ymd = toYmd(currentDate);
                  const hourEvents = filteredEvents.filter((ev) => {
                    const sd = new Date(ev.startDate);
                    if (toYmd(sd) !== ymd) return false;
                    if (ev.allDay) return hour === 0;
                    return sd.getHours() === hour;
                  });
                  return (
                    <TouchableOpacity
                      key={hour}
                      style={styles.dayHourRow}
                      onPress={() => openCreateModal(currentDate, hour)}
                    >
                      <Text style={styles.dayHourLabel}>
                        {hour === 0 && hourEvents.some((e) => e.allDay)
                          ? 'ALL DAY'
                          : `${String(hour).padStart(2, '0')}:00`}
                      </Text>
                      <View style={styles.dayHourEventsCol}>
                        {hourEvents.map((ev) => (
                          <TouchableOpacity
                            key={ev.id}
                            style={[
                              styles.dayEventBlock,
                              { borderLeftColor: getEventColor(ev) },
                            ]}
                            onPress={() => setSelectedEvent(ev)}
                          >
                            <Text
                              style={[
                                styles.eventTitleText,
                                ev.status === 'cancelled' && styles.cancelledStrike,
                              ]}
                            >
                              {ev.title}
                            </Text>
                            <Text style={styles.eventMetaSmall}>
                              {ev.category}
                              {ev.isReadOnly ? ' • Read-Only' : ''}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* VIEW 4 (PRIMARY MOBILE): AGENDA / UPCOMING LIST */}
            {(viewMode === 'agenda' || viewMode === 'month') && (
              <View style={styles.agendaWrap}>
                <Text style={styles.sectionHeading}>
                  {viewMode === 'month' ? 'Month Schedule' : 'Agenda Schedule'}
                </Text>

                {agendaGroups.length === 0 ? (
                  <WorkspaceEmptyBlock
                    title="No Events Found"
                    description="No events or projections match this period or filter."
                    actionLabel="Schedule Event"
                    onAction={() => openCreateModal(currentDate)}
                  />
                ) : (
                  agendaGroups.map(([ymd, dayList]) => (
                    <View key={ymd} style={styles.agendaDayGroup}>
                      <Text style={styles.agendaDateHeader}>
                        {new Date(`${ymd}T00:00:00`).toLocaleDateString([], {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                      {dayList.map((evt) => {
                        const st = new Date(evt.startDate);
                        const en = new Date(evt.endDate);
                        const isCancelled = evt.status === 'cancelled';
                        return (
                          <TouchableOpacity
                            key={evt.id}
                            style={styles.agendaCard}
                            onPress={() => setSelectedEvent(evt)}
                          >
                            <View
                              style={[
                                styles.accentStrip,
                                { backgroundColor: getEventColor(evt) },
                              ]}
                            />
                            <View style={styles.agendaCardBody}>
                              <View style={styles.agendaTopRow}>
                                <Text
                                  style={[
                                    styles.eventTitleText,
                                    isCancelled && styles.cancelledStrike,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {evt.title}
                                </Text>
                                {evt.isReadOnly && (
                                  <View style={styles.readOnlyBadge}>
                                    <Text style={styles.readOnlyBadgeText}>Read-Only</Text>
                                  </View>
                                )}
                                {isCancelled && (
                                  <View style={styles.cancelledBadge}>
                                    <Text style={styles.cancelledBadgeText}>Cancelled</Text>
                                  </View>
                                )}
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Clock size={11} color="#64748B" />
                                <Text style={styles.eventMetaSmall}>
                                  {evt.allDay
                                    ? 'All Day'
                                    : `${st.toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })} – ${en.toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}`}{' '}
                                  • {evt.category}
                                </Text>
                              </View>
                              {(evt.roomName || evt.location) && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                  <MapPin size={11} color="#64748B" />
                                  <Text style={styles.eventMetaSmall} numberOfLines={1}>
                                    {evt.roomName ? `Room: ${evt.roomName}` : evt.location}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Date Picker Jump Modal */}
      <Modal visible={dateJumpOpen} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setDateJumpOpen(false)}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Jump to Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={jumpDateInput}
              onChangeText={setJumpDateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
            />
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                const parsed = new Date(`${jumpDateInput.trim()}T12:00:00`);
                if (Number.isNaN(parsed.getTime())) {
                  Alert.alert('Invalid Date', 'Enter date in YYYY-MM-DD format.');
                  return;
                }
                setCurrentDate(parsed);
                setDateJumpOpen(false);
              }}
            >
              <Text style={styles.primaryBtnText}>Go to Date</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Custom Category Manager Modal */}
      <Modal visible={categoryModalOpen} animationType="slide" transparent>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { maxHeight: '85%' }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Calendar Categories</Text>
              <TouchableOpacity
                onPress={() => {
                  setCategoryModalOpen(false);
                  setEditingCat(null);
                  setNewCatName('');
                }}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder={editingCat ? 'Rename category...' : 'New custom category name...'}
              placeholderTextColor="#94A3B8"
              value={newCatName}
              onChangeText={setNewCatName}
            />
            <View style={styles.swatchesRow}>
              {COLOR_SWATCHES.map((hex) => (
                <TouchableOpacity
                  key={hex}
                  style={[
                    styles.swatchCircle,
                    { backgroundColor: hex },
                    newCatColor === hex && styles.swatchSelected,
                  ]}
                  onPress={() => setNewCatColor(hex)}
                />
              ))}
            </View>
            <TouchableOpacity
              style={styles.primaryBtn}
              disabled={!newCatName.trim() || saveCategoryMutation.isPending}
              onPress={() => saveCategoryMutation.mutate()}
            >
              <Text style={styles.primaryBtnText}>
                {editingCat ? 'Update Category' : '+ Add Category'}
              </Text>
            </TouchableOpacity>

            <ScrollView style={{ marginTop: 14, maxHeight: 240 }}>
              {categories.map((cat) => (
                <View key={cat.id} style={styles.catListRow}>
                  <View style={[styles.catColorDot, { backgroundColor: cat.color }]} />
                  <Text style={[styles.eventTitleText, { flex: 1 }]}>{cat.name}</Text>
                  {!cat.isSystem && (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        onPress={() => {
                          setEditingCat(cat);
                          setNewCatName(cat.name);
                          setNewCatColor(cat.color);
                        }}
                      >
                        <Text style={styles.linkText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => deleteCategoryMutation.mutate(cat.id)}
                      >
                        <Text style={[styles.linkText, { color: '#DC2626' }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Event Details Bottom Sheet */}
      <Modal visible={!!selectedEvent && !auditModalOpen} animationType="slide" transparent>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { maxHeight: '88%' }]}>
            {selectedEvent && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>{selectedEvent.title}</Text>
                  <TouchableOpacity onPress={() => setSelectedEvent(null)}>
                    <X size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.detailMeta}>
                  Category: {selectedEvent.category}
                  {selectedEvent.isReadOnly ? ' (Read-Only Projection)' : ''}
                </Text>
                <Text style={styles.detailMeta}>
                  When: {new Date(selectedEvent.startDate).toLocaleString()} –{' '}
                  {new Date(selectedEvent.endDate).toLocaleString()}
                </Text>
                {selectedEvent.recurrenceRule && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Repeat size={12} color="#64748B" />
                    <Text style={styles.detailMeta}>
                      Repeats: {selectedEvent.recurrenceRule}
                    </Text>
                  </View>
                )}
                {selectedEvent.roomName && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Building2 size={12} color="#64748B" />
                    <Text style={styles.detailMeta}>Room: {selectedEvent.roomName}</Text>
                  </View>
                )}
                {selectedEvent.location ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <MapPin size={12} color="#64748B" />
                    <Text style={styles.detailMeta}>Location: {selectedEvent.location}</Text>
                  </View>
                ) : null}
                {selectedEvent.meetingLink ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Link size={12} color="#64748B" />
                    <Text style={styles.detailMeta}>Link: {selectedEvent.meetingLink}</Text>
                  </View>
                ) : null}
                {selectedEvent.description ? (
                  <Text style={[styles.detailMeta, { marginTop: 6 }]}>
                    {selectedEvent.description}
                  </Text>
                ) : null}

                {/* Read-Only Todo Task Projection Deep-Links */}
                {selectedEvent.linkedTaskId && (
                  <View style={styles.projectionActionsRow}>
                    <TouchableOpacity
                      style={styles.secondaryBtn}
                      onPress={() => {
                        const tid = selectedEvent.linkedTaskId;
                        setSelectedEvent(null);
                        navigation.navigate('TodoList', { taskId: tid });
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <CheckSquare size={14} color="#0F172A" />
                        <Text style={styles.secondaryBtnText}>Open in Todo</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.secondaryBtn}
                      onPress={() => {
                        const tid = selectedEvent.linkedTaskId;
                        setSelectedEvent(null);
                        navigation.navigate('GanttTimeline', { taskId: tid });
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <BarChart2 size={14} color="#0F172A" />
                        <Text style={styles.secondaryBtnText}>View in Gantt</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Invitee RSVP Bar */}
                {isSelectedInvitee && selectedEvent.status !== 'cancelled' && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.fieldLabel}>
                      Your RSVP ({selectedEvent.myRsvpStatus || 'pending'})
                    </Text>
                    <View style={styles.rsvpRow}>
                      {(['accepted', 'tentative', 'declined'] as const).map((st) => (
                        <TouchableOpacity
                          key={st}
                          style={[
                            styles.rsvpPill,
                            selectedEvent.myRsvpStatus === st && styles.rsvpPillActive,
                          ]}
                          onPress={() => rsvpMutation.mutate(st)}
                        >
                          <Text
                            style={[
                              styles.rsvpPillText,
                              selectedEvent.myRsvpStatus === st && { color: '#FFFFFF' },
                            ]}
                          >
                            {st.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Invited Attendees & Live Sharing */}
                {!selectedEvent.isReadOnly && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={styles.fieldLabel}>
                      Shared With ({(selectedEvent.shares || []).length})
                    </Text>
                    {(selectedEvent.shares || []).map((sh) => (
                      <View key={sh.recipientId} style={styles.shareRow}>
                        <Text style={styles.detailMeta}>
                          {sh.recipientName || sh.recipientEmail || sh.recipientId} ({sh.permission} •{' '}
                          {sh.rsvpStatus || 'pending'})
                        </Text>
                        {isSelectedOwnerOrAdmin && (
                          <TouchableOpacity
                            onPress={() =>
                              CalendarService.revokeEventShare(
                                selectedEvent.id,
                                sh.recipientId
                              ).then(() => {
                                setSelectedEvent({
                                  ...selectedEvent,
                                  shares: (selectedEvent.shares || []).filter(
                                    (x) => x.recipientId !== sh.recipientId
                                  ),
                                });
                                void queryClient.invalidateQueries({
                                  queryKey: createTenantQueryKey(['calendar']),
                                });
                              })
                            }
                          >
                            <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '700' }}>
                              Revoke
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}

                    {isSelectedOwnerOrAdmin && (
                      <View style={{ marginTop: 8 }}>
                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                          <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                            placeholder="Share with colleague..."
                            placeholderTextColor="#94A3B8"
                            value={detailShareQuery}
                            onChangeText={setDetailShareQuery}
                          />
                          <TouchableOpacity
                            style={styles.permToggleBtn}
                            onPress={() =>
                              setDetailSharePerm((p) => (p === 'view' ? 'edit' : 'view'))
                            }
                          >
                            <Text style={styles.permToggleText}>
                              Can {detailSharePerm}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        {detailShareQuery.trim().length > 0 &&
                          (recipientsQuery.data || []).slice(0, 4).map((rec) => (
                            <TouchableOpacity
                              key={rec.id}
                              style={styles.recipientPickRow}
                              onPress={() =>
                                CalendarService.shareEvent(
                                  selectedEvent.id,
                                  rec.id,
                                  detailSharePerm
                                )
                                  .then((shares) => {
                                    setDetailShareQuery('');
                                    setSelectedEvent({ ...selectedEvent, shares });
                                    void queryClient.invalidateQueries({
                                      queryKey: createTenantQueryKey(['calendar']),
                                    });
                                  })
                                  .catch((e) => Alert.alert('Share Error', e.message))
                              }
                            >
                              <Text style={styles.detailMeta}>
                                + {rec.name} ({rec.email})
                              </Text>
                            </TouchableOpacity>
                          ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Event Footer Actions */}
                {!selectedEvent.isReadOnly && (
                  <View style={styles.detailFooterActions}>
                    <TouchableOpacity
                      style={styles.secondaryBtn}
                      onPress={() =>
                        CalendarService.exportSingleEventIcs(
                          selectedEvent.id,
                          selectedEvent.title
                        ).catch((e) => Alert.alert('Export .ICS', e.message))
                      }
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Download size={14} color="#0F172A" />
                        <Text style={styles.secondaryBtnText}>Export .ICS</Text>
                      </View>
                    </TouchableOpacity>

                    {canEditSelected && (
                      <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={() => setAuditModalOpen(true)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <FileText size={14} color="#0F172A" />
                          <Text style={styles.secondaryBtnText}>Audit Trail</Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    {canEditSelected && selectedEvent.status !== 'cancelled' && (
                      <TouchableOpacity
                        style={styles.primaryBtnSmall}
                        onPress={() => openEditModal(selectedEvent)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Edit size={14} color="#FFFFFF" />
                          <Text style={styles.primaryBtnText}>Edit</Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    {isSelectedOwnerOrAdmin && selectedEvent.status !== 'cancelled' && (
                      <TouchableOpacity
                        style={styles.warnBtnSmall}
                        onPress={() => {
                          if (selectedEvent.recurrenceRule || selectedEvent.recurrenceParentId) {
                            setRecurrencePrompt({ mode: 'cancel' });
                          } else {
                            cancelMutation.mutate({ id: selectedEvent.id });
                          }
                        }}
                      >
                        <Text style={styles.warnBtnText}>Cancel Event</Text>
                      </TouchableOpacity>
                    )}

                    {isSelectedOwnerOrAdmin && (
                      <TouchableOpacity
                        style={styles.dangerBtnSmall}
                        onPress={() =>
                          Alert.alert('Delete Event', 'Permanently delete this event?', [
                            { text: 'No', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => deleteMutation.mutate(selectedEvent.id),
                            },
                          ])
                        }
                      >
                        <Text style={styles.dangerBtnText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Audit History Modal */}
      <Modal visible={auditModalOpen} animationType="slide" transparent>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { maxHeight: '80%' }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Event Audit History</Text>
              <TouchableOpacity onPress={() => setAuditModalOpen(false)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            {auditLogsQuery.isLoading ? (
              <ActivityIndicator color="#4F46E5" style={{ marginVertical: 20 }} />
            ) : (auditLogsQuery.data || []).length === 0 ? (
              <Text style={styles.detailMeta}>No audit history recorded for this event.</Text>
            ) : (
              <ScrollView>
                {(auditLogsQuery.data || []).map((log) => (
                  <View key={log.id} style={styles.auditRow}>
                    <Text style={styles.eventTitleText}>{log.action}</Text>
                    <Text style={styles.eventMetaSmall}>
                      {new Date(log.createdAt).toLocaleString()} • {log.userEmail || log.userId || 'System'}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Create / Edit Event Modal */}
      <Modal visible={formModalOpen} animationType="slide" transparent>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { maxHeight: '92%' }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </Text>
              <TouchableOpacity onPress={() => setFormModalOpen(false)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Event title..."
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.fieldLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.catChip, category === c.name && styles.catChipActive]}
                    onPress={() => setCategory(c.name)}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        category === c.name && styles.catChipTextActive,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Start Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    value={startDateStr}
                    onChangeText={setStartDateStr}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>End Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    value={endDateStr}
                    onChangeText={setEndDateStr}
                  />
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>All-Day Event</Text>
                <Switch value={allDay} onValueChange={setAllDay} />
              </View>

              {!allDay && (
                <View style={styles.twoColRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Start Time (HH:MM)</Text>
                    <TextInput
                      style={styles.input}
                      value={startTimeStr}
                      onChangeText={setStartTimeStr}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>End Time (HH:MM)</Text>
                    <TextInput
                      style={styles.input}
                      value={endTimeStr}
                      onChangeText={setEndTimeStr}
                    />
                  </View>
                </View>
              )}

              <Text style={styles.fieldLabel}>Meeting Room</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <TouchableOpacity
                  style={[styles.catChip, !roomId && styles.catChipActive]}
                  onPress={() => setRoomId('')}
                >
                  <Text style={[styles.catChipText, !roomId && styles.catChipTextActive]}>
                    None
                  </Text>
                </TouchableOpacity>
                {(roomsQuery.data || []).map((rm) => (
                  <TouchableOpacity
                    key={rm.id}
                    style={[styles.catChip, roomId === rm.id && styles.catChipActive]}
                    onPress={() => setRoomId(rm.id)}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        roomId === rm.id && styles.catChipTextActive,
                      ]}
                    >
                      {rm.name} ({rm.capacity})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Physical Location & Meeting URL</Text>
              <TextInput
                style={styles.input}
                placeholder="Location (optional)"
                placeholderTextColor="#94A3B8"
                value={location}
                onChangeText={setLocation}
              />
              <TextInput
                style={styles.input}
                placeholder="Meeting URL (https://...)"
                placeholderTextColor="#94A3B8"
                value={meetingLink}
                onChangeText={setMeetingLink}
                autoCapitalize="none"
              />

              <Text style={styles.fieldLabel}>Timezone</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {TIMEZONES.map((tz) => (
                  <TouchableOpacity
                    key={tz}
                    style={[styles.catChip, timezone === tz && styles.catChipActive]}
                    onPress={() => setTimezone(tz)}
                  >
                    <Text style={[styles.catChipText, timezone === tz && styles.catChipTextActive]}>
                      {tz}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Recurrence</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const).map((rf) => (
                  <TouchableOpacity
                    key={rf}
                    style={[styles.catChip, recurrenceFreq === rf && styles.catChipActive]}
                    onPress={() => setRecurrenceFreq(rf)}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        recurrenceFreq === rf && styles.catChipTextActive,
                      ]}
                    >
                      {rf}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {recurrenceFreq !== 'NONE' && (
                <TextInput
                  style={styles.input}
                  placeholder="Repeat Until (YYYY-MM-DD, optional)"
                  placeholderTextColor="#94A3B8"
                  value={recurrenceUntil}
                  onChangeText={setRecurrenceUntil}
                />
              )}

              <Text style={styles.fieldLabel}>Visibility</Text>
              <View style={styles.twoColRow}>
                {(
                  [
                    { k: 'private', label: 'Private' },
                    { k: 'team', label: 'Invitees' },
                    { k: 'organization', label: 'Entire Org' },
                  ] as const
                ).map((vis) => (
                  <TouchableOpacity
                    key={vis.k}
                    style={[styles.catChip, visibility === vis.k && styles.catChipActive]}
                    onPress={() => setVisibility(vis.k)}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        visibility === vis.k && styles.catChipTextActive,
                      ]}
                    >
                      {vis.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Organization Member Sharing Selector */}
              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>
                Invite & Share ({sharedWith.length})
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Search organization members..."
                placeholderTextColor="#94A3B8"
                value={recipientQuery}
                onChangeText={setRecipientQuery}
              />
              {(recipientsQuery.data || [])
                .filter((r) => !sharedWith.some((s) => s.recipientId === r.id))
                .slice(0, 4)
                .map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.recipientPickRow}
                    onPress={() =>
                      setSharedWith((prev) => [
                        ...prev,
                        { recipientId: r.id, name: r.name, permission: 'view' },
                      ])
                    }
                  >
                    <Text style={styles.detailMeta}>
                      + {r.name} ({r.department || r.email})
                    </Text>
                  </TouchableOpacity>
                ))}

              {sharedWith.map((sw) => (
                <View key={sw.recipientId} style={styles.shareRow}>
                  <Text style={styles.detailMeta}>{sw.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <TouchableOpacity
                      onPress={() =>
                        setSharedWith((prev) =>
                          prev.map((x) =>
                            x.recipientId === sw.recipientId
                              ? {
                                  ...x,
                                  permission: x.permission === 'view' ? 'edit' : 'view',
                                }
                              : x
                          )
                        )
                      }
                    >
                      <Text style={styles.linkText}>Can {sw.permission}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        setSharedWith((prev) =>
                          prev.filter((x) => x.recipientId !== sw.recipientId)
                        )
                      }
                    >
                      <X size={14} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Reminders Configurator (up to 5) */}
              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>
                Reminders ({reminders.length}/5)
              </Text>
              {reminders.map((rem, idx) => (
                <View key={idx} style={styles.shareRow}>
                  <TouchableOpacity
                    onPress={() =>
                      setReminders((prev) =>
                        prev.map((r, i) => {
                          if (i !== idx) return r;
                          const currIdx = REMINDER_MINUTES.findIndex(
                            (m) => m.value === r.minutesBefore
                          );
                          const nextOpt =
                            REMINDER_MINUTES[(currIdx + 1) % REMINDER_MINUTES.length];
                          return { ...r, minutesBefore: nextOpt.value };
                        })
                      )
                    }
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Bell size={12} color="#64748B" />
                      <Text style={styles.detailMeta}>
                        {REMINDER_MINUTES.find((m) => m.value === rem.minutesBefore)?.label ||
                          `${rem.minutesBefore}m`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <TouchableOpacity
                      onPress={() =>
                        setReminders((prev) =>
                          prev.map((r, i) =>
                            i === idx
                              ? {
                                  ...r,
                                  channel:
                                    r.channel === 'in_app'
                                      ? 'email'
                                      : r.channel === 'email'
                                      ? 'both'
                                      : 'in_app',
                                }
                              : r
                          )
                        )
                      }
                    >
                      <Text style={styles.linkText}>{rem.channel.toUpperCase()}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        setReminders((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      <X size={14} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {reminders.length < 5 && (
                <TouchableOpacity
                  onPress={() =>
                    setReminders((prev) => [
                      ...prev,
                      { minutesBefore: 30, channel: 'in_app' },
                    ])
                  }
                  style={{ marginBottom: 10 }}
                >
                  <Text style={styles.linkText}>+ Add Reminder</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.input, { minHeight: 72 }]}
                placeholder="Agenda or notes..."
                placeholderTextColor="#94A3B8"
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <TouchableOpacity
                style={styles.primaryBtn}
                disabled={saveEventMutation.isPending}
                onPress={handleSubmitEventForm}
              >
                {saveEventMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {editingEvent ? 'Save Changes' : 'Schedule Event'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Scheduling Conflict Warning Modal */}
      <Modal visible={!!conflictPrompt} animationType="fade" transparent>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <AlertTriangle size={18} color="#D97706" />
              <Text style={styles.sheetTitle}>Scheduling Conflict Detected</Text>
            </View>
            <Text style={styles.detailMeta}>
              The selected meeting room or attendee has an overlapping commitment.
            </Text>
            {(conflictPrompt?.conflicts || []).slice(0, 3).map((c: any, idx: number) => (
              <Text key={idx} style={styles.eventMetaSmall}>
                • {c?.title || c?.roomName || 'Booked slot'}
              </Text>
            ))}
            <View style={[styles.twoColRow, { marginTop: 14 }]}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { flex: 1 }]}
                onPress={() => setConflictPrompt(null)}
              >
                <Text style={styles.secondaryBtnText}>Change Time</Text>
              </TouchableOpacity>
              {canOverrideConflicts && conflictPrompt && (
                <TouchableOpacity
                  style={[styles.primaryBtnSmall, { flex: 1 }]}
                  onPress={() =>
                    saveEventMutation.mutate({
                      ...conflictPrompt.pendingPayload,
                      ignoreConflicts: true,
                    })
                  }
                >
                  <Text style={styles.primaryBtnText}>Save Anyway</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Recurrence Scope Prompt Modal */}
      <Modal visible={!!recurrencePrompt} animationType="fade" transparent>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Recurring Series Scope</Text>
            <Text style={styles.detailMeta}>
              Apply this change to only this occurrence or all events in the series?
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                if (recurrencePrompt?.mode === 'edit' && recurrencePrompt.pendingPayload) {
                  saveEventMutation.mutate({
                    ...recurrencePrompt.pendingPayload,
                    recurrenceScope: 'this_occurrence',
                    occurrenceDate: editingEvent?.startDate,
                  });
                } else if (selectedEvent) {
                  cancelMutation.mutate({
                    id: selectedEvent.id,
                    recurrenceScope: 'this_occurrence',
                    occurrenceDate: selectedEvent.startDate,
                  });
                }
              }}
            >
              <Text style={styles.primaryBtnText}>This Occurrence Only</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { marginTop: 8 }]}
              onPress={() => {
                if (recurrencePrompt?.mode === 'edit' && recurrencePrompt.pendingPayload) {
                  saveEventMutation.mutate({
                    ...recurrencePrompt.pendingPayload,
                    recurrenceScope: 'all',
                  });
                } else if (selectedEvent) {
                  cancelMutation.mutate({
                    id: selectedEvent.id,
                    recurrenceScope: 'all',
                  });
                }
              }}
            >
              <Text style={styles.secondaryBtnText}>All Events in Series</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ alignItems: 'center', marginTop: 10 }}
              onPress={() => setRecurrencePrompt(null)}
            >
              <Text style={styles.eventMetaSmall}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </WorkspaceModuleShell>
  );
};

const styles = StyleSheet.create({
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icsBtn: {
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icsBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  createBtn: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  controlsWrap: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBar: {
    minHeight: 42,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  chevronBtn: {
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  periodTouch: {
    flex: 1,
    alignItems: 'center',
  },
  periodHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  todayBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  todayBtnText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
  },
  viewTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 8,
  },
  viewTab: {
    flex: 1,
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  viewTabActive: {
    backgroundColor: '#FFFFFF',
  },
  viewTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  viewTabTextActive: {
    color: '#1E1B4B',
  },
  catRow: {
    gap: 6,
    paddingVertical: 2,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 6,
    gap: 5,
  },
  catChipActive: {
    backgroundColor: '#1E1B4B',
    borderColor: '#1E1B4B',
  },
  catColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  catChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  manageCatBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
  },
  manageCatBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  monthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekdayLabel: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 4,
  },
  dayCellToday: {
    backgroundColor: '#EEF2FF',
  },
  dayCellSelected: {
    borderWidth: 1.5,
    borderColor: '#4F46E5',
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  dayNumToday: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 3,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  weekBoard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  weekHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  hourLabelCol: {
    width: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  hourLabelText: {
    fontSize: 10,
    color: '#64748B',
  },
  weekDayColHeader: {
    width: 76,
    paddingVertical: 8,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  weekDayShort: {
    fontSize: 10,
    color: '#64748B',
  },
  weekHourRow: {
    flexDirection: 'row',
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  weekSlotCell: {
    width: 76,
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  miniSlotPill: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginBottom: 2,
  },
  miniSlotText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  dayTimelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  dayHourRow: {
    flexDirection: 'row',
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dayHourLabel: {
    width: 62,
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  dayHourEventsCol: {
    flex: 1,
    gap: 4,
  },
  dayEventBlock: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 8,
  },
  agendaWrap: {
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  agendaDayGroup: {
    marginBottom: 14,
  },
  agendaDateHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
    marginBottom: 6,
  },
  agendaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 8,
  },
  accentStrip: {
    width: 5,
  },
  agendaCardBody: {
    flex: 1,
    padding: 12,
  },
  agendaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 4,
  },
  eventTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  cancelledStrike: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  eventMetaSmall: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  readOnlyBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  readOnlyBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  cancelledBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cancelledBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#DC2626',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
    paddingHorizontal: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    minHeight: 44,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 10,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  swatchesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  swatchCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: '#0F172A',
  },
  catListRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  detailMeta: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 4,
  },
  projectionActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  rsvpRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rsvpPill: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rsvpPillActive: {
    backgroundColor: '#4F46E5',
  },
  rsvpPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  permToggleBtn: {
    minHeight: 42,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
  },
  permToggleText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
  },
  recipientPickRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailFooterActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  primaryBtn: {
    minHeight: 46,
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnSmall: {
    minHeight: 40,
    paddingHorizontal: 14,
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
  },
  warnBtnSmall: {
    minHeight: 40,
    paddingHorizontal: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warnBtnText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '700',
  },
  dangerBtnSmall: {
    minHeight: 40,
    paddingHorizontal: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  auditRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
});
