import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { Users, User, CalendarDays, CheckCircle, XCircle, Clock, AlertCircle, FileText } from 'lucide-react';
interface ViewMeetingAttendeeProps {
    attendee: any;
}
export default function View({ attendee }: ViewMeetingAttendeeProps) {
    const { t } = useTranslation();
    const getRsvpClass = (status: string) => {
        switch (status) {
            case 'Accepted': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            case 'Declined': return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10';
            case 'Tentative': return 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20';
            case 'Pending': return 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20';
            default: return 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10';
        }
    };
    const getRsvpIcon = (status: string) => {
        switch (status) {
            case 'Accepted': return <CheckCircle className="h-3 w-3" />;
            case 'Declined': return <XCircle className="h-3 w-3" />;
            case 'Tentative': return <AlertCircle className="h-3 w-3" />;
            default: return <Clock className="h-3 w-3" />;
        }
    };
    const getAttendanceClass = (status: string) => {
        switch (status) {
            case 'Present': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            case 'Late': return 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20';
            case 'Left Early': return 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20';
            case 'Not Attended': return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10';
            default: return 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10';
        }
    };
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Users className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Meeting Attendee Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Attendee')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{attendee.user?.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Attendance Type')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${attendee.type === 'Required' ? 'bg-red-50 text-red-700 ring-red-600/10' : 'bg-blue-50 text-blue-700 ring-blue-600/20'}`}>
                                {t(attendee.type) || '-'}
                            </span>
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            {t('Meeting')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{attendee.meeting?.title || '-'}</p>
                        {attendee.meeting?.meeting_date && (
                            <p className="text-xs text-gray-500">{window.appSettings?.formatDateTimeSimple(attendee.meeting.meeting_date, false) || attendee.meeting.meeting_date}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {t('RSVP Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {attendee.rsvp_date ? (window.appSettings?.formatDateTimeSimple(attendee.rsvp_date, false) || attendee.rsvp_date) : '-'}
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            {t('RSVP Status')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${getRsvpClass(attendee.rsvp_status)}`}>
                                {t(attendee.rsvp_status) || '-'}
                            </span>
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {t('Attendance')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getAttendanceClass(attendee.attendance_status)}`}>
                                {t(attendee.attendance_status) || '-'}
                            </span>
                        </p>
                    </div>
                </div>
                {attendee.decline_reason && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Decline Reason')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{attendee.decline_reason}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
