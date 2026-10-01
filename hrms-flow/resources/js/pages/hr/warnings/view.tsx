import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Calendar, FileText, Tag, Eye, User } from 'lucide-react';
import { useInitials } from '@/hooks/use-initials';
import { getImagePath } from '@/utils/helpers';
interface ViewWarningProps {
    warning: any;
}
export default function View({ warning }: ViewWarningProps) {
    const { t } = useTranslation();
    const getInitials = useInitials();
    const getSeverityClass = (severity: string) => {
        switch (severity) {
            case 'verbal': return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20';
            case 'written': return 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20';
            case 'final': return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20';
            default: return 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20';
        }
    };
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'issued': return 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20';
            case 'acknowledged': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            case 'expired': return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20';
            default: return 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20';
        }
    };
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Warning Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white overflow-hidden shrink-0">
                            {warning.employee?.avatar ? (
                                <img src={warning.employee.avatar} alt={warning.employee?.name} className="h-full w-full object-cover" />
                            ) : (
                                getInitials(warning.employee?.name || '')
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">{t('Employee')}</p>
                            <p className="text-sm font-semibold text-gray-900">{warning.employee?.name || '-'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ${getSeverityClass(warning.severity)}`}>
                            {warning.severity || '-'}
                        </span>
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ${getStatusClass(warning.status)}`}>
                            {warning.status || '-'}
                        </span>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Subject')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{warning.subject || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Warning Type')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 capitalize">{warning.warning_type || '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Warning By')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{warning.warned_by?.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Warning Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{warning.warning_date ? (window.appSettings?.formatDateTimeSimple(warning.warning_date, false) || warning.warning_date) : '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Expiry Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{warning.expiry_date ? (window.appSettings?.formatDateTimeSimple(warning.expiry_date, false) || warning.expiry_date) : '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Improvement Plan')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${warning.has_improvement_plan ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' : 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20'}`}>
                                {warning.has_improvement_plan ? t('Yes') : t('No')}
                            </span>
                        </p>
                    </div>
                </div>
                {warning.documents && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                {t('Documents')}
                            </label>
                            <a href={getImagePath(warning.documents)} target="_blank" rel="noreferrer" className="mt-2 group block relative overflow-hidden rounded-lg border bg-gray-50 hover:border-primary transition-colors">
                                <img
                                    src={getImagePath(warning.documents)}
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
                {warning.description && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Description')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{warning.description}</p>
                    </div>
                )}
                {warning.employee_response && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Employee Response')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{warning.employee_response}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
