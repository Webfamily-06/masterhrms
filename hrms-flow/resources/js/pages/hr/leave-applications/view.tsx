import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { CalendarDays, User, Tag, Hash, FileText, Eye } from 'lucide-react';
import { getImagePath } from '@/utils/helpers';
interface ViewLeaveApplicationProps {
    leaveApplication: any;
}
export default function View({ leaveApplication }: ViewLeaveApplicationProps) {
    const { t } = useTranslation();
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            case 'rejected': return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20';
            default: return 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20';
        }
    };
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Leave Application Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Employee')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{leaveApplication.employee?.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Leave Type')}
                        </label>
                        <div className="mt-1 flex items-center gap-2">
                            {leaveApplication.leave_type?.color && (
                                <div className="w-3 h-3 rounded-full shrink-0" />
                            )}
                            <p className="text-sm font-medium text-gray-900">{leaveApplication.leave_type?.name || '-'}</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            {t('Start Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {leaveApplication.start_date ? (window.appSettings?.formatDateTimeSimple(leaveApplication.start_date, false) || leaveApplication.start_date) : '-'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            {t('End Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {leaveApplication.end_date ? (window.appSettings?.formatDateTimeSimple(leaveApplication.end_date, false) || leaveApplication.end_date) : '-'}
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            {t('Total Days')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 font-mono">{leaveApplication.total_days || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ${getStatusClass(leaveApplication.status)}`}>
                                {leaveApplication.status || '-'}
                            </span>
                        </p>
                    </div>
                </div>
                {leaveApplication.attachment && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                {t('Attachment')}
                            </label>
                            <a href={getImagePath(leaveApplication.attachment)} target="_blank" rel="noreferrer" className="mt-2 group block relative overflow-hidden rounded-lg border bg-gray-50 hover:border-primary transition-colors">
                                <img
                                    src={getImagePath(leaveApplication.attachment)}
                                    alt={t('Attachment')}
                                    className="w-full h-36 object-cover group-hover:opacity-90 transition-opacity"
                                    onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                                    <Eye className="h-6 w-6 text-white" />
                                </div>
                            </a>
                        </div>
                    </div>
                )}
                {leaveApplication.reason && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Reason')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{leaveApplication.reason}</p>
                    </div>
                )}
                {leaveApplication.manager_comments && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Manager Comments')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{leaveApplication.manager_comments}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
