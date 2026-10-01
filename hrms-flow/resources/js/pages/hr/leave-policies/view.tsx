import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { FileText, Tag, RefreshCw, ArrowUpDown, Lock, Hash } from 'lucide-react';
interface ViewLeavePolicyProps {
    leavePolicy: any;
}
export default function View({ leavePolicy }: ViewLeavePolicyProps) {
    const { t } = useTranslation();
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Leave Policy Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Policy Name')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{leavePolicy.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Leave Type')}
                        </label>
                        <div className="mt-1 flex items-center gap-2">
                            {leavePolicy.leave_type?.color && (
                                <div className="w-3 h-3 rounded-full shrink-0" />
                            )}
                            <p className="text-sm font-medium text-gray-900">{leavePolicy.leave_type?.name || '-'}</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            {t('Accrual')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 font-mono">
                            {leavePolicy.accrual_rate} {t('days')}/{leavePolicy.accrual_type || '-'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <ArrowUpDown className="h-4 w-4" />
                            {t('Carry Forward Limit')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 font-mono">{leavePolicy.carry_forward_limit} {t('days')}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            {t('Min Days Per Application')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 font-mono">{leavePolicy.min_days_per_application} {t('days')}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            {t('Max Days Per Application')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 font-mono">{leavePolicy.max_days_per_application} {t('days')}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Approval')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${leavePolicy.requires_approval ? 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20' : 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'}`}>
                                {leavePolicy.requires_approval ? t('Required') : t('Not Required')}
                            </span>
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${leavePolicy.status === 'active' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'}`}>
                                {leavePolicy.status === 'active' ? t('Active') : t('Inactive')}
                            </span>
                        </p>
                    </div>
                </div>
                {leavePolicy.description && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Description')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{leavePolicy.description}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
