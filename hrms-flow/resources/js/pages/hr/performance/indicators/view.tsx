import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { BarChart2, LayoutGrid, Ruler, Target, Lock, FileText } from 'lucide-react';
interface ViewIndicatorProps {
    indicator: any;
}
export default function View({ indicator }: ViewIndicatorProps) {
    const { t } = useTranslation();
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <BarChart2 className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Indicator Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <BarChart2 className="h-4 w-4" />
                            {t('Indicator Name')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{indicator.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <LayoutGrid className="h-4 w-4" />
                            {t('Category')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{indicator.category?.name || '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Ruler className="h-4 w-4" />
                            {t('Measurement Unit')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{indicator.measurement_unit || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            {t('Target Value')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{indicator.target_value || '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${indicator.status === 'active' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'}`}>
                                {indicator.status === 'active' ? t('Active') : t('Inactive')}
                            </span>
                        </p>
                    </div>
                </div>
                {indicator.description && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Description')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{indicator.description}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
