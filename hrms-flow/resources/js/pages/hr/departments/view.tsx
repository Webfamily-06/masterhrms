import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { Building2, GitBranch, Lock, FileText } from 'lucide-react';

interface ViewDepartmentProps {
    department: any;
}

export default function View({ department }: ViewDepartmentProps) {
    const { t } = useTranslation();

    return (
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Department Details')}</DialogTitle>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Name & Branch */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {t('Department Name')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{department.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <GitBranch className="h-4 w-4" />
                            {t('Branch')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{department.branch?.name || '-'}</p>
                    </div>
                </div>

                {/* Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                department.status === 'active'
                                    ? 'bg-green-50 text-green-700 ring-green-600/20'
                                    : 'bg-red-50 text-red-700 ring-red-600/20'
                            }`}>
                                {department.status === 'active' ? t('Active') : t('Inactive')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Description */}
                {department.description && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Description')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{department.description}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
