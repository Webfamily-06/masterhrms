import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { CheckSquare, User, Calendar, FileText, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
interface ViewActionItemProps {
    actionItem: any;
}
export default function View({ actionItem }: ViewActionItemProps) {
    const { t } = useTranslation();
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Not Started': return 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10';
            case 'In Progress': return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20';
            case 'Completed': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            case 'Overdue': return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10';
            default: return 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10';
        }
    };
    const getPriorityClass = (priority: string) => {
        switch (priority) {
            case 'Low': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            case 'Medium': return 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20';
            case 'High': return 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20';
            case 'Critical': return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10';
            default: return 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10';
        }
    };
    const getProgressColor = (status: string) => {
        if (status === 'Completed') return 'bg-green-500';
        if (status === 'Overdue') return 'bg-red-500';
        return 'bg-blue-500';
    };
    const isOverdue = actionItem.due_date && new Date(actionItem.due_date) < new Date() && actionItem.status !== 'Completed';
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <CheckSquare className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Action Item Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <CheckSquare className="h-4 w-4" />
                            {t('Title')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{actionItem.title || '-'}</p>
                        {actionItem.meeting?.title && (
                            <p className="text-xs text-gray-500">{actionItem.meeting.title}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Assigned To')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{actionItem.assignee?.name || '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Due Date')}
                        </label>
                        <p className={`mt-1 text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                            {actionItem.due_date ? (window.appSettings?.formatDateTimeSimple(actionItem.due_date, false) || actionItem.due_date) : '-'}
                            {isOverdue && (
                                <span className="ml-2 inline-flex items-center gap-1 text-xs text-red-500">
                                    <AlertTriangle className="h-3 w-3" />{t('Overdue')}
                                </span>
                            )}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            {t('Priority')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getPriorityClass(actionItem.priority)}`}>
                                {t(actionItem.priority) || '-'}
                            </span>
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getStatusClass(actionItem.status)}`}>
                                {t(actionItem.status) || '-'}
                            </span>
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <CheckSquare className="h-4 w-4" />
                            {t('Progress')}
                        </label>
                        <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full ${getProgressColor(actionItem.status)}`}
                                    style={{ width: `${actionItem.progress_percentage || 0}%` }}
                                ></div>
                            </div>
                            <span className="text-xs font-medium text-gray-600 shrink-0">{actionItem.progress_percentage || 0}%</span>
                        </div>
                    </div>
                </div>
                {actionItem.description && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Description')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{actionItem.description}</p>
                    </div>
                )}
                {actionItem.notes && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Notes')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{actionItem.notes}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
