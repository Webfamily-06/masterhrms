import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { Shield, Clock, DollarSign, Lock, FileText } from 'lucide-react';
interface ViewAttendancePolicyProps {
    policy: any;
}
export default function View({ policy }: ViewAttendancePolicyProps) {
    const { t } = useTranslation();
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Shield className="h-5 w-5 text-blue-600" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Attendance Policy Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            {t('Policy Name')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{policy.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${policy.status === 'active' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'}`}>
                                {policy.status === 'active' ? t('Active') : t('Inactive')}
                            </span>
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {t('Late Arrival Grace')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 font-mono">{policy.late_arrival_grace} {t('minutes')}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {t('Early Departure Grace')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 font-mono">{policy.early_departure_grace} {t('minutes')}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            {t('Overtime Rate Per Hour')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 font-mono">
                            {policy.overtime_rate_per_hour ? `${window.appSettings?.formatCurrency(policy.overtime_rate_per_hour)}/hr` : '-'}
                        </p>
                    </div>
                </div>
                {policy.description && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Description')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{policy.description}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
