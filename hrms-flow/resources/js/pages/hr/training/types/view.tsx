import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { BookOpen, GitBranch, Building2, FileText, BarChart2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
interface ViewTrainingTypeProps {
    trainingType: any;
}
export default function View({ trainingType }: ViewTrainingTypeProps) {
    const { t } = useTranslation();
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Training Type Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            {t('Name')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{trainingType.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <BarChart2 className="h-4 w-4" />
                            {t('Programs')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{trainingType.training_programs_count || '0'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <GitBranch className="h-4 w-4" />
                            {t('Branch')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{trainingType.branch?.name || '-'}</p>
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {t('Departments')}
                    </label>
                    <div className="mt-1 flex flex-wrap gap-1">
                        {trainingType.departments?.length > 0 ? trainingType.departments.map((dept: any) => (
                            <Badge key={dept.id} variant="outline" className="flex flex-col items-start">
                                <div className="font-medium">{dept.name}</div>
                                <div className="text-xs text-gray-500">{dept.branch?.name || '-'}</div>
                            </Badge>
                        )) : <p className="text-sm font-medium text-gray-500">{t('Departments Not Assigned')}</p>}
                    </div>
                </div>
                {trainingType.description && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Description')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{trainingType.description}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
