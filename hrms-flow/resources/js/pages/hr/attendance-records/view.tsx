import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { Clock, LogIn, LogOut, User, Calendar, AlertTriangle, FileText } from 'lucide-react';
interface ViewAttendanceRecordProps {
    record: any;
}
export default function View({ record }: ViewAttendanceRecordProps) {
    const { t } = useTranslation();
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'present': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            case 'absent': return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20';
            case 'half_day': return 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20';
            case 'on_leave': return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20';
            case 'holiday': return 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20';
            default: return 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20';
        }
    };
    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'present': return t('Present');
            case 'absent': return t('Absent');
            case 'half_day': return t('Half Day');
            case 'on_leave': return t('On Leave');
            case 'holiday': return t('Holiday');
            default: return status;
        }
    };
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Attendance Record Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Employee')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{record.employee?.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {record.date ? (window.appSettings?.formatDateTimeSimple(record.date, false) || record.date) : '-'}
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {t('Shift')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{record.shift?.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getStatusClass(record.status)}`}>
                                {getStatusLabel(record.status)}
                            </span>
                            {record.leave_type && (
                                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                                    {record.leave_type.name}
                                </span>
                            )}
                            {record.is_late && (
                                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20">
                                    {t('Late')}
                                </span>
                            )}
                            {record.is_early_departure && (
                                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20">
                                    {t('Early Departure')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <LogIn className="h-4 w-4" />
                            {t('Clock In')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 font-mono">
                            {record.clock_in ? (window.appSettings?.formatTime(record.clock_in) || record.clock_in) : '-'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <LogOut className="h-4 w-4" />
                            {t('Clock Out')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 font-mono">
                            {record.clock_out ? (window.appSettings?.formatTime(record.clock_out) || record.clock_out) : '-'}
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {t('Total Hours')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 font-mono">{Number(record.total_hours || 0).toFixed(2)}h</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            {t('Overtime')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 font-mono">
                            {Number(record.overtime_hours || 0).toFixed(2)}h
                            {record.overtime_amount > 0 && (
                                <span className="ml-2 text-xs text-gray-500">({window.appSettings?.formatCurrency(record.overtime_amount)})</span>
                            )}
                        </p>
                    </div>
                </div>
                {record.notes && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Notes')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{record.notes}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
