import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Dialog } from '@/components/ui/dialog';
import AttendeeView from './views/attendees';
import MinuteView from './views/minutes';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Trash2, RefreshCw, Plus, CalendarDays, Clock, MapPin, FileText, Users, MessageSquare, CheckSquare, StickyNote, Gavel, User } from 'lucide-react';
import { getImagePath } from '@/utils/helpers';
import { useInitials } from '@/hooks/use-initials';
import UserInitials from '@/components/user-initials';

export default function MeetingShow() {
    const { t } = useTranslation();
    const { auth, meeting, meetingAttendees, meetingMinutes, employees, meetingTypes, meetingRooms, globalSettings, filters: pageFilters = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const getInitials = useInitials();

    const canManageAttendees = hasPermission(permissions, 'manage-meeting-attendees');
    const canManageMinutes = hasPermission(permissions, 'manage-meeting-minutes');
    const defaultTab = canManageAttendees ? 'attendees' : canManageMinutes ? 'minutes' : 'attendees';
    const [activeTab, setActiveTab] = useState<'attendees' | 'minutes'>(pageFilters.tab || defaultTab);

    // ── Meeting modals ────────────────────────────────────────────────────────
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(meeting?.status || '');

    // ── Attendee state ────────────────────────────────────────────────────────
    const [isAttendeeFormOpen, setIsAttendeeFormOpen] = useState(false);
    const [isAttendeeDeleteOpen, setIsAttendeeDeleteOpen] = useState(false);
    const [isRsvpModalOpen, setIsRsvpModalOpen] = useState(false);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [viewingAttendee, setViewingAttendee] = useState<any>(null);
    const [currentAttendee, setCurrentAttendee] = useState<any>(null);
    const [attendeeFormMode, setAttendeeFormMode] = useState<'create' | 'edit'>('create');
    const [selectedRsvpStatus, setSelectedRsvpStatus] = useState('');
    const [selectedAttendanceStatus, setSelectedAttendanceStatus] = useState('');

    // ── Attendee filters ──────────────────────────────────────────────────────
    const [attendeeInitial, setAttendeeInitial] = useState(true);
    const [attendeeSearch, setAttendeeSearch] = useState(pageFilters.attendee_search || '');
    const [rsvpFilter, setRsvpFilter] = useState(pageFilters.rsvp_status || '_empty_');
    const [attendanceFilter, setAttendanceFilter] = useState(pageFilters.attendance_status || '_empty_');
    const [showAttendeeFilters, setShowAttendeeFilters] = useState(false);

    // ── Minute state ──────────────────────────────────────────────────────────
    const [isMinuteFormOpen, setIsMinuteFormOpen] = useState(false);
    const [isMinuteDeleteOpen, setIsMinuteDeleteOpen] = useState(false);
    const [viewingMinute, setViewingMinute] = useState<any>(null);
    const [currentMinute, setCurrentMinute] = useState<any>(null);
    const [minuteFormMode, setMinuteFormMode] = useState<'create' | 'edit'>('create');

    // ── Minute filters ────────────────────────────────────────────────────────
    const [minuteInitial, setMinuteInitial] = useState(true);
    const [minuteSearch, setMinuteSearch] = useState(pageFilters.minute_search || '');
    const [minuteTypeFilter, setMinuteTypeFilter] = useState(pageFilters.minute_type || '_empty_');
    const [recorderFilter, setRecorderFilter] = useState(pageFilters.recorded_by || '_empty_');
    const [showMinuteFilters, setShowMinuteFilters] = useState(false);

    // ── Filter effects ────────────────────────────────────────────────────────

    useEffect(() => {
        if (!attendeeInitial) applyAttendeeFilters();
        setAttendeeInitial(false);
    }, [rsvpFilter, attendanceFilter]);

    useEffect(() => {
        if (!minuteInitial) applyMinuteFilters();
        setMinuteInitial(false);
    }, [minuteTypeFilter, recorderFilter]);

    // ── Filter helpers ────────────────────────────────────────────────────────

    const applyAttendeeFilters = (overrides: any = {}) => {
        router.get(route('meetings.meetings.show', meeting.id), {
            ...pageFilters,
            attendee_page: 1,
            attendee_search: overrides.attendee_search ?? (attendeeSearch || undefined),
            rsvp_status: overrides.rsvp_status ?? (rsvpFilter !== '_empty_' ? rsvpFilter : undefined),
            attendance_status: overrides.attendance_status ?? (attendanceFilter !== '_empty_' ? attendanceFilter : undefined),
            attendee_per_page: overrides.attendee_per_page ?? pageFilters.attendee_per_page,
            attendee_sort_field: overrides.attendee_sort_field ?? pageFilters.attendee_sort_field,
            attendee_sort_direction: overrides.attendee_sort_direction ?? pageFilters.attendee_sort_direction,
        }, { preserveState: true, preserveScroll: true });
    };

    const applyMinuteFilters = (overrides: any = {}) => {
        router.get(route('meetings.meetings.show', meeting.id), {
            ...pageFilters,
            minute_page: 1,
            minute_search: overrides.minute_search ?? (minuteSearch || undefined),
            minute_type: overrides.minute_type ?? (minuteTypeFilter !== '_empty_' ? minuteTypeFilter : undefined),
            recorded_by: overrides.recorded_by ?? (recorderFilter !== '_empty_' ? recorderFilter : undefined),
            minute_per_page: overrides.minute_per_page ?? pageFilters.minute_per_page,
            minute_sort_field: overrides.minute_sort_field ?? pageFilters.minute_sort_field,
            minute_sort_direction: overrides.minute_sort_direction ?? pageFilters.minute_sort_direction,
        }, { preserveState: true, preserveScroll: true });
    };

    const handleAttendeeSort = (field: string) => {
        const dir = pageFilters.attendee_sort_field === field && pageFilters.attendee_sort_direction === 'asc' ? 'desc' : 'asc';
        applyAttendeeFilters({ attendee_sort_field: field, attendee_sort_direction: dir });
    };

    const handleMinuteSort = (field: string) => {
        const dir = pageFilters.minute_sort_field === field && pageFilters.minute_sort_direction === 'asc' ? 'desc' : 'asc';
        applyMinuteFilters({ minute_sort_field: field, minute_sort_direction: dir });
    };

    const handleAttendeePageChange = (url: string) => {
        const page = new URL(url).searchParams.get('attendee_page') || '1';
        router.get(route('meetings.meetings.show', meeting.id), { ...pageFilters, attendee_page: page }, { preserveState: true, preserveScroll: true });
    };

    const handleMinutePageChange = (url: string) => {
        const page = new URL(url).searchParams.get('minute_page') || '1';
        router.get(route('meetings.meetings.show', meeting.id), { ...pageFilters, minute_page: page }, { preserveState: true, preserveScroll: true });
    };

    const resetAttendeeFilters = () => {
        setAttendeeSearch(''); setRsvpFilter('_empty_'); setAttendanceFilter('_empty_');
        router.get(route('meetings.meetings.show', meeting.id), { tab: activeTab });
    };

    const resetMinuteFilters = () => {
        setMinuteSearch(''); setMinuteTypeFilter('_empty_'); setRecorderFilter('_empty_');
        router.get(route('meetings.meetings.show', meeting.id), { tab: activeTab });
    };

    // ── Meeting handlers ──────────────────────────────────────────────────────

    const handleMeetingEdit = (formData: any) => {
        if (!globalSettings?.is_demo) toast.loading(t('Updating meeting...'));
        router.put(route('meetings.meetings.update', meeting.id), formData, {
            onSuccess: (page) => {
                setIsEditModalOpen(false);
                if (!globalSettings?.is_demo) toast.dismiss();
                if (page.props.flash?.success) toast.success(t(page.props.flash.success));
                else if (page.props.flash?.error) toast.error(t(page.props.flash.error));
            },
            onError: (errors) => { if (!globalSettings?.is_demo) toast.dismiss(); toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', ')); },
        });
    };

    const handleMeetingDelete = () => {
        if (!globalSettings?.is_demo) toast.loading(t('Deleting meeting...'));
        router.delete(route('meetings.meetings.destroy', meeting.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                if (!globalSettings?.is_demo) toast.dismiss();
                if (page.props.flash?.success) toast.success(t(page.props.flash.success));
                router.get(route('meetings.meetings.index'));
            },
            onError: (errors) => { if (!globalSettings?.is_demo) toast.dismiss(); toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', ')); },
        });
    };

    const handleStatusUpdate = (formData: any) => {
        if (!globalSettings?.is_demo) toast.loading(t('Updating status...'));
        router.put(route('meetings.meetings.update-status', meeting.id), { status: formData.status }, {
            onSuccess: (page) => {
                setIsStatusModalOpen(false);
                if (!globalSettings?.is_demo) toast.dismiss();
                if (page.props.flash?.success) toast.success(t(page.props.flash.success));
                else if (page.props.flash?.error) toast.error(t(page.props.flash.error));
            },
            onError: (errors) => { if (!globalSettings?.is_demo) toast.dismiss(); toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', ')); },
        });
    };

    // ── Attendee handlers ─────────────────────────────────────────────────────

    const handleAttendeeAction = (action: string, item: any) => {
        setCurrentAttendee(item);
        switch (action) {
            case 'view': setViewingAttendee(item); break;
            case 'edit': setAttendeeFormMode('edit'); setIsAttendeeFormOpen(true); break;
            case 'update-rsvp': setSelectedRsvpStatus(item.rsvp_status); setIsRsvpModalOpen(true); break;
            case 'update-attendance': setSelectedAttendanceStatus(item.attendance_status); setIsAttendanceModalOpen(true); break;
            case 'delete': setIsAttendeeDeleteOpen(true); break;
        }
    };

    const handleAttendeeSubmit = (formData: any) => {
        if (attendeeFormMode === 'create') {
            if (!globalSettings?.is_demo) toast.loading(t('Adding attendee...'));
            router.post(route('meetings.meeting-attendees.store'), { ...formData, meeting_id: meeting.id }, {
                onSuccess: (page) => { setIsAttendeeFormOpen(false); if (!globalSettings?.is_demo) toast.dismiss(); if (page.props.flash?.success) toast.success(t(page.props.flash.success)); else if (page.props.flash?.error) toast.error(t(page.props.flash.error)); },
                onError: (errors) => { if (!globalSettings?.is_demo) toast.dismiss(); toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', ')); },
            });
        } else {
            if (!globalSettings?.is_demo) toast.loading(t('Updating attendee...'));
            router.put(route('meetings.meeting-attendees.update', currentAttendee.id), { ...formData, meeting_id: meeting.id }, {
                onSuccess: (page) => { setIsAttendeeFormOpen(false); if (!globalSettings?.is_demo) toast.dismiss(); if (page.props.flash?.success) toast.success(t(page.props.flash.success)); else if (page.props.flash?.error) toast.error(t(page.props.flash.error)); },
                onError: (errors) => { if (!globalSettings?.is_demo) toast.dismiss(); toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', ')); },
            });
        }
    };

    const handleAttendeeDelete = () => {
        if (!globalSettings?.is_demo) toast.loading(t('Removing attendee...'));
        router.delete(route('meetings.meeting-attendees.destroy', currentAttendee.id), {
            onSuccess: (page) => { setIsAttendeeDeleteOpen(false); if (!globalSettings?.is_demo) toast.dismiss(); if (page.props.flash?.success) toast.success(t(page.props.flash.success)); else if (page.props.flash?.error) toast.error(t(page.props.flash.error)); },
            onError: (errors) => { if (!globalSettings?.is_demo) toast.dismiss(); toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', ')); },
        });
    };

    const handleRsvpUpdate = (formData: any) => {
        if (!globalSettings?.is_demo) toast.loading(t('Updating RSVP...'));
        router.put(route('meetings.meeting-attendees.update-rsvp', currentAttendee.id), formData, {
            onSuccess: (page) => { setIsRsvpModalOpen(false); if (!globalSettings?.is_demo) toast.dismiss(); if (page.props.flash?.success) toast.success(t(page.props.flash.success)); else if (page.props.flash?.error) toast.error(t(page.props.flash.error)); },
            onError: (errors) => { if (!globalSettings?.is_demo) toast.dismiss(); toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', ')); },
        });
    };

    const handleAttendanceUpdate = (formData: any) => {
        if (!globalSettings?.is_demo) toast.loading(t('Updating attendance...'));
        router.put(route('meetings.meeting-attendees.update-attendance', currentAttendee.id), formData, {
            onSuccess: (page) => { setIsAttendanceModalOpen(false); if (!globalSettings?.is_demo) toast.dismiss(); if (page.props.flash?.success) toast.success(t(page.props.flash.success)); else if (page.props.flash?.error) toast.error(t(page.props.flash.error)); },
            onError: (errors) => { if (!globalSettings?.is_demo) toast.dismiss(); toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', ')); },
        });
    };

    // ── Minute handlers ───────────────────────────────────────────────────────

    const handleMinuteAction = (action: string, item: any) => {
        setCurrentMinute(item);
        switch (action) {
            case 'view': setViewingMinute(item); break;
            case 'edit': setMinuteFormMode('edit'); setIsMinuteFormOpen(true); break;
            case 'delete': setIsMinuteDeleteOpen(true); break;
        }
    };

    const handleMinuteSubmit = (formData: any) => {
        if (formData.recorded_date && formData.recorded_time) {
            formData.recorded_at = `${formData.recorded_date} ${formData.recorded_time}`;
        } else if (formData.recorded_date) {
            formData.recorded_at = `${formData.recorded_date} 00:00`;
        }
        delete formData.recorded_date;
        delete formData.recorded_time;

        if (minuteFormMode === 'create') {
            if (!globalSettings?.is_demo) toast.loading(t('Adding minute...'));
            router.post(route('meetings.meeting-minutes.store'), { ...formData, meeting_id: meeting.id }, {
                onSuccess: (page) => { setIsMinuteFormOpen(false); if (!globalSettings?.is_demo) toast.dismiss(); if (page.props.flash?.success) toast.success(t(page.props.flash.success)); else if (page.props.flash?.error) toast.error(t(page.props.flash.error)); },
                onError: (errors) => { if (!globalSettings?.is_demo) toast.dismiss(); toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', ')); },
            });
        } else {
            if (!globalSettings?.is_demo) toast.loading(t('Updating minute...'));
            router.put(route('meetings.meeting-minutes.update', currentMinute.id), { ...formData, meeting_id: meeting.id }, {
                onSuccess: (page) => { setIsMinuteFormOpen(false); if (!globalSettings?.is_demo) toast.dismiss(); if (page.props.flash?.success) toast.success(t(page.props.flash.success)); else if (page.props.flash?.error) toast.error(t(page.props.flash.error)); },
                onError: (errors) => { if (!globalSettings?.is_demo) toast.dismiss(); toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', ')); },
            });
        }
    };

    const handleMinuteDelete = () => {
        if (!globalSettings?.is_demo) toast.loading(t('Deleting minute...'));
        router.delete(route('meetings.meeting-minutes.destroy', currentMinute.id), {
            onSuccess: (page) => { setIsMinuteDeleteOpen(false); if (!globalSettings?.is_demo) toast.dismiss(); if (page.props.flash?.success) toast.success(t(page.props.flash.success)); else if (page.props.flash?.error) toast.error(t(page.props.flash.error)); },
            onError: (errors) => { if (!globalSettings?.is_demo) toast.dismiss(); toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', ')); },
        });
    };

    // ── Helpers ───────────────────────────────────────────────────────────────

    const statusConfig: Record<string, string> = {
        'Scheduled': 'bg-blue-50 text-blue-700 ring-blue-700/10',
        'In Progress': 'bg-yellow-50 text-yellow-700 ring-yellow-700/10',
        'Completed': 'bg-green-50 text-green-700 ring-green-700/10',
        'Cancelled': 'bg-red-50 text-red-700 ring-red-700/10',
    };
    const statusBadge = (s: string) => statusConfig[s] ?? 'bg-gray-50 text-gray-600 ring-gray-500/10';
    const rsvpBadge = (s: string) => ({ 'Accepted': 'bg-green-50 text-green-700 ring-green-600/20', 'Declined': 'bg-red-50 text-red-700 ring-red-600/10', 'Tentative': 'bg-yellow-50 text-yellow-800 ring-yellow-600/20', 'Pending': 'bg-orange-50 text-orange-700 ring-orange-600/20' }[s] ?? 'bg-gray-50 text-gray-600 ring-gray-500/10');
    const attendanceBadge = (s: string) => ({ 'Present': 'bg-green-50 text-green-700 ring-green-600/20', 'Late': 'bg-yellow-50 text-yellow-800 ring-yellow-600/20', 'Left Early': 'bg-orange-50 text-orange-700 ring-orange-600/20', 'Not Attended': 'bg-red-50 text-red-700 ring-red-600/10' }[s] ?? 'bg-gray-50 text-gray-600 ring-gray-500/10');
    const minuteTypeBadge = (s: string) => ({ 'Discussion': 'bg-blue-50 text-blue-700 ring-blue-600/20', 'Decision': 'bg-green-50 text-green-700 ring-green-600/20', 'Action Item': 'bg-orange-50 text-orange-700 ring-orange-600/20', 'Note': 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' }[s] ?? 'bg-gray-50 text-gray-600 ring-gray-500/10');

    const employeeOptions = (employees || []).map((e: any) => ({ value: e.id.toString(), label: e.name }));
    const typeOptions = (meetingTypes || []).map((m: any) => ({ value: m.id.toString(), label: m.name }));
    const roomOptions = (meetingRooms || []).map((r: any) => ({ value: r.id.toString(), label: `${r.name} (${r.type})` }));

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Meetings'), href: route('meetings.meetings.index') },
        { title: t('Meeting Details') },
    ];

    const pageActions: any[] = [
        { label: t('Back'), icon: <ArrowLeft className="h-4 w-4 mr-2" />, variant: 'outline', onClick: () => router.get(route('meetings.meetings.index')) },
    ];

    // ── Details card ──────────────────────────────────────────────────────────

    const detailsCard = (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">{meeting.title}</h2>
                    {meeting.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{meeting.description}</p>}
                </div>
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusBadge(meeting.status)}`}>{t(meeting.status)}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('Date')}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        {meeting.meeting_date ? window.appSettings?.formatDateTimeSimple(meeting.meeting_date, false) : '-'}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('Time')}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        {meeting.start_time && meeting.end_time
                            ? `${window.appSettings?.formatTime(meeting.start_time)} – ${window.appSettings?.formatTime(meeting.end_time)}`
                            : '-'}
                        {meeting.duration && <span className="text-gray-400 text-xs">({meeting.duration}m)</span>}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('Room')}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        {meeting.room?.name || t('No location')}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('Type')}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        {meeting.type?.name || '-'}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('Organizer')}</p>
                    <div className="flex items-center gap-1.5">
                        {meeting.organizer?.avatar ? (
                            <img src={meeting.organizer.avatar} alt={meeting.organizer.name} className="h-8 w-8 rounded-full object-cover shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = getImagePath('avatars/avatar.png'); }} />
                        ) : (
                            <UserInitials name={meeting.organizer?.name || ''} />
                        )}
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{meeting.organizer?.name || '-'}</p>
                            <p className="text-sm text-gray-500 dark:text-white">{meeting.organizer?.email || '-'}</p>
                        </div>
                    </div>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('Recurrence')}</p>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${meeting.recurrence === 'None' ? 'bg-gray-50 text-gray-600 ring-gray-500/10' : 'bg-purple-50 text-purple-700 ring-purple-700/10'}`}>
                        {t(meeting.recurrence) || '-'}
                    </span>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('Attendees')}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        {meeting.attendees_count ?? meetingAttendees?.total ?? 0}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('Minutes')}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        {meeting.minutes_count ?? meetingMinutes?.total ?? 0}
                    </p>
                </div>
            </div>
            {meeting.agenda && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('Agenda')}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{meeting.agenda}</p>
                </div>
            )}
        </div>
    );

    // ── Attendees tab ─────────────────────────────────────────────────────────

    const attendeeColumns = [
        {
            key: 'user.name',
            label: t('Attendee'),
            render: (_: any, row: any) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white overflow-hidden shrink-0">
                        {row.user?.avatar
                            ? <img src={row.user.avatar} alt={row.user?.name} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = getImagePath('avatars/avatar.png'); }} />
                            : <span className="text-sm font-semibold">{getInitials(row.user?.name || '')}</span>}
                    </div>
                    <div>
                        <div className="font-medium">{row.user?.name || '-'}</div>
                        <div className="text-sm text-muted-foreground">{row.user?.email || ''}</div>
                    </div>
                </div>
            ),
        },
        {
            key: 'rsvp_status',
            label: t('RSVP'),
            render: (value: string) => (
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${rsvpBadge(value)}`}>{t(value)}</span>
            ),
        },
        {
            key: 'attendance_status',
            label: t('Attendance'),
            render: (value: string) => (
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${attendanceBadge(value)}`}>{t(value)}</span>
            ),
        },
        {
            key: 'rsvp_date',
            label: t('RSVP Date'),
            sortable: true,
            type: 'date' as const,
        },
    ];

    const attendeeActions = [
        { label: t('View'), icon: 'Eye', action: 'view', className: 'text-blue-500', requiredPermission: 'view-meeting-attendees' },
        { label: t('Edit'), icon: 'Edit', action: 'edit', className: 'text-amber-500', requiredPermission: 'edit-meeting-attendees' },
        { label: t('Update RSVP'), icon: 'MessageSquare', action: 'update-rsvp', className: 'text-green-500', requiredPermission: 'manage-meeting-rsvp-status' },
        { label: t('Update Attendance'), icon: 'UserCheck', action: 'update-attendance', className: 'text-purple-500', requiredPermission: 'manage-meeting-attendance' },
        { label: t('Remove'), icon: 'Trash2', action: 'delete', className: 'text-red-500', requiredPermission: 'delete-meeting-attendees' },
    ];

    const rsvpOptions = [
        { value: '_empty_', label: t('All RSVP') },
        { value: 'Pending', label: t('Pending') },
        { value: 'Accepted', label: t('Accepted') },
        { value: 'Declined', label: t('Declined') },
        { value: 'Tentative', label: t('Tentative') },
    ];

    const attendanceOptions = [
        { value: '_empty_', label: t('All Attendance') },
        { value: 'Not Attended', label: t('Not Attended') },
        { value: 'Present', label: t('Present') },
        { value: 'Late', label: t('Late') },
        { value: 'Left Early', label: t('Left Early') },
    ];

    const attendeesPlaceholder = (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
                <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{t('No attendees yet')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-xs">{t('Add attendees to track who is invited, their RSVP status, and attendance.')}</p>
            {hasPermission(permissions, 'create-meeting-attendees') && (
                <Button size="sm" onClick={() => { setCurrentAttendee(null); setAttendeeFormMode('create'); setIsAttendeeFormOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" />{t('Add First Attendee')}
                </Button>
            )}
        </div>
    );

    const attendeesTab = (
        <>
            {(!meetingAttendees?.data?.length) ? attendeesPlaceholder : (<>
            <div className="bg-white dark:bg-gray-900 shadow mb-0 border-b border-gray-200 dark:border-gray-700">
                <SearchAndFilterBar
                    searchTerm={attendeeSearch}
                    onSearchChange={setAttendeeSearch}
                    onSearch={(e) => { e.preventDefault(); applyAttendeeFilters(); }}
                    filters={[
                        { name: 'rsvp_status', label: t('RSVP Status'), type: 'select', value: rsvpFilter, onChange: setRsvpFilter, options: rsvpOptions },
                        { name: 'attendance_status', label: t('Attendance'), type: 'select', value: attendanceFilter, onChange: setAttendanceFilter, options: attendanceOptions },
                    ]}
                    showFilters={showAttendeeFilters}
                    setShowFilters={setShowAttendeeFilters}
                    hasActiveFilters={() => rsvpFilter !== '_empty_' || attendanceFilter !== '_empty_' || attendeeSearch !== ''}
                    activeFilterCount={() => (rsvpFilter !== '_empty_' ? 1 : 0) + (attendanceFilter !== '_empty_' ? 1 : 0) + (attendeeSearch !== '' ? 1 : 0)}
                    onResetFilters={resetAttendeeFilters}
                />
            </div>
            <CrudTable
                columns={attendeeColumns}
                actions={attendeeActions}
                data={meetingAttendees?.data || []}
                from={meetingAttendees?.from || 1}
                onAction={handleAttendeeAction}
                sortField={pageFilters.attendee_sort_field}
                sortDirection={pageFilters.attendee_sort_direction}
                onSort={handleAttendeeSort}
                permissions={permissions}
                entityPermissions={{ view: 'view-meeting-attendees', edit: 'edit-meeting-attendees', delete: 'delete-meeting-attendees' }}
            />
            <Pagination
                from={meetingAttendees?.from || 0}
                to={meetingAttendees?.to || 0}
                total={meetingAttendees?.total || 0}
                links={meetingAttendees?.links}
                entityName={t('attendees')}
                onPageChange={handleAttendeePageChange}
                currentPerPage={pageFilters.attendee_per_page?.toString() || '10'}
                onPerPageChange={(value) => applyAttendeeFilters({ attendee_per_page: parseInt(value) })}
            />
            </>)}
        </>
    );

    // ── Minutes tab ───────────────────────────────────────────────────────────

    const minuteColumns = [
        {
            key: 'topic',
            label: t('Topic'),
            sortable: true,
            render: (value: string) => <div className="font-medium">{value}</div>,
        },
        {
            key: 'type',
            label: t('Type'),
            render: (value: string) => (
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${minuteTypeBadge(value)}`}>
                    {t(value)}
                </span>
            ),
        },
        {
            key: 'recorder.name',
            label: t('Recorded By'),
            render: (_: any, row: any) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white overflow-hidden shrink-0">
                        {row.recorder?.avatar
                            ? <img src={row.recorder.avatar} alt={row.recorder?.name} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = getImagePath('avatars/avatar.png'); }} />
                            : <span className="text-sm font-semibold">{getInitials(row.recorder?.name || '')}</span>}
                    </div>
                    <div>
                        <div className="font-medium">{row.recorder?.name || '-'}</div>
                        <div className="text-sm text-muted-foreground">{row.recorder?.email || ''}</div>
                    </div>
                </div>
            ),
        },
        {
            key: 'recorded_at',
            label: t('Recorded At'),
            sortable: true,
            type: 'date' as const,
        },
    ];

    const minuteActions = [
        { label: t('View'), icon: 'Eye', action: 'view', className: 'text-blue-500', requiredPermission: 'view-meeting-minutes' },
        { label: t('Edit'), icon: 'Edit', action: 'edit', className: 'text-amber-500', requiredPermission: 'edit-meeting-minutes' },
        { label: t('Delete'), icon: 'Trash2', action: 'delete', className: 'text-red-500', requiredPermission: 'delete-meeting-minutes' },
    ];

    const minuteTypeOptions = [
        { value: '_empty_', label: t('All Types') },
        { value: 'Discussion', label: t('Discussion') },
        { value: 'Decision', label: t('Decision') },
        { value: 'Action Item', label: t('Action Item') },
        { value: 'Note', label: t('Note') },
    ];

    const recorderOptions = [
        { value: '_empty_', label: t('All Recorders') },
        ...(employees || []).map((e: any) => ({ value: e.id.toString(), label: e.name })),
    ];

    const minutesPlaceholder = (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
                <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{t('No minutes recorded yet')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-xs">{t('Record meeting minutes to capture discussions, decisions, action items, and notes.')}</p>
            {hasPermission(permissions, 'create-meeting-minutes') && (
                <Button size="sm" onClick={() => { setCurrentMinute(null); setMinuteFormMode('create'); setIsMinuteFormOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" />{t('Record First Minute')}
                </Button>
            )}
        </div>
    );

    const minutesTab = (
        <>
            {(!meetingMinutes?.data?.length) ? minutesPlaceholder : (<>
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-0 border-b border-gray-200 dark:border-gray-700">
                <SearchAndFilterBar
                    searchTerm={minuteSearch}
                    onSearchChange={setMinuteSearch}
                    onSearch={(e) => { e.preventDefault(); applyMinuteFilters(); }}
                    filters={[
                        { name: 'minute_type', label: t('Type'), type: 'select', value: minuteTypeFilter, onChange: setMinuteTypeFilter, options: minuteTypeOptions },
                        { name: 'recorded_by', label: t('Recorder'), type: 'select', value: recorderFilter, onChange: setRecorderFilter, options: recorderOptions, searchable: true },
                    ]}
                    showFilters={showMinuteFilters}
                    setShowFilters={setShowMinuteFilters}
                    hasActiveFilters={() => minuteTypeFilter !== '_empty_' || recorderFilter !== '_empty_' || minuteSearch !== ''}
                    activeFilterCount={() => (minuteTypeFilter !== '_empty_' ? 1 : 0) + (recorderFilter !== '_empty_' ? 1 : 0) + (minuteSearch !== '' ? 1 : 0)}
                    onResetFilters={resetMinuteFilters}
                />
            </div>
            <CrudTable
                columns={minuteColumns}
                actions={minuteActions}
                data={meetingMinutes?.data || []}
                from={meetingMinutes?.from || 1}
                onAction={handleMinuteAction}
                sortField={pageFilters.minute_sort_field}
                sortDirection={pageFilters.minute_sort_direction}
                onSort={handleMinuteSort}
                permissions={permissions}
                entityPermissions={{ view: 'view-meeting-minutes', edit: 'edit-meeting-minutes', delete: 'delete-meeting-minutes' }}
            />
            <Pagination
                from={meetingMinutes?.from || 0}
                to={meetingMinutes?.to || 0}
                total={meetingMinutes?.total || 0}
                links={meetingMinutes?.links}
                entityName={t('minutes')}
                onPageChange={handleMinutePageChange}
                currentPerPage={pageFilters.minute_per_page?.toString() || '10'}
                onPerPageChange={(value) => applyMinuteFilters({ minute_per_page: parseInt(value) })}
            />
            </>)}
        </>
    );

    // ── Render ────────────────────────────────────────────────────────────────

    const tabs = [
        ...(canManageAttendees ? [{ key: 'attendees', label: `${t('Attendees')} (${meeting.attendees_count ?? meetingAttendees?.total ?? 0})` }] : []),
        ...(canManageMinutes ? [{ key: 'minutes', label: `${t('Minutes')} (${meeting.minutes_count ?? meetingMinutes?.total ?? 0})` }] : []),
    ];

    return (
        <PageTemplate title={meeting?.title || t('Meeting')} description={'View meeting details'} url={`/meetings/meetings/${meeting?.id}`} actions={pageActions} breadcrumbs={breadcrumbs} noPadding>
            <div className="min-w-0 w-full space-y-4">

                {detailsCard}

                {/* ── Tabs card ── */}
                {(canManageAttendees || canManageMinutes) &&
                    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">

                        {/* Tab bar + add button */}
                        <div className="flex flex-wrap items-center justify-between border-b border-gray-200 dark:border-gray-700 px-0">
                            <div className="flex overflow-x-auto">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key as any)}
                                        className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${activeTab === tab.key
                                                ? 'border-primary text-primary'
                                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <div className="px-4 py-2 shrink-0">
                                {activeTab === 'attendees' && hasPermission(permissions, 'create-meeting-attendees') && (
                                    <Button size="sm" onClick={() => { setCurrentAttendee(null); setAttendeeFormMode('create'); setIsAttendeeFormOpen(true); }}>
                                        <Plus className="h-4 w-4 mr-1" />{t('Add Attendee')}
                                    </Button>
                                )}
                                {activeTab === 'minutes' && hasPermission(permissions, 'create-meeting-minutes') && (
                                    <Button size="sm" onClick={() => { setCurrentMinute(null); setMinuteFormMode('create'); setIsMinuteFormOpen(true); }}>
                                        <Plus className="h-4 w-4 mr-1" />{t('Add Minute')}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {activeTab === 'attendees' && canManageAttendees && attendeesTab}
                        {activeTab === 'minutes' && canManageMinutes && minutesTab}
                    </div>
                }
            </div>

            {/* ── Meeting modals ── */}
            <CrudFormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSubmit={handleMeetingEdit}
                formConfig={{
                    fields: [
                        { name: 'title', label: t('Meeting Title'), type: 'text', required: true, placeholder: t('e.g. Q3 Planning Meeting') },
                        { name: 'description', label: t('Description'), type: 'textarea', placeholder: t('Brief description of the meeting purpose') },
                        { name: 'type_id', label: t('Meeting Type'), type: 'select', required: true, options: typeOptions, searchable: true, placeholder: t('Select meeting type') },
                        { name: 'room_id', label: t('Meeting Room'), type: 'select', options: roomOptions, searchable: true, placeholder: t('Select a room (optional)') },
                        { name: 'meeting_date', label: t('Meeting Date'), type: 'date', required: true, placeholder: t('Select date') },
                        { name: 'start_time', label: t('Start Time'), type: 'time', required: true, placeholder: t('e.g. 09:00') },
                        { name: 'end_time', label: t('End Time'), type: 'time', required: true, placeholder: t('e.g. 10:00') },
                        { name: 'organizer_id', label: t('Organizer'), type: 'select', required: true, options: employeeOptions, searchable: true, placeholder: t('Select organizer') },
                        {
                            name: 'recurrence', label: t('Recurrence'), type: 'select', required: true, placeholder: t('Select recurrence'), options: [
                                { value: 'None', label: t('None') }, { value: 'Daily', label: t('Daily') },
                                { value: 'Weekly', label: t('Weekly') }, { value: 'Monthly', label: t('Monthly') },
                            ]
                        },
                        { name: 'recurrence_end_date', label: t('Recurrence End Date'), type: 'date', placeholder: t('Select end date (optional)') },
                        { name: 'agenda', label: t('Agenda'), type: 'textarea', rows: 4, placeholder: t('List agenda items, topics to discuss...') } as any,
                    ], modalSize: 'xl'
                }}
                initialData={{ ...meeting, meeting_date: meeting?.meeting_date ? window.appSettings?.formatDateTimeSimple(meeting.meeting_date, false) : '' }}
                title={t('Edit Meeting')} mode="edit"
            />
            <CrudDeleteModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleMeetingDelete} itemName={meeting?.title || ''} entityName="meeting" />
            <CrudFormModal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} onSubmit={handleStatusUpdate}
                formConfig={{
                    fields: [{
                        name: 'status', label: t('Status'), type: 'select', required: true, placeholder: t('Select status'), options: [
                            { value: 'Scheduled', label: t('Scheduled') }, { value: 'In Progress', label: t('In Progress') },
                            { value: 'Completed', label: t('Completed') }, { value: 'Cancelled', label: t('Cancelled') },
                        ]
                    }], modalSize: 'sm'
                }}
                initialData={{ status: selectedStatus }} title={t('Update Meeting Status')} mode="edit" submitButtonText={t('Update Status')}
            />

            {/* ── Attendee modals ── */}
            <CrudFormModal isOpen={isAttendeeFormOpen} onClose={() => setIsAttendeeFormOpen(false)} onSubmit={handleAttendeeSubmit}
                formConfig={{
                    fields: [
                        { name: 'user_id', label: t('Employee'), type: 'select', required: true, options: employeeOptions, searchable: true, placeholder: t('Search and select employee') },
                        { name: 'rsvp_status', label: t('RSVP Status'), type: 'select', options: rsvpOptions.filter(o => o.value !== '_empty_'), placeholder: t('Select RSVP status') },
                        { name: 'attendance_status', label: t('Attendance Status'), type: 'select', options: attendanceOptions.filter(o => o.value !== '_empty_'), placeholder: t('Select attendance status') },
                        { name: 'decline_reason', label: t('Decline Reason'), type: 'textarea', placeholder: t('Reason for declining the meeting...'), helpText: t('Required if RSVP status is Declined') },
                    ], modalSize: 'md'
                }}
                initialData={currentAttendee}
                title={attendeeFormMode === 'create' ? t('Add Attendee') : t('Edit Attendee')} mode={attendeeFormMode}
            />
            <CrudDeleteModal isOpen={isAttendeeDeleteOpen} onClose={() => setIsAttendeeDeleteOpen(false)} onConfirm={handleAttendeeDelete} itemName={currentAttendee?.user?.name || ''} entityName="attendee" />
            <CrudFormModal isOpen={isRsvpModalOpen} onClose={() => setIsRsvpModalOpen(false)} onSubmit={handleRsvpUpdate}
                formConfig={{
                    fields: [
                        { name: 'rsvp_status', label: t('RSVP Status'), type: 'select', required: true, placeholder: t('Select RSVP status'), options: [{ value: 'Pending', label: t('Pending') }, { value: 'Accepted', label: t('Accepted') }, { value: 'Declined', label: t('Declined') }, { value: 'Tentative', label: t('Tentative') }] },
                        { name: 'decline_reason', label: t('Decline Reason'), type: 'textarea', placeholder: t('Reason for declining the meeting...'), helpText: t('Required if RSVP status is Declined') },
                    ], modalSize: 'md'
                }}
                initialData={{ rsvp_status: selectedRsvpStatus, decline_reason: currentAttendee?.decline_reason || '' }}
                title={t('Update RSVP Status')} mode="edit" submitButtonText={t('Update RSVP')}
            />
            <CrudFormModal isOpen={isAttendanceModalOpen} onClose={() => setIsAttendanceModalOpen(false)} onSubmit={handleAttendanceUpdate}
                formConfig={{
                    fields: [
                        { name: 'attendance_status', label: t('Attendance Status'), type: 'select', required: true, placeholder: t('Select attendance status'), options: attendanceOptions.filter(o => o.value !== '_empty_') },
                    ], modalSize: 'sm'
                }}
                initialData={{ attendance_status: selectedAttendanceStatus }}
                title={t('Update Attendance Status')} mode="edit" submitButtonText={t('Update Attendance')}
            />
            <Dialog open={!!viewingAttendee} onOpenChange={() => setViewingAttendee(null)}>
                {viewingAttendee && <AttendeeView attendee={viewingAttendee} />}
            </Dialog>

            {/* ── Minute modals ── */}
            <CrudFormModal isOpen={isMinuteFormOpen} onClose={() => setIsMinuteFormOpen(false)} onSubmit={handleMinuteSubmit}
                formConfig={{
                    fields: [
                        { name: 'topic', label: t('Topic'), type: 'text', required: true, placeholder: t('e.g. Budget approval discussion') },
                        { name: 'type', label: t('Type'), type: 'select', required: true, placeholder: t('Select minute type'), options: minuteTypeOptions.filter(o => o.value !== '_empty_') },
                        { name: 'content', label: t('Content'), type: 'textarea', required: true, rows: 5, placeholder: t('Describe the discussion, decision, or action item in detail...') } as any,
                        { name: 'recorded_by', label: t('Recorded By'), type: 'select', required: true, options: employeeOptions, searchable: true, placeholder: t('Search and select recorder') },
                        { name: 'recorded_date', label: t('Recorded Date'), type: 'date', placeholder: t('Select date'), helpText: t('Leave empty to use current date') },
                        { name: 'recorded_time', label: t('Recorded Time'), type: 'time', placeholder: t('e.g. 10:30'), helpText: t('Leave empty to use current time') },
                    ], modalSize: 'lg'
                }}
                initialData={currentMinute ? {
                    ...currentMinute,
                    recorded_date: currentMinute.recorded_at ? new Date(currentMinute.recorded_at).toISOString().split('T')[0] : '',
                    recorded_time: currentMinute.recorded_at ? new Date(currentMinute.recorded_at).toTimeString().substring(0, 5) : '',
                } : null}
                title={minuteFormMode === 'create' ? t('Add Minute') : t('Edit Minute')} mode={minuteFormMode}
            />
            <CrudDeleteModal isOpen={isMinuteDeleteOpen} onClose={() => setIsMinuteDeleteOpen(false)} onConfirm={handleMinuteDelete} itemName={currentMinute?.topic || ''} entityName="meeting minute" />
            <Dialog open={!!viewingMinute} onOpenChange={() => setViewingMinute(null)}>
                {viewingMinute && <MinuteView minute={viewingMinute} />}
            </Dialog>
        </PageTemplate>
    );
}
