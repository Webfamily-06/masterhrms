import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { FileText, Calendar, Clock, RefreshCw, Lock, Hash } from 'lucide-react';
interface ViewContractTypeProps {
    contractType: any;
}
export default function View({ contractType }: ViewContractTypeProps) {
    const { t } = useTranslation();
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Contract Type Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Contract Type Name')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{contractType.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${contractType.status === 'active' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'}`}>
                                {t(contractType.status === 'active' ? 'Active' : 'Inactive')}
                            </span>
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Duration')}
                        </label>
                        <p className="mt-1">
                            {contractType.default_duration_months ? (
                                <span className="text-sm font-medium text-gray-900">{contractType.default_duration_months} {t('months')}</span>
                            ) : (
                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                    {t('Permanent')}
                                </span>
                            )}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {t('Probation Period')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{contractType.probation_period_months ?? '-'} {contractType.probation_period_months !== undefined ? t('months') : ''}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {t('Notice Period')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{contractType.notice_period_days ?? '-'} {contractType.notice_period_days !== undefined ? t('days') : ''}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            {t('Renewable')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${contractType.is_renewable ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-gray-50 text-gray-600 ring-gray-500/10'}`}>
                                {contractType.is_renewable ? t('Yes') : t('No')}
                            </span>
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            {t('Contracts')}
                        </label>
                        <p className="mt-1">
                            <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                {contractType.contracts_count || 0} {t('contracts')}
                            </span>
                        </p>
                    </div>
                </div>
                {contractType.description && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Description')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{contractType.description}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
