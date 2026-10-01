import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { Clock, User, Calendar, Briefcase, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

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
                    <DialogTitle className="text-xl font-semibold">{t('Timesheet Details')}</DialogTitle>
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

                {/* Hours & Project */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {t('Hours')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 font-mono text-blue-600">{record.hours}h</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            {t('Project')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${record.project ? 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20' : 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20'}`}>
                                {record.project || t('No Project')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Status & Submitted On */}
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
                            {t('Submitted On')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {record.created_at ? (window.appSettings?.formatDateTimeSimple(record.created_at, false) || record.created_at) : '-'}
                        </p>
                    </div>
                </div>



                {/* Approved By & Approved At */}
                {record.status !== 'pending' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {t('Approved By')}
                            </label>
                            <p className="mt-1 text-sm font-medium text-gray-900">
                                {record.approver?.name || '-'}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {t('Approved At')}
                            </label>
                            <p className="mt-1 text-sm font-medium text-gray-900">
                                {record.approved_at ? (window.appSettings?.formatDateTimeSimple(record.approved_at, false) || record.approved_at) : '-'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Description */}
                <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {t('Description')}
                    </label>
                    <p className="mt-1 text-sm font-medium text-gray-900">{record.description || '-'}</p>
                </div>

                {/* Manager Comments */}
                {record.manager_comments && record.status !== 'pending' && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Manager Comments')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 italic">"{record.manager_comments}"</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
