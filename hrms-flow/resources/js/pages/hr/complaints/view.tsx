import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { MessageSquareWarning, User, Tag, Calendar, FileText, Eye, UserCheck } from 'lucide-react';
import { getImagePath } from '@/utils/helpers';
interface ViewComplaintProps {
    complaint: any;
}
export default function View({ complaint }: ViewComplaintProps) {
    const { t } = useTranslation();
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'under investigation': return 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20';
            case 'resolved': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            case 'dismissed': return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20';
            default: return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20';
        }
    };
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <MessageSquareWarning className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Complaint Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Complainant')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {complaint.is_anonymous ? t('Anonymous') : (complaint.employee?.name || '-')}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Against')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{complaint.against_employee?.name || '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Complaint Type')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{complaint.complaint_type || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Complaint Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{complaint.complaint_date ? (window.appSettings?.formatDateTimeSimple(complaint.complaint_date, false) || complaint.complaint_date) : '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ${getStatusClass(complaint.status)}`}>
                                {complaint.status || '-'}
                            </span>
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <UserCheck className="h-4 w-4" />
                            {t('Assigned To')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{complaint.assigned_user?.name || '-'}</p>
                    </div>
                </div>
                {complaint.documents && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                {t('Documents')}
                            </label>
                            <a href={getImagePath(complaint.documents)} target="_blank" rel="noreferrer" className="mt-2 group block relative overflow-hidden rounded-lg border bg-gray-50 hover:border-primary transition-colors">
                                <img
                                    src={getImagePath(complaint.documents)}
                                    alt={t('Document')}
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
                {complaint.subject && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Subject')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{complaint.subject}</p>
                    </div>
                )}
                {complaint.description && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Description')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{complaint.description}</p>
                    </div>
                )}
                {complaint.investigation_notes && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Investigation Notes')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{complaint.investigation_notes}</p>
                    </div>
                )}
                {complaint.resolution_action && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Resolution Action')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{complaint.resolution_action}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
