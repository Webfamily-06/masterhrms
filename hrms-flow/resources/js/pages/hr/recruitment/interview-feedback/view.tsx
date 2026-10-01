import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { MessageSquare, User, Briefcase, Users, Star, FileText, ThumbsUp, ThumbsDown } from 'lucide-react';
interface ViewInterviewFeedbackProps {
    feedback: any;
}
function StarDisplay({ value }: { value: number }) {
    if (!value) return <span className="text-sm font-medium text-gray-900">-</span>;
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => {
                const isFullFilled = value >= star;
                const isHalfFilled = !isFullFilled && value >= star - 0.5;
                return (
                    <div key={star} className="relative h-4 w-4">
                        <Star className="h-4 w-4 fill-none text-gray-300" />
                        {isHalfFilled && (
                            <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            </div>
                        )}
                        {isFullFilled && (
                            <div className="absolute inset-0">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            </div>
                        )}
                    </div>
                );
            })}
            <span className="ml-1 text-xs text-gray-500">{value}/5</span>
        </div>
    );
}
export default function View({ feedback }: ViewInterviewFeedbackProps) {
    const { t } = useTranslation();
    const getRecommendationClass = (recommendation: string) => {
        switch (recommendation) {
            case 'Strong Hire': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            case 'Hire': return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20';
            case 'Maybe': return 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20';
            case 'Reject': return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10';
            case 'Strong Reject': return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10';
            default: return 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10';
        }
    };
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Interview Feedback Details')}</DialogTitle>
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
                            {feedback.interview?.candidate ? `${feedback.interview.candidate.first_name} ${feedback.interview.candidate.last_name}` : '-'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            {t('Job')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{feedback.interview?.job?.title || '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {t('Round')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{feedback.interview?.round?.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Interviewer')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {feedback.interviewers?.length ? feedback.interviewers.map((i: any) => i.name).join(', ') : '-'}
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            {t('Technical Rating')}
                        </label>
                        <div className="mt-1"><StarDisplay value={feedback.technical_rating} /></div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            {t('Communication Rating')}
                        </label>
                        <div className="mt-1"><StarDisplay value={feedback.communication_rating} /></div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            {t('Cultural Fit Rating')}
                        </label>
                        <div className="mt-1"><StarDisplay value={feedback.cultural_fit_rating} /></div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            {t('Overall Rating')}
                        </label>
                        <div className="mt-1"><StarDisplay value={feedback.overall_rating} /></div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Recommendation')}
                        </label>
                        <p className="mt-1">
                            {feedback.recommendation ? (
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getRecommendationClass(feedback.recommendation)}`}>
                                    {t(feedback.recommendation)}
                                </span>
                            ) : '-'}
                        </p>
                    </div>
                </div>
                {feedback.strengths && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <ThumbsUp className="h-4 w-4" />
                            {t('Strengths')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{feedback.strengths}</p>
                    </div>
                )}
                {feedback.weaknesses && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <ThumbsDown className="h-4 w-4" />
                            {t('Weaknesses')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{feedback.weaknesses}</p>
                    </div>
                )}
                {feedback.comments && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            {t('Comments')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{feedback.comments}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
