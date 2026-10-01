import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { DollarSign, Layers, Lock, Calendar, FileText, User } from 'lucide-react';

interface ViewProps {
    record: any;
}

export default function View({ record }: ViewProps) {
    const { t } = useTranslation();

    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Employee Salary Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Employee Name & Basic Salary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Employee')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {record.employee?.name || '-'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            {t('Basic Salary')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 font-mono">
                            {window.appSettings?.formatCurrency(record.basic_salary || 0)}
                        </p>
                    </div>
                </div>

                {/* Status & Created At */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                record.is_active
                                    ? 'bg-green-50 text-green-700 ring-green-600/20'
                                    : 'bg-red-50 text-red-700 ring-red-600/20'
                            }`}>
                                {record.is_active ? t('Active') : t('Inactive')}
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Created At')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {record.created_at ? (window.appSettings?.formatDateTimeSimple(record.created_at, false) || record.created_at) : '-'}
                        </p>
                    </div>
                </div>

                {/* Salary Components */}
                <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        {t('Salary Components')}
                    </label>
                    <div className="mt-2">
                        {record.component_names?.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {record.component_names.map((name: string, index: number) => {
                                    const isEarning = record.component_types?.[index] === 'earning';
                                    return (
                                        <span key={index} className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                            isEarning
                                                ? 'bg-green-50 text-green-700 ring-green-700/10'
                                                : 'bg-red-50 text-red-700 ring-red-700/10'
                                        }`}>
                                            {name}
                                        </span>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm font-medium text-gray-900">{t('Basic only')}</p>
                        )}
                    </div>
                </div>

                {/* Notes */}
                {record.notes && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Notes')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{record.notes}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
