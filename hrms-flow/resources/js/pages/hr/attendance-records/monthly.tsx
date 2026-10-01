// pages/hr/attendance-records/monthly.tsx
import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { hasPermission } from '@/utils/authorization';
import { useInitials } from '@/hooks/use-initials';
import { Plus, FileDown, FileUp, AlarmClock, ArrowLeftFromLine, Timer, CircleDashed } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { CrudFormModal } from '@/components/CrudFormModal';
import { ImportModal } from '@/components/ImportModal';
import { toast } from '@/components/custom-toast';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Pagination } from '@/components/ui/pagination';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export default function MonthlyAttendance() {
    const { t } = useTranslation();
    const {
        auth,
        employeeRows,
        dayHeaders,
        employees,
        monthOptions,
        yearOptions,
        currentMonth,
        currentYear,
        hasSampleFile,
        filters: pageFilters = {},
        globalSettings,
    } = usePage().props as any;

    const permissions = auth?.permissions || [];
    const getInitials = useInitials();

    const [selectedEmployee, setSelectedEmployee] = useState(pageFilters.employee_id || '_empty_');
    const [selectedMonth, setSelectedMonth] = useState(pageFilters.month || currentMonth.toString());
    const [selectedYear, setSelectedYear] = useState(pageFilters.year || currentYear.toString());
    const [showFilters, setShowFilters] = useState(true);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

    const hasActiveFilters = () => selectedEmployee !== '_empty_';
    const activeFilterCount = () => selectedEmployee !== '_empty_' ? 1 : 0;

    const applyFilters = () => {
        router.get(route('hr.attendance-records.index'), {
            page: 1,
            employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
            month: selectedMonth,
            year: selectedYear,
            per_page: pageFilters.per_page,
            sort_field: pageFilters.sort_field || undefined,
            sort_direction: pageFilters.sort_direction || undefined,
        }, { preserveState: true, preserveScroll: true });
    };

    const handlePageChange = (url: string) => {
        const page = new URL(url).searchParams.get('page');
        router.get(route('hr.attendance-records.index'), {
            page,
            per_page: pageFilters.per_page,
            employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
            month: selectedMonth,
            year: selectedYear,
            sort_field: pageFilters.sort_field || undefined,
            sort_direction: pageFilters.sort_direction || undefined,
        }, { preserveState: true, preserveScroll: true });
    };

    const handleResetFilters = () => {
        router.get(route('hr.attendance-records.index'));
    };

    const handleAddNew = () => {
        setCurrentItem(null);
        setFormMode('create');
        setIsFormModalOpen(true);
    };

    const handleEditCell = (day: any, emp: any) => {
        if (day.status === 'future' || day.status === 'day_off' || !day.id) return;
        setCurrentItem({
            ...day,
            employee_id: emp.id.toString(),
        });
        setFormMode('edit');
        setIsFormModalOpen(true);
    };

    const handleFormSubmit = (formData: any) => {
        if (formMode === 'create') {
            if (!globalSettings?.is_demo) toast.loading(t('Creating attendance record...'));
            router.post(route('hr.attendance-records.store'), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    toast.dismiss();
                    if (page.props.flash?.success) toast.success(t(page.props.flash.success));
                    else if (page.props.flash?.error) toast.error(t(page.props.flash.error));
                },
                onError: (errors) => {
                    toast.dismiss();
                    toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', '));
                }
            });
        } else if (formMode === 'edit') {
            if (!globalSettings?.is_demo) toast.loading(t('Updating attendance record...'));
            router.put(route('hr.attendance-records.update', currentItem.id), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    toast.dismiss();
                    if (page.props.flash?.success) toast.success(t(page.props.flash.success));
                    else if (page.props.flash?.error) toast.error(t(page.props.flash.error));
                },
                onError: (errors) => {
                    toast.dismiss();
                    toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', '));
                }
            });
        }
    };

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            if (selectedEmployee !== '_empty_') params.append('employee_id', selectedEmployee);
            if (selectedMonth) params.append('month', selectedMonth);
            if (selectedYear) params.append('year', selectedYear);

            const url = `${route('hr.attendance-records.export')}?${params.toString()}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                toast.error(t(data.message || 'Failed to export'));
                return;
            }
            const blob = await response.blob();
            const objectUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = `attendance_records_${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(objectUrl);
            document.body.removeChild(a);
        } catch {
            toast.error(t('Failed to export attendance records'));
        }
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Attendance')},
        { title: t('Attendance Records') },
    ];

    const pageActions: any[] = [];

    if (hasPermission(permissions, 'export-attendance-record')) {
        pageActions.push({
            label: t('Export'),
            icon: <FileDown className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: handleExport,
        });
    }

    if (hasPermission(permissions, 'import-attendance-record')) {
        pageActions.push({
            label: t('Import'),
            icon: <FileUp className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => setIsImportModalOpen(true),
        });
    }

    if (hasPermission(permissions, 'create-attendance-records')) {
        pageActions.push({
            label: t('Add Record'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: handleAddNew,
        });
    }

    // Status cell renderer
    const renderCell = (day: any, emp: any) => {
        if (day.status === 'future') {
            return (
                <div className="flex flex-col items-center justify-center h-8">
                    <span className="text-gray-300 dark:text-gray-600 text-sm">-</span>
                </div>
            );
        }

        if (day.status === 'day_off') {
            return (
                <div className="flex flex-col items-center justify-center h-8">
                    <span className="text-gray-400 dark:text-gray-500 text-base leading-none">⊘</span>
                </div>
            );
        }

        const statusMap: Record<string, { icon: string | React.ReactNode; className: string; title: string }> = {
            present: { icon: '✓', className: 'text-green-600 dark:text-green-400 font-bold text-base', title: t('Present') },
            absent: { icon: '✕', className: 'text-red-500 dark:text-red-400 font-bold text-base', title: t('Absent') },
            half_day: { icon: '½', className: 'text-yellow-500 dark:text-yellow-400 font-bold text-base', title: t('Half Day') },
            on_leave: { icon: '🚩', className: 'text-blue-500 dark:text-blue-400 text-base', title: day.leave_type_name ? `${day.is_paid_leave ? t('Paid Leave') : t('Unpaid Leave')} - ${day.leave_type_name}` : t('On Leave') },
            holiday: { icon: '⭐', className: 'text-purple-500 dark:text-purple-400 text-base', title: t('Holiday') },
            not_added: { icon: <CircleDashed className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />, className: '', title: t('Attendance Not Added') },
        };

        const cfg = statusMap[day.status] ?? { icon: '-', className: 'text-gray-400 text-base', title: day.status };
        const canEdit = hasPermission(permissions, 'edit-attendance-records') && day.id;

        const tooltipContent = (
            <div className="space-y-1 text-xs min-w-[140px]">
                <div><span className="text-gray-400">{t('Date')}:</span> <span className="font-medium text-gray-900 dark:text-gray-100">{day.date}</span></div>
                <div>
                    <span className="text-gray-400">{t('Status')}:</span>{' '}
                    <span className={`font-semibold ${
                        day.status === 'present' ? 'text-green-600' :
                        day.status === 'absent' ? 'text-red-600' :
                        day.status === 'half_day' ? 'text-yellow-600' :
                        day.status === 'on_leave' ? 'text-blue-600' :
                        day.status === 'holiday' ? 'text-purple-600' : 'text-gray-600'
                    }`}>{cfg.title}</span>
                    {day.is_late && <span className="text-orange-500 font-medium"> - {t('Late')}</span>}
                    {day.is_early_departure && <span className="text-red-500 font-medium"> - {t('Early Departure')}</span>}
                </div>
                {day.clock_in && <div><span className="text-gray-400">{t('Clock In')}:</span> <span className="font-medium text-gray-900 dark:text-gray-100">{day.clock_in}</span></div>}
                {day.clock_out && <div><span className="text-gray-400">{t('Clock Out')}:</span> <span className="font-medium text-gray-900 dark:text-gray-100">{day.clock_out}</span></div>}
                {day.total_hours > 0 && <div><span className="text-gray-400">{t('Total Hours')}:</span> <span className="font-medium text-gray-900 dark:text-gray-100">{Number(day.total_hours).toFixed(2)}h</span></div>}
                {day.overtime_hours > 0 && <div><span className="text-gray-400">{t('Overtime')}:</span> <span className="font-medium text-blue-600">{Number(day.overtime_hours).toFixed(2)}h</span></div>}
                {canEdit && <div className="pt-1 border-t border-gray-200 dark:border-gray-600 text-center text-gray-400 cursor-pointer">{t('Click to edit')}</div>}
            </div>
        );

        return (
            <Tooltip>
                <TooltipTrigger>
                    <div className="flex flex-col items-center justify-center gap-0.5 h-8">
                        <span className={`leading-none ${cfg.className}`}>{cfg.icon}</span>
                        {(day.is_late || day.is_early_departure || day.overtime_hours > 0) && (
                            <div className="flex items-center gap-0.5">
                                {day.is_late && <AlarmClock className="w-2.5 h-2.5 text-orange-500" />}
                                {day.is_early_departure && <ArrowLeftFromLine className="w-2.5 h-2.5 text-red-400" />}
                                {day.overtime_hours > 0 && <Timer className="w-2.5 h-2.5 text-blue-500" />}
                            </div>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 shadow-lg" arrowClassName="bg-white dark:bg-gray-800 fill-white dark:fill-gray-800 border-gray-200">{tooltipContent}</TooltipContent>
            </Tooltip>
        );
    };

    const [pageInitialState, setPageInitialState] = useState(true);
    useEffect(() => {
        if (!pageInitialState) applyFilters();
        setPageInitialState(false);
    }, [selectedEmployee, selectedMonth, selectedYear]);

    const monthName = monthOptions?.find((m: any) => m.value === selectedMonth.toString())?.label || '';

    return (
        <PageTemplate
            // title={`${t('Attendance Records')} — ${monthName} ${selectedYear}`}
            title={`${t('Attendance Records')}`}
            description={t('View and manage monthly attendance records.')}
            url="/hr/attendance-records/monthly"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            {/* Filters */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                <SearchAndFilterBar
                    searchTerm=""
                    onSearchChange={() => { }}
                    onSearch={(e) => { e.preventDefault(); applyFilters(); }}
                    hideSearch={true}
                    filters={[
                        {
                            name: 'employee_id',
                            label: t('Employee'),
                            type: 'select',
                            value: selectedEmployee,
                            onChange: setSelectedEmployee,
                            options: [
                                { value: '_empty_', label: t('All Employees'), disabled: true },
                                ...(employees || []).map((emp: any) => ({
                                    value: emp.id.toString(),
                                    label: emp.name,
                                }))
                            ],
                            searchable: true,
                        },
                        {
                            name: 'month',
                            label: t('Month'),
                            type: 'select',
                            value: selectedMonth,
                            onChange: (val: string) => { setSelectedMonth(val); },
                            options: (monthOptions || []).map((m: any) => ({ value: m.value, label: m.label })),
                            hideBadgeCancelButton: true
                        },
                        {
                            name: 'year',
                            label: t('Year'),
                            type: 'select',
                            value: selectedYear,
                            onChange: (val: string) => { setSelectedYear(val); },
                            options: (yearOptions || []).map((y: any) => ({ value: y.value, label: y.label })),
                            hideBadgeCancelButton: true
                        },
                    ]}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onResetFilters={handleResetFilters}
                />
            </div>

            {/* Legend */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 px-4 py-3 border border-gray-100 dark:border-gray-800">
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1.5"><span className="text-green-600 font-bold text-sm">✓</span> {t('Present')}</span>
                    <span className="flex items-center gap-1.5"><span className="text-red-500 font-bold text-sm">✕</span> {t('Absent')}</span>
                    <span className="flex items-center gap-1.5"><span className="text-yellow-500 font-bold text-sm">½</span> {t('Half Day')}</span>
                    <span className="flex items-center gap-1.5"><span className="text-blue-500 text-sm">🚩</span> {t('On Leave')}</span>
                    <span className="flex items-center gap-1.5"><span className="text-purple-500 text-sm">⭐</span> {t('Holiday')}</span>
                    <span className="flex items-center gap-1.5"><span className="text-gray-400 text-base">⊘</span> {t('Day Off')}</span>
                    <span className="flex items-center gap-1.5"><span className="text-gray-300 text-sm">-</span> {t('Future')}</span>
                    <span className="flex items-center gap-1.5"><CircleDashed className="w-3 h-3 text-gray-400" /> {t('Attendance Not Added')}</span>
                    <span className="flex items-center gap-1.5"><AlarmClock className="w-3 h-3 text-orange-500" /> {t('Late')}</span>
                    <span className="flex items-center gap-1.5"><ArrowLeftFromLine className="w-3 h-3 text-red-400" /> {t('Early Departure')}</span>
                    <span className="flex items-center gap-1.5"><Timer className="w-3 h-3 text-blue-500" /> {t('Overtime')}</span>
                </div>
            </div>

            {/* Monthly Grid Table */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                <Table>
                    <TableHeader>
                        {/* Month name row */}
                        <TableRow className="bg-gray-50 dark:bg-gray-800">
                            <TableHead className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 min-w-[170px] w-[170px] border-r border-gray-200 dark:border-gray-700" />
                            <TableHead colSpan={(dayHeaders || []).length} className="text-center py-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {monthName} {selectedYear}
                            </TableHead>
                            <TableHead className="w-6 min-w-[24px] bg-gray-50 dark:bg-gray-800 p-0" />
                            <TableHead className="sticky right-0 z-10 bg-gray-50 dark:bg-gray-800 min-w-[60px] w-[60px] border-l border-gray-200 dark:border-gray-700" />
                        </TableRow>
                        {/* Day numbers row */}
                        <TableRow className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <TableHead className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 text-left px-3 py-3 font-semibold text-gray-700 dark:text-gray-300 min-w-[170px] w-[170px] border-r border-gray-200 dark:border-gray-700">
                                {t('Employee')}
                            </TableHead>
                            {(dayHeaders || []).map((header: any) => (
                                <TableHead
                                    key={header.day}
                                    className={`text-center px-1 py-2 font-medium min-w-[38px] w-[38px] ${header.is_weekend
                                        ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700/50'
                                        : 'text-gray-600 dark:text-gray-400'
                                        }`}
                                >
                                    <div className="text-sm font-semibold">{header.day}</div>
                                    <div className="text-xs text-gray-400">{header.day_name}</div>
                                </TableHead>
                            ))}
                            <TableHead className="w-6 min-w-[24px] bg-gray-50 dark:bg-gray-800 p-0" />
                            <TableHead className="sticky right-0 z-10 bg-gray-50 dark:bg-gray-800 text-center px-2 py-3 font-semibold text-gray-700 dark:text-gray-300 min-w-[60px] w-[60px] border-l border-gray-200 dark:border-gray-700">
                                {t('Total')}
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {(employeeRows?.data || []).length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={(dayHeaders?.length || 0) + 3} className="text-center py-16 text-gray-400 dark:text-gray-500">
                                    {t('No employees found.')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            (employeeRows?.data || []).map((emp: any, idx: number) => (
                                <TableRow
                                    key={emp.id}
                                    className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${idx % 2 !== 0 ? 'bg-gray-50/30 dark:bg-gray-800/20' : ''
                                        }`}
                                >
                                    {/* Employee info */}
                                    <TableCell className="sticky left-0 z-10 bg-white dark:bg-gray-900 px-3 py-2 border-r border-gray-100 dark:border-gray-800 min-w-[170px] w-[170px]">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm overflow-hidden shrink-0">
                                                {emp.avatar
                                                    ? <img src={emp.avatar} alt={emp.name} className="h-full w-full object-cover rounded-full" />
                                                    : getInitials(emp.name || '')
                                                }
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{emp.name}</div>
                                                {emp.designation && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{emp.designation}</div>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Day cells */}
                                    {(emp.days || []).map((day: any, dIdx: number) => (
                                        <TableCell
                                            key={dIdx}
                                            className={`text-center px-0 py-1 cursor-pointer ${day.is_weekend ? 'bg-gray-50 dark:bg-gray-800/30' : ''
                                                }`}
                                            onClick={() => hasPermission(permissions, 'edit-attendance-records') && day.id && handleEditCell(day, emp)}
                                        >
                                            {renderCell(day, emp)}
                                        </TableCell>
                                    ))}

                                    {/* Total */}
                                    <TableCell className="w-6 min-w-[24px] p-0 bg-white dark:bg-gray-900" />
                                    <TableCell className="sticky right-0 z-10 bg-white dark:bg-gray-900 text-center px-2 py-2 border-l border-gray-100 dark:border-gray-800 min-w-[60px] w-[60px]">
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                            {emp.present_days}
                                            <span className="text-gray-400 dark:text-gray-500 font-normal">/{emp.total_working_days}</span>
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                {/* Pagination */}
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow mt-4 overflow-hidden">
                    <Pagination
                        from={employeeRows?.from || 0}
                        to={employeeRows?.to || 0}
                        total={employeeRows?.total || 0}
                        links={employeeRows?.links}
                        entityName={t('employees')}
                        onPageChange={handlePageChange}
                        currentPerPage={pageFilters.per_page?.toString() || '10'}
                        onPerPageChange={(value) => {
                            router.get(route('hr.attendance-records.index'), {
                                page: 1,
                                per_page: value,
                                employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
                                month: selectedMonth,
                                year: selectedYear,
                                sort_field: pageFilters.sort_field || undefined,
                                sort_direction: pageFilters.sort_direction || undefined,
                            }, { preserveState: true, preserveScroll: true });
                        }}
                    />
                </div>
            </div>



            {/* Add / Edit Record Modal */}
            <CrudFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                formConfig={{
                    fields: [
                        {
                            name: 'employee_id',
                            label: t('Employee'),
                            type: 'select',
                            required: true,
                            searchable: true,
                            placeholder: t('Select Employee'),
                            options: (employees || []).map((emp: any) => ({
                                value: emp.id.toString(),
                                label: emp.name,
                            })),
                        },
                        { name: 'date', label: t('Date'), type: 'date', required: true },
                        { name: 'clock_in', label: t('Clock In Time'), type: 'time', required: true },
                        { name: 'clock_out', label: t('Clock Out Time'), type: 'time', required: true },
                        { name: 'is_holiday', label: t('Holiday'), type: 'checkbox', defaultValue: false },
                        { name: 'notes', label: t('Notes'), type: 'textarea', placeholder: t('e.g. Working from home...') },
                    ],
                    modalSize: 'lg',
                }}
                initialData={currentItem ? {
                    employee_id: currentItem.employee_id?.toString(),
                    date: currentItem.date,
                    clock_in: currentItem.clock_in,
                    clock_out: currentItem.clock_out,
                    status: currentItem.status,
                    is_holiday: currentItem.is_holiday,
                    notes: currentItem.notes || '',
                } : null}
                title={formMode === 'create' ? t('Add New Attendance Record') : t('Edit Attendance Record')}
                mode={formMode}
            />

            {/* Import Modal */}
            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title={t('Import Attendance Records from CSV/Excel')}
                importRoute="hr.attendance-records.import"
                parseRoute="hr.attendance-records.parse"
                sampleRoute={hasSampleFile ? 'hr.attendance-records.download.template' : undefined}
                importNotes={t('Ensure that the employee names, shift & attendance policy must match exactly with existing employees in your system.')}
                modalSize="xl"
                databaseFields={[
                    { key: 'employee', required: true },
                    { key: 'date', required: true },
                    { key: 'clock_in', required: true },
                    { key: 'clock_out', required: true },
                ]}
            />
        </PageTemplate>
    );
}
