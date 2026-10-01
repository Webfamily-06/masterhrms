import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { User, Calendar, Clock, MessageSquare, ArrowRight, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ViewProps {
    record: any;
}

export default function View({ record }: ViewProps) {
    const { t } = useTranslation();

    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20',
        approved: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20',
        rejected: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
    };

    const StatusIcon = record.status === 'approved' ? CheckCircle : record.status === 'rejected' ? XCircle : AlertCircle;

    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Regularization Request Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Employee & Date */}
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

                {/* Time Comparison */}
                <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-3">
                        <Clock className="h-4 w-4" />
                        {t('Time Adjustment')}
                    </label>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            {/* Original */}
                            <div className="text-center flex-1">
                                <p className="text-xs text-gray-500 font-medium mb-2">{t('Original')}</p>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-center gap-1 text-red-600">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span className="font-mono text-sm">
                                            {record.original_clock_in ? window.appSettings?.formatTime(record.original_clock_in) : '--:--'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-center gap-1 text-red-600">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span className="font-mono text-sm">
                                            {record.original_clock_out ? window.appSettings?.formatTime(record.original_clock_out) : '--:--'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="px-4">
                                <ArrowRight className="h-5 w-5 text-gray-400" />
                            </div>
                            {/* Requested */}
                            <div className="text-center flex-1">
                                <p className="text-xs text-gray-500 font-medium mb-2">{t('Requested')}</p>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-center gap-1 text-green-600">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span className="font-mono text-sm">
                                            {record.requested_clock_in ? window.appSettings?.formatTime(record.requested_clock_in) : '--:--'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-center gap-1 text-green-600">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span className="font-mono text-sm">
                                            {record.requested_clock_out ? window.appSettings?.formatTime(record.requested_clock_out) : '--:--'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status & Requested On */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <StatusIcon className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${statusColors[record.status] || statusColors.pending}`}>
                                {record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : '-'}
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Requested On')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {record.created_at ? (window.appSettings?.formatDateTimeSimple(record.created_at, false) || record.created_at) : '-'}
                        </p>
                    </div>
                </div>

                {/* Approved/Rejected At */}
                {record.status !== 'pending' && record.approved_at && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {record.status === 'approved' ? t('Approved At') : t('Rejected At')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {window.appSettings?.formatDateTimeSimple(record.approved_at, false) || record.approved_at}
                        </p>
                    </div>
                )}

                {/* Reason */}
                <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        {t('Reason')}
                    </label>
                    <p className="mt-1 text-sm font-medium text-gray-900">{record.reason || '-'}</p>
                </div>

                {/* Manager Comments */}
                {record.manager_comments && record.status !== 'pending' && record.manager_comments !== 'Approved' && record.manager_comments !== 'Rejected' && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            {t('Manager Comments')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 italic">"{record.manager_comments}"</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
