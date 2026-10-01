import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { HelpCircle, CheckCircle } from 'lucide-react';
interface ViewCustomQuestionProps {
    customQuestion: any;
}
export default function View({ customQuestion }: ViewCustomQuestionProps) {
    const { t } = useTranslation();
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <HelpCircle className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Custom Question Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            {t('Required')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${customQuestion.required == 1 ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' : 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20'}`}>
                                {customQuestion.required == 1 ? t('Yes') : t('No')}
                            </span>
                        </p>
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <HelpCircle className="h-4 w-4" />
                        {t('Question')}
                    </label>
                    <p className="mt-1 text-sm font-medium text-gray-900">{customQuestion.question || '-'}</p>
                </div>
            </div>
        </DialogContent>
    );
}
