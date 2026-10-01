import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { ClipboardList, User, FileText, Hash, Calendar, UserCheck } from 'lucide-react';
interface ViewCandidateAssessmentProps {
    assessment: any;
}
export default function View({ assessment }: ViewCandidateAssessmentProps) {
    const { t } = useTranslation();
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Pass': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            case 'Fail': return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10';
            case 'Pending': return 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20';
            default: return 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10';
        }
    };
    const percentage = assessment.score && assessment.max_score
        ? Math.round((assessment.score / assessment.max_score) * 100)
        : null;
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <ClipboardList className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Candidate Assessment Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Candidate')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {assessment.candidate ? `${assessment.candidate.first_name} ${assessment.candidate.last_name}` : '-'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <ClipboardList className="h-4 w-4" />
                            {t('Assessment Name')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{assessment.assessment_name || '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            {t('Score')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {assessment.score && assessment.max_score
                                ? <>{assessment.score}/{assessment.max_score} <span className="text-xs text-gray-500">({percentage}%)</span></>
                                : '-'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getStatusClass(assessment.pass_fail_status)}`}>
                                {t(assessment.pass_fail_status) || '-'}
                            </span>
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <UserCheck className="h-4 w-4" />
                            {t('Conducted By')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{assessment.conductor?.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Assessment Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {assessment.assessment_date ? (window.appSettings?.formatDateTimeSimple(assessment.assessment_date, false) || assessment.assessment_date) : '-'}
                        </p>
                    </div>
                </div>
                {assessment.comments && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Comments')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{assessment.comments}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
