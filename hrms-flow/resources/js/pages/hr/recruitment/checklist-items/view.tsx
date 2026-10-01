import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { CheckSquare, Tag, Lock, FileText } from 'lucide-react';
interface ViewChecklistItemProps {
    checklistItem: any;
}
export default function View({ checklistItem }: ViewChecklistItemProps) {
    const { t } = useTranslation();
    const getCategoryClass = (category: string) => {
        switch (category) {
            case 'Documentation': return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20';
            case 'IT Setup': return 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20';
            case 'Training': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            case 'HR': return 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20';
            case 'Facilities': return 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20';
            default: return 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10';
        }
    };
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <CheckSquare className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Checklist Item Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <CheckSquare className="h-4 w-4" />
                            {t('Task Name')}
                        </label>
                        <div className="mt-1 flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">{checklistItem.task_name || '-'}</p>
                            {checklistItem.is_required && (
                                <span className="inline-flex items-center rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                                    {t('Required')}
                                </span>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <CheckSquare className="h-4 w-4" />
                            {t('Checklist')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{checklistItem.checklist?.name || '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Category')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getCategoryClass(checklistItem.category)}`}>
                                {t(checklistItem.category) || '-'}
                            </span>
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${checklistItem.status === 'active' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'}`}>
                                {t(checklistItem.status === 'active' ? 'Active' : 'Inactive')}
                            </span>
                        </p>
                    </div>
                </div>
                {checklistItem.description && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Description')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{checklistItem.description}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
