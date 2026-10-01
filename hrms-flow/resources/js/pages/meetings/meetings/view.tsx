import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { CalendarDays, Clock, User, MapPin, RefreshCw, FileText } from 'lucide-react';
interface ViewMeetingProps {
    meeting: any;
}
export default function View({ meeting }: ViewMeetingProps) {
    const { t } = useTranslation();
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Scheduled': return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20';
            case 'In Progress': return 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20';
            case 'Completed': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            case 'Cancelled': return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10';
            default: return 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10';
        }
    };
    const getRecurrenceClass = (recurrence: string) => {
        if (recurrence === 'None') return 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10';
        return 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20';
    };
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Meeting Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            {t('Meeting Title')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{meeting.title || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Meeting Type')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{meeting.type?.name || '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            {t('Meeting Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {meeting.meeting_date ? (window.appSettings?.formatDateTimeSimple(meeting.meeting_date, false) || meeting.meeting_date) : '-'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {t('Time')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {meeting.start_time && meeting.end_time
                                ? `${window.appSettings?.formatTime(meeting.start_time) || meeting.start_time} - ${window.appSettings?.formatTime(meeting.end_time) || meeting.end_time}`
                                : '-'}
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Organizer')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{meeting.organizer?.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {t('Room')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{meeting.room?.name || '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getStatusClass(meeting.status)}`}>
                                {t(meeting.status) || '-'}
                            </span>
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            {t('Recurrence')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getRecurrenceClass(meeting.recurrence)}`}>
                                {t(meeting.recurrence) || '-'}
                            </span>
                        </p>
                    </div>
                </div>
                {meeting.agenda && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Agenda')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{meeting.agenda}</p>
                    </div>
                )}
                {meeting.description && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Description')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{meeting.description}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
