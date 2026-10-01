import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { FileText, User, Calendar, DollarSign, AlertTriangle } from 'lucide-react';
interface ViewEmployeeContractProps {
    contract: any;
}
export default function View({ contract }: ViewEmployeeContractProps) {
    const { t } = useTranslation();
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Draft': return 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10';
            case 'Pending Approval': return 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20';
            case 'Active': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            case 'Expired': return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10';
            case 'Terminated': return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10';
            case 'Renewed': return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20';
            default: return 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10';
        }
    };
    const getDaysUntilExpiry = () => {
        if (!contract.end_date || contract.status !== 'Active') return null;
        const today = new Date();
        const expiry = new Date(contract.end_date);
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays;
    };
    const daysUntilExpiry = getDaysUntilExpiry();
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Employee Contract Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Contract #')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{contract.contract_number || '-'}</p>
                        {contract.contract_type?.name && (
                            <p className="text-xs text-gray-500">{contract.contract_type.name}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Employee')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{contract.employee?.name || '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Start Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {contract.start_date ? (window.appSettings?.formatDateTimeSimple(contract.start_date, false) || contract.start_date) : '-'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('End Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {contract.end_date ? (window.appSettings?.formatDateTimeSimple(contract.end_date, false) || contract.end_date) : t('Permanent')}
                        </p>
                        {daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
                            <div className="flex items-center gap-1 text-orange-600 mt-1 text-xs">
                                <AlertTriangle className="h-3 w-3" />
                                {daysUntilExpiry} {t('days left')}
                            </div>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            {t('Basic Salary')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 font-mono">
                            {contract.basic_salary ? window.appSettings?.formatCurrency(contract.basic_salary) : '-'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getStatusClass(contract.status)}`}>
                                {t(contract.status) || '-'}
                            </span>
                        </p>
                    </div>
                </div>
                {contract.approved_at && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {t('Approved At')}
                            </label>
                            <p className="mt-1 text-sm font-medium text-gray-900">
                                {window.appSettings?.formatDateTimeSimple(contract.approved_at, false) || contract.approved_at}
                            </p>
                            {contract.approver?.name && (
                                <p className="text-xs text-gray-500">{contract.approver.name}</p>
                            )}
                        </div>
                    </div>
                )}
                {contract.terms_conditions && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Terms & Conditions')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{contract.terms_conditions}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
