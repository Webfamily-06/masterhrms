import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { Users, Briefcase, Hash, Lock, FileText } from 'lucide-react';
interface ViewInterviewRoundProps {
    interviewRound: any;
}
export default function View({ interviewRound }: ViewInterviewRoundProps) {
    const { t } = useTranslation();
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Users className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Interview Round Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {t('Name')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{interviewRound.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            {t('Sequence Number')}
                        </label>
                        <p className="mt-1">
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                {interviewRound.sequence_number || '-'}
                            </span>
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            {t('Job')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{interviewRound.job?.title || '-'}</p>
                        {interviewRound.job?.job_code && (
                            <p className="text-xs text-gray-500">{interviewRound.job.job_code}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${interviewRound.status === 'active' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'}`}>
                                {interviewRound.status === 'active' ? t('Active') : t('Inactive')}
                            </span>
                        </p>
                    </div>
                </div>
                {interviewRound.description && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Description')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{interviewRound.description}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
