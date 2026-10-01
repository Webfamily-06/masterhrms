import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { ArrowRightLeft, Calendar, FileText, Eye, ArrowRight, GitBranch, Building2, Briefcase, Lock } from 'lucide-react';
import { getImagePath } from '@/utils/helpers';
interface ViewTransferProps {
    transfer: any;
}
export default function View({ transfer }: ViewTransferProps) {
    const { t } = useTranslation();
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800 border-green-200';
            case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        }
    };
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <ArrowRightLeft className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Transfer Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Transfer Changes */}
                <div className="space-y-3">
                    {/* Branch Transfer */}
                    {(transfer.from_branch_id || transfer.to_branch_id) && (
                        <div>
                            <label className="text-xs font-medium text-gray-500 flex items-center gap-2 mb-2">
                                <GitBranch className="h-3.5 w-3.5" />
                                {t('Branch Transfer')}
                            </label>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 p-3 rounded-lg border bg-red-50 border-red-100">
                                    <p className="text-xs text-gray-500 mb-1">{t('From')}</p>
                                    <p className="text-sm font-semibold text-gray-900">{transfer.from_branch?.name || '-'}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                                <div className="flex-1 p-3 rounded-lg border bg-green-50 border-green-100">
                                    <p className="text-xs text-gray-500 mb-1">{t('To')}</p>
                                    <p className="text-sm font-semibold text-gray-900">{transfer.to_branch?.name || '-'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Department Transfer */}
                    {(transfer.from_department_id || transfer.to_department_id) && (
                        <div>
                            <label className="text-xs font-medium text-gray-500 flex items-center gap-2 mb-2">
                                <Building2 className="h-3.5 w-3.5" />
                                {t('Department Transfer')}
                            </label>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 p-3 rounded-lg border bg-red-50 border-red-100">
                                    <p className="text-xs text-gray-500 mb-1">{t('From')}</p>
                                    <p className="text-sm font-semibold text-gray-900">{transfer.from_department?.name || '-'}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                                <div className="flex-1 p-3 rounded-lg border bg-green-50 border-green-100">
                                    <p className="text-xs text-gray-500 mb-1">{t('To')}</p>
                                    <p className="text-sm font-semibold text-gray-900">{transfer.to_department?.name || '-'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Designation Transfer */}
                    {(transfer.from_designation_id || transfer.to_designation_id) && (
                        <div>
                            <label className="text-xs font-medium text-gray-500 flex items-center gap-2 mb-2">
                                <Briefcase className="h-3.5 w-3.5" />
                                {t('Designation Transfer')}
                            </label>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 p-3 rounded-lg border bg-red-50 border-red-100">
                                    <p className="text-xs text-gray-500 mb-1">{t('From')}</p>
                                    <p className="text-sm font-semibold text-gray-900">{transfer.from_designation?.name || '-'}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                                <div className="flex-1 p-3 rounded-lg border bg-green-50 border-green-100">
                                    <p className="text-xs text-gray-500 mb-1">{t('To')}</p>
                                    <p className="text-sm font-semibold text-gray-900">{transfer.to_designation?.name || '-'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Transfer Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{transfer.transfer_date ? (window.appSettings?.formatDateTimeSimple(transfer.transfer_date, false) || transfer.transfer_date) : '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Effective Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{transfer.effective_date ? (window.appSettings?.formatDateTimeSimple(transfer.effective_date, false) || transfer.effective_date) : '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border capitalize ${getStatusClass(transfer.status)}`}>
                                {transfer.status || '-'}
                            </span>
                        </p>
                    </div>
                </div>
                {/* Document */}
                {transfer.documents && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                {t('Documents')}
                            </label>
                            <a href={getImagePath(transfer.documents)} target="_blank" rel="noreferrer" className="mt-2 group block relative overflow-hidden rounded-lg border bg-gray-50 hover:border-primary transition-colors">
                                <img
                                    src={getImagePath(transfer.documents)}
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
                {transfer.reason && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Reason')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{transfer.reason}</p>
                    </div>
                )}
                {transfer.notes && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Notes')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{transfer.notes}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
