import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { Target, User, Tag, Calendar, FileText, Crosshair } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
interface ViewEmployeeGoalProps {
    goal: any;
}
export default function View({ goal }: ViewEmployeeGoalProps) {
    const { t } = useTranslation();
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'in_progress': return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20';
            case 'completed': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            default: return 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20';
        }
    };
    const getStatusText = (status: string) => {
        switch (status) {
            case 'not_started': return t('Not Started');
            case 'in_progress': return t('In Progress');
            case 'completed': return t('Completed');
            default: return status;
        }
    };
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Target className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Employee Goal Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            {t('Goal Title')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{goal.title || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Employee')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{goal.employee?.name || '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Goal Type')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{goal.goal_type?.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Crosshair className="h-4 w-4" />
                            {t('Target')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{goal.target || '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Start Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{goal.start_date ? (window.appSettings?.formatDateTimeSimple(goal.start_date, false) || goal.start_date) : '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('End Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{goal.end_date ? (window.appSettings?.formatDateTimeSimple(goal.end_date, false) || goal.end_date) : '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getStatusClass(goal.status)}`}>
                                {getStatusText(goal.status)}
                            </span>
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            {t('Progress')}
                        </label>
                        <div className="mt-2 flex items-center gap-2">
                            <Progress value={goal.progress || 0} className="h-2 flex-1" />
                            <span className="text-xs font-medium text-gray-600 shrink-0">{goal.progress || 0}%</span>
                        </div>
                    </div>
                </div>
                {goal.description && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Description')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{goal.description}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
