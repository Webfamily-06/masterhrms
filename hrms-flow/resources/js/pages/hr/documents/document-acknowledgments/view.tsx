import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { FileText, User, Calendar, CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';
interface ViewDocumentAcknowledgmentProps {
    acknowledgment: any;
}
export default function View({ acknowledgment }: ViewDocumentAcknowledgmentProps) {
    const { t } = useTranslation();
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20';
            case 'Acknowledged': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            case 'Overdue': return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10';
            case 'Exempted': return 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10';
            default: return 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10';
        }
    };
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Pending': return <Clock className="h-3 w-3" />;
            case 'Acknowledged': return <CheckCircle className="h-3 w-3" />;
            case 'Overdue': return <AlertTriangle className="h-3 w-3" />;
            case 'Exempted': return <XCircle className="h-3 w-3" />;
            default: return <Clock className="h-3 w-3" />;
        }
    };
    const isOverdue = acknowledgment.due_date && new Date(acknowledgment.due_date) < new Date() && acknowledgment.status !== 'Acknowledged' && acknowledgment.status !== 'Exempted';
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl font-semibold">{t('Acknowledgment Details')}</DialogTitle>
                        {acknowledgment.document?.category?.name && (
                            <p className="text-xs text-gray-500 mt-0.5">{acknowledgment.document.category.name}</p>
                        )}
                    </div>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Document')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{acknowledgment.document?.title || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Employee')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{acknowledgment.user?.name || '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${getStatusClass(acknowledgment.status)}`}>
                                {getStatusIcon(acknowledgment.status)}
                                {t(acknowledgment.status) || '-'}
                            </span>
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Due Date')}
                        </label>
                        <p className={`mt-1 text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                            {acknowledgment.due_date ? (window.appSettings?.formatDateTimeSimple(acknowledgment.due_date, false) || acknowledgment.due_date) : '-'}
                            {isOverdue && <span className="ml-2 text-xs text-red-500">({t('Overdue')})</span>}
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            {t('Acknowledged At')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {acknowledgment.acknowledged_at ? (window.appSettings?.formatDateTimeSimple(acknowledgment.acknowledged_at, false) || acknowledgment.acknowledged_at) : '-'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Assigned At')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {acknowledgment.assigned_at ? (window.appSettings?.formatDateTimeSimple(acknowledgment.assigned_at, false) || acknowledgment.assigned_at) : '-'}
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Assigned By')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{acknowledgment.assigned_by?.name || '-'}</p>
                    </div>
                </div>
                {acknowledgment.acknowledgment_note && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Acknowledgment Note')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{acknowledgment.acknowledgment_note}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
