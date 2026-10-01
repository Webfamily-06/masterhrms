import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { hasPermission } from '@/utils/authorization';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, ChevronLeft, ChevronRight, MapPin, Users, Clock, CalendarDays, Eye, Edit, RefreshCw, Trash2 } from 'lucide-react';
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday, parseISO } from 'date-fns';
import { getImagePath } from '@/utils/helpers';
import UserInitials from '@/components/user-initials';

export default function Meetings() {
    const { t } = useTranslation();
    const {
        auth, dailyMeetings, calendarDots, dailyStats,
        selectedDate, filters: pageFilters = {},
        meetingTypes, meetingRooms, employees, globalSettings,
    } = usePage().props as any;
    const permissions = auth?.permissions || [];

    const [currentDate, setCurrentDate] = useState<Date>(selectedDate ? parseISO(selectedDate) : new Date());
    const [calendarMonthDate, setCalendarMonthDate] = useState<Date>(
        pageFilters.calendar_month ? parseISO(pageFilters.calendar_month)
        : selectedDate ? startOfMonth(parseISO(selectedDate))
        : startOfMonth(new Date())
    );
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [selectedStatus, setSelectedStatus] = useState('');

    // ── Navigation ────────────────────────────────────────────────────────────

    const navigateToDate = (date: Date) => {
        setCurrentDate(date);
        const newMonth = startOfMonth(date);
        setCalendarMonthDate(newMonth);
        router.get(route('meetings.meetings.index'), {
            date: format(date, 'yyyy-MM-dd'),
            calendar_month: format(newMonth, 'yyyy-MM-dd'),
        }, { preserveState: true, preserveScroll: true });
    };

    const navigateCalendarMonth = (dir: 1 | -1) => {
        const newMonth = dir === 1 ? addMonths(calendarMonthDate, 1) : subMonths(calendarMonthDate, 1);
        setCalendarMonthDate(newMonth);
        router.get(route('meetings.meetings.index'), {
            date: format(currentDate, 'yyyy-MM-dd'),
            calendar_month: format(newMonth, 'yyyy-MM-dd'),
        }, { preserveState: true, preserveScroll: true });
    };

    // ── Calendar grid ─────────────────────────────────────────────────────────

    const calendarDays = (() => {
        const start = startOfMonth(calendarMonthDate);
        const end = endOfMonth(calendarMonthDate);
        const days = eachDayOfInterval({ start, end });
        const leadingBlanks = getDay(start);
        return { days, leadingBlanks };
    })();

    const hasDot = (date: Date) => {
        const key = format(date, 'yyyy-MM-dd');
        return calendarDots && calendarDots[key];
    };

    // ── Status helpers ────────────────────────────────────────────────────────

    const statusConfig: Record<string, { label: string; badge: string }> = {
        Scheduled: { label: t('Scheduled'), badge: 'bg-blue-50 text-blue-700 ring-blue-700/10' },
        'In Progress': { label: t('In Progress'), badge: 'bg-yellow-50 text-yellow-700 ring-yellow-700/10' },
        Completed: { label: t('Held'), badge: 'bg-green-50 text-green-700 ring-green-700/10' },
        Cancelled: { label: t('Cancelled'), badge: 'bg-red-50 text-red-700 ring-red-700/10' },
    };
    const badgeClass = (s: string) => statusConfig[s]?.badge ?? 'bg-gray-50 text-gray-600 ring-gray-500/10';
    const badgeLabel = (s: string) => statusConfig[s]?.label ?? s;

    // ── Avatar helpers ────────────────────────────────────────────────────────

    const initials = (name: string) =>
        name?.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

    const avatarColors = ['bg-violet-400', 'bg-blue-400', 'bg-green-400', 'bg-orange-400', 'bg-pink-400', 'bg-teal-400'];
    const avatarColor = (name: string) => avatarColors[(name?.charCodeAt(0) ?? 0) % avatarColors.length];

    // ── Date label ────────────────────────────────────────────────────────────

    const dateLabel = isToday(currentDate)
        ? `${window.appSettings.formatDateTimeSimple(currentDate, false)} (${t('Today')})`
        : window.appSettings.formatDateTimeSimple(currentDate, false);

    // ── CRUD handlers ─────────────────────────────────────────────────────────

    const handleAction = (action: string, item: any) => {
        setCurrentItem(item);
        switch (action) {
            case 'view': router.get(route('meetings.meetings.show', item.id)); break;
            case 'edit': setFormMode('edit'); setIsFormModalOpen(true); break;
            case 'delete': setIsDeleteModalOpen(true); break;
            case 'update-status': setSelectedStatus(item.status); setIsStatusModalOpen(true); break;
        }
    };

    const handleFormSubmit = (formData: any) => {
        if (formMode === 'create') {
            if (!globalSettings?.is_demo) toast.loading(t('Creating meeting...'));
            router.post(route('meetings.meetings.store'), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    if (!globalSettings?.is_demo) toast.dismiss();
                    if (page.props.flash?.success) toast.success(t(page.props.flash.success));
                    else if (page.props.flash?.error) toast.error(t(page.props.flash.error));
                },
                onError: (errors) => {
                    if (!globalSettings?.is_demo) toast.dismiss();
                    toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', '));
                },
            });
        } else {
            if (!globalSettings?.is_demo) toast.loading(t('Updating meeting...'));
            router.put(route('meetings.meetings.update', currentItem.id), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    if (!globalSettings?.is_demo) toast.dismiss();
                    if (page.props.flash?.success) toast.success(t(page.props.flash.success));
                    else if (page.props.flash?.error) toast.error(t(page.props.flash.error));
                },
                onError: (errors) => {
                    if (!globalSettings?.is_demo) toast.dismiss();
                    toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', '));
                },
            });
        }
    };

    const handleDeleteConfirm = () => {
        if (!globalSettings?.is_demo) toast.loading(t('Deleting meeting...'));
        router.delete(route('meetings.meetings.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                if (!globalSettings?.is_demo) toast.dismiss();
                if (page.props.flash?.success) toast.success(t(page.props.flash.success));
                else if (page.props.flash?.error) toast.error(t(page.props.flash.error));
            },
            onError: (errors) => {
                if (!globalSettings?.is_demo) toast.dismiss();
                toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', '));
            },
        });
    };

    const handleStatusUpdate = (formData: any) => {
        if (!globalSettings?.is_demo) toast.loading(t('Updating status...'));
        router.put(route('meetings.meetings.update-status', currentItem.id), { status: formData.status }, {
            onSuccess: (page) => {
                setIsStatusModalOpen(false);
                if (!globalSettings?.is_demo) toast.dismiss();
                if (page.props.flash?.success) toast.success(t(page.props.flash.success));
                else if (page.props.flash?.error) toast.error(t(page.props.flash.error));
            },
            onError: (errors) => {
                if (!globalSettings?.is_demo) toast.dismiss();
                toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', '));
            },
        });
    };

    // ── Page meta ─────────────────────────────────────────────────────────────

    const pageActions: any[] = [];
    if (hasPermission(permissions, 'create-meetings')) {
        pageActions.push({
            label: t('Schedule Meeting'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => { setCurrentItem(null); setFormMode('create'); setIsFormModalOpen(true); },
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Meetings') },
        { title: t('Meetings') },
    ];

    // ── Form options ──────────────────────────────────────────────────────────

    const typeSelectOptions = (meetingTypes || []).map((m: any) => ({ value: m.id.toString(), label: m.name }));
    const roomSelectOptions = (meetingRooms || []).map((r: any) => ({ value: r.id.toString(), label: `${r.name} (${r.type})` }));
    const organizerSelectOptions = (employees || []).map((e: any) => ({ value: e.id.toString(), label: e.name }));

    // ── Left panel ────────────────────────────────────────────────────────────
    const leftPanel = (
        <div className="w-full lg:flex-1 lg:min-w-0 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 min-w-0">
                    <CalendarDays className="h-4 w-4 text-gray-400 shrink-0" />
                    <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">{dateLabel}</h2>
                    {!isToday(currentDate) && (
                        <Button size="sm" variant="outline" className="shrink-0 text-xs h-7 px-2" onClick={() => navigateToDate(new Date())}>
                            {t('Today')}
                        </Button>
                    )}
                </div>
                {(dailyMeetings?.length ?? 0) > 0 && (
                    <span className="shrink-0 inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                        {dailyMeetings.length} {t('Meetings')}
                    </span>
                )}
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700 overflow-y-auto max-h-[60vh] lg:max-h-[calc(100vh-250px)]">
                {(dailyMeetings?.length ?? 0) === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                        <CalendarDays className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("That's all for today!")}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {t('You have no more meetings scheduled for')} {format(currentDate, 'd MMMM yyyy')}.
                        </p>
                    </div>
                ) : (
                    (dailyMeetings || []).map((meeting: any) => (
                        <div key={meeting.id} className="flex gap-1.5 sm:gap-4 px-3 sm:px-5 py-2.5 sm:py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            {/* Time */}
                            <div className="w-[52px] sm:w-20 shrink-0 text-right">
                                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">{window.appSettings?.formatTime(meeting.start_time)}</div>
                                <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">↓</div>
                                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">{window.appSettings?.formatTime(meeting.end_time)}</div>
                            </div>
                            {/* Divider line */}
                            <div className="flex flex-col items-center">
                                <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700" />
                            </div>
                            {/* Organizer avatar — hidden on xs */}
                            <div className="hidden sm:block shrink-0 mt-0.5">
                                {meeting.organizer?.avatar ? (
                                    <img src={meeting.organizer.avatar} alt={meeting.organizer.name} className="h-9 w-9 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = getImagePath('avatars/avatar.png'); }} />
                                ) : (
                                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold ${avatarColor(meeting.organizer?.name ?? '')}`}>
                                        {initials(meeting.organizer?.name ?? '')}
                                    </div>
                                )}
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-1">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{meeting.title}</p>
                                            <span className={`shrink-0 inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeClass(meeting.status)}`}>{badgeLabel(meeting.status)}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                            {meeting.organizer?.name}
                                            <span className="hidden sm:inline text-gray-400">{meeting.organizer?.email && ` • ${meeting.organizer.email}`}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center shrink-0 -mr-1">
                                        {hasPermission(permissions, 'view-meetings') && (
                                            <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-gray-500" onClick={() => handleAction('view', meeting)}><Eye size={15} /></Button>
                                            </TooltipTrigger><TooltipContent><p>{t('View')}</p></TooltipContent></Tooltip></TooltipProvider>
                                        )}
                                        {hasPermission(permissions, 'edit-meetings') && (
                                            <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-gray-500" onClick={() => handleAction('edit', meeting)}><Edit size={15} /></Button>
                                            </TooltipTrigger><TooltipContent><p>{t('Edit')}</p></TooltipContent></Tooltip></TooltipProvider>
                                        )}
                                        {hasPermission(permissions, 'manage-meeting-status') && (
                                            <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="hidden sm:flex h-8 w-8 text-gray-500" onClick={() => handleAction('update-status', meeting)}><RefreshCw size={15} /></Button>
                                            </TooltipTrigger><TooltipContent><p>{t('Update Status')}</p></TooltipContent></Tooltip></TooltipProvider>
                                        )}
                                        {hasPermission(permissions, 'delete-meetings') && (
                                            <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-gray-500" onClick={() => handleAction('delete', meeting)}><Trash2 size={15} /></Button>
                                            </TooltipTrigger><TooltipContent><p>{t('Delete')}</p></TooltipContent></Tooltip></TooltipProvider>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center flex-wrap gap-x-2 sm:gap-x-3 gap-y-1 mt-1">
                                    <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                        <MapPin className="h-3 w-3 shrink-0" />
                                        <span className="truncate max-w-[80px] sm:max-w-none">{meeting.room?.name || t('No location')}</span>
                                    </span>
                                    {meeting.type && (
                                        <span className="hidden sm:inline-flex items-center rounded-md bg-gray-50 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400 ring-1 ring-inset ring-gray-500/10 dark:ring-gray-600/20">{meeting.type.name}</span>
                                    )}
                                    <div className="flex items-center ml-auto">
                                        {(meeting.attendees?.slice(0, 4) || []).map((a: any, i: number) => (
                                            <TooltipProvider key={a.id}><Tooltip><TooltipTrigger asChild>
                                                <div className="-ml-1.5 first:ml-0 h-6 w-6 rounded-full ring-2 ring-white dark:ring-gray-900 overflow-hidden shrink-0 cursor-default" style={{ zIndex: 10 - i }}>
                                                    {a.user?.avatar ? (
                                                        <img src={a.user.avatar} alt={a.user?.name} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = getImagePath('avatars/avatar.png'); }} />
                                                    ) : (
                                                        <UserInitials name={a.user?.name || ''}/>
                                                    )}
                                                </div>
                                            </TooltipTrigger><TooltipContent><p>{a.user?.name || '-'}</p></TooltipContent></Tooltip></TooltipProvider>
                                        ))}
                                        {(meeting.attendees?.length ?? 0) > 4 && (
                                            <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                                <div className="-ml-1.5 h-6 w-6 rounded-full ring-2 ring-white dark:ring-gray-900 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[9px] font-semibold text-gray-600 dark:text-gray-300 cursor-default">
                                                    +{(meeting.attendees?.length ?? 0) - 4}
                                                </div>
                                            </TooltipTrigger><TooltipContent>
                                                <div className="space-y-0.5">
                                                    {meeting.attendees.slice(4).map((a: any) => (
                                                        <p key={a.id}>{a.user?.name || '-'}</p>
                                                    ))}
                                                </div>
                                            </TooltipContent></Tooltip></TooltipProvider>
                                        )}
                                        {(meeting.attendees?.length ?? 0) === 0 && (
                                            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500"><Users className="h-3 w-3" />0</span>
                                        )}
                                    </div>
                                    <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500"><Clock className="h-3 w-3" />{meeting.duration}m</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    // ── Right panel ───────────────────────────────────────────────────────────
    const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const rightPanel = (
        <div className="w-full lg:w-72 lg:shrink-0 flex flex-col gap-4">
            {/* Mini Calendar */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <button onClick={() => navigateCalendarMonth(-1)} className="cursor-pointer p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{format(calendarMonthDate, 'MMMM yyyy')}</span>
                    <button onClick={() => navigateCalendarMonth(1)} className="cursor-pointer p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400">
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
                <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 px-4 pt-2">
                    {DAY_NAMES.map(d => (
                        <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 pb-2">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-y-0.5 px-4 py-3">
                    {Array.from({ length: calendarDays.leadingBlanks }).map((_, i) => <div key={`b${i}`} />)}
                    {calendarDays.days.map((day) => {
                        const isSelected = format(day, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd');
                        const todayDay = isToday(day);
                        const dot = hasDot(day);
                        return (
                            <button
                                key={day.toISOString()}
                                onClick={() => navigateToDate(day)}
                                className={`cursor-pointer relative flex flex-col items-center justify-center h-8 w-full rounded-lg text-xs font-medium transition-colors
                                    ${isSelected ? 'bg-primary text-white' : todayDay ? 'text-primary font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            >
                                {format(day, 'd')}
                                {dot && !isSelected && (
                                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Meeting Summary */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-4 pt-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                    {t('Meeting Summary')} <span className="text-gray-400 dark:text-gray-500 font-normal text-xs">({window.appSettings.formatDateTimeSimple(currentDate, false)})</span>
                </p>
                <div className="py-2">
                    {[
                        { label: t('Scheduled'),   value: dailyStats?.scheduled   ?? 0, dot: 'bg-blue-500' },
                        { label: t('In Progress'), value: dailyStats?.in_progress ?? 0, dot: 'bg-yellow-500' },
                        { label: t('Completed'),   value: dailyStats?.completed   ?? 0, dot: 'bg-green-500' },
                        { label: t('Cancelled'),   value: dailyStats?.cancelled   ?? 0, dot: 'bg-red-500' },
                    ].map(({ label, value, dot }) => (
                        <div key={label} className="flex items-center justify-between px-4 py-1.5">
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                                <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{value}</span>
                        </div>
                    ))}
                    <div className="flex items-center justify-between px-4 pt-2 pb-1 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Total Meetings')}</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{dailyStats?.total ?? 0}</span>
                    </div>
                </div>
            </div>

            {/* Quick Filters */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-4 pt-4 pb-3 border-b border-gray-200 dark:border-gray-700">{t('Quick Filters')}</p>
                <div className="space-y-1 p-3">
                    {[
                        { label: t('Yesterday'), fn: () => navigateToDate(subDays(new Date(), 1)) },
                        { label: t('Today'), fn: () => navigateToDate(new Date()) },
                        { label: t('Tomorrow'), fn: () => navigateToDate(addDays(new Date(), 1)) },
                    ].map(({ label, fn }) => {
                        const cur = format(currentDate, 'yyyy-MM-dd');
                        const isActive =
                            (label === t('Yesterday') && cur === format(subDays(new Date(), 1), 'yyyy-MM-dd')) ||
                            (label === t('Today') && cur === format(new Date(), 'yyyy-MM-dd')) ||
                            (label === t('Tomorrow') && cur === format(addDays(new Date(), 1), 'yyyy-MM-dd'));
                        return (
                            <button
                                key={label}
                                onClick={fn}
                                className={`cursor-pointer w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                                    isActive ? 'bg-primary/10 dark:bg-primary/20 text-primary font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                            >
                                <span className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 opacity-60" />{label}</span>
                                <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    return (
        <PageTemplate title={t('Meetings')} description={t('Schedule and manage meetings across teams.')} url="/meetings/meetings" actions={pageActions} breadcrumbs={breadcrumbs} noPadding>
            <div className="flex flex-col lg:flex-row gap-4 items-start">
                {leftPanel}
                {rightPanel}
            </div>

            {/* Create / Edit Modal */}
            <CrudFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                formConfig={{
                    fields: [
                        { name: 'title', label: t('Meeting Title'), type: 'text', required: true, placeholder: t('e.g. Q1 Planning Meeting') },
                        { name: 'description', label: t('Description'), type: 'textarea', placeholder: t('e.g. Quarterly planning session to review goals...') },
                        { name: 'type_id', label: t('Meeting Type'), type: 'select', required: true, placeholder: t('Select Meeting Type'), options: typeSelectOptions, searchable: true },
                        { name: 'room_id', label: t('Meeting Room'), type: 'select', placeholder: t('Select Meeting Room'), options: roomSelectOptions, searchable: true },
                        { name: 'meeting_date', label: t('Meeting Date'), type: 'date', required: true, placeholder: t('Select Meeting Date') },
                        { name: 'start_time', label: t('Start Time'), type: 'time', required: true, placeholder: t('Select Start Time') },
                        { name: 'end_time', label: t('End Time'), type: 'time', required: true, placeholder: t('Select End Time') },
                        { name: 'organizer_id', label: t('Organizer'), type: 'select', required: true, placeholder: t('Select Organizer'), options: organizerSelectOptions, searchable: true },
                        {
                            name: 'recurrence', label: t('Recurrence'), type: 'select', required: true, placeholder: t('Select Recurrence'), options: [
                                { value: 'None', label: t('None') }, { value: 'Daily', label: t('Daily') },
                                { value: 'Weekly', label: t('Weekly') }, { value: 'Monthly', label: t('Monthly') },
                            ]
                        },
                        { name: 'recurrence_end_date', label: t('Recurrence End Date'), type: 'date', placeholder: t('Select Recurrence End Date'), helpText: t('Required for recurring meetings') },
                        { name: 'agenda', label: t('Agenda'), type: 'textarea', rows: 4, placeholder: t('e.g. 1. Review last quarter results\n2. Set new targets...') } as any,
                    ],
                    modalSize: 'xl',
                }}
                initialData={currentItem ? {
                    ...currentItem,
                    meeting_date: currentItem.meeting_date ? window.appSettings.formatDateTimeSimple(currentItem.meeting_date, false) : currentItem.meeting_date,
                } : null}
                title={formMode === 'create' ? t('Schedule New Meeting') : t('Edit Meeting')}
                mode={formMode}
            />

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.title || ''}
                entityName="meeting"
            />

            {/* Status Modal */}
            <CrudFormModal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                onSubmit={handleStatusUpdate}
                formConfig={{
                    fields: [{
                        name: 'status', label: t('Status'), type: 'select', required: true, placeholder: t('Select Status'),
                        options: [
                            { value: 'Scheduled', label: t('Scheduled') },
                            { value: 'In Progress', label: t('In Progress') },
                            { value: 'Completed', label: t('Completed') },
                            { value: 'Cancelled', label: t('Cancelled') },
                        ],
                    }],
                    modalSize: 'sm',
                }}
                initialData={{ status: selectedStatus }}
                title={t('Update Meeting Status')}
                mode="edit"
                submitButtonText={t('Update Status')}
            />

        </PageTemplate>
    );
}
