import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { CalendarCheck, User, Briefcase, Users, Clock, MapPin, Link, FileText } from 'lucide-react';
interface ViewInterviewProps {
    interview: any;
}
export default function View({ interview }: ViewInterviewProps) {
    const { t } = useTranslation();
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Scheduled': return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20';
            case 'Completed': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            case 'Cancelled': return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10';
            case 'No-show': return 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20';
            default: return 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10';
        }
    };
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <CalendarCheck className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Interview Details')}</DialogTitle>
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
                            {interview.candidate ? `${interview.candidate.first_name} ${interview.candidate.last_name}` : '-'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            {t('Job')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{interview.job?.title || '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {t('Round')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{interview.round?.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Interview Type')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{interview.interview_type?.name || '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <CalendarCheck className="h-4 w-4" />
                            {t('Date & Time')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {interview.scheduled_date ? (window.appSettings?.formatDateTimeSimple(interview.scheduled_date, false) || interview.scheduled_date) : '-'}
                            {interview.scheduled_time && <span className="ml-2 text-gray-500">{window.appSettings?.formatTime(interview.scheduled_time) || interview.scheduled_time}</span>}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {t('Duration')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{interview.duration ? `${interview.duration} ${t('min')}` : '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getStatusClass(interview.status)}`}>
                                {t(interview.status) || '-'}
                            </span>
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Feedback')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${interview.feedback_submitted ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'}`}>
                                {interview.feedback_submitted ? t('Submitted') : t('Pending')}
                            </span>
                        </p>
                    </div>
                </div>
                {interview.meeting_link ? (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Link className="h-4 w-4" />
                            {t('Meeting Link')}
                        </label>
                        <a href={interview.meeting_link} target="_blank" rel="noreferrer" className="mt-1 text-sm font-medium text-blue-600 hover:underline block">
                            {interview.meeting_link}
                        </a>
                    </div>
                ) : interview.location ? (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {t('Location')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{interview.location}</p>
                    </div>
                ) : null}
            </div>
        </DialogContent>
    );
}
