import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { CalendarDays, User, Tag, Hash, FileText } from 'lucide-react';
interface ViewLeaveBalanceProps {
    leaveBalance: any;
}
export default function View({ leaveBalance }: ViewLeaveBalanceProps) {
    const { t } = useTranslation();
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Leave Balance Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Employee')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{leaveBalance.employee?.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Leave Type')}
                        </label>
                        <div className="mt-1 flex items-center gap-2">
                            {leaveBalance.leave_type?.color && (
                                <div className="w-3 h-3 rounded-full shrink-0"/>
                            )}
                            <p className="text-sm font-medium text-gray-900">{leaveBalance.leave_type?.name || '-'}</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            {t('Year')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 font-mono">{leaveBalance.year || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            {t('Allocated Days')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-blue-600 font-mono">{leaveBalance.allocated_days ?? '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            {t('Used Days')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-red-600 font-mono">{leaveBalance.used_days ?? '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            {t('Remaining Days')}
                        </label>
                        <p className={`mt-1 text-sm font-medium font-mono ${leaveBalance.remaining_days > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                            {leaveBalance.remaining_days ?? '-'}
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            {t('Carried Forward')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-purple-600 font-mono">{leaveBalance.carried_forward ?? '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            {t('Manual Adjustment')}
                        </label>
                        <p className={`mt-1 text-sm font-medium font-mono ${leaveBalance.manual_adjustment > 0 ? 'text-green-600' : leaveBalance.manual_adjustment < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                            {leaveBalance.manual_adjustment > 0 ? '+' : ''}{leaveBalance.manual_adjustment ?? '-'}
                        </p>
                    </div>
                </div>
                {leaveBalance.adjustment_reason && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Adjustment Reason')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{leaveBalance.adjustment_reason}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
