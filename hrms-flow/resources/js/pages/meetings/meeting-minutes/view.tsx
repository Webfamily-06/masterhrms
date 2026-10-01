import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { FileText, CalendarDays, User, Clock, MessageSquare, CheckSquare, StickyNote, Gavel } from 'lucide-react';
interface ViewMeetingMinuteProps {
    minute: any;
}
export default function View({ minute }: ViewMeetingMinuteProps) {
    const { t } = useTranslation();
    const getTypeClass = (type: string) => {
        switch (type) {
            case 'Discussion': return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20';
            case 'Decision': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            case 'Action Item': return 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20';
            case 'Note': return 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20';
        }
    };
    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'Discussion': return <MessageSquare className="h-3 w-3" />;
            case 'Decision': return <Gavel className="h-3 w-3" />;
            case 'Action Item': return <CheckSquare className="h-3 w-3" />;
            case 'Note': return <StickyNote className="h-3 w-3" />;
            default: return <FileText className="h-3 w-3" />;
        }
    };
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Meeting Minute Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Topic')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{minute.topic || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Type')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${getTypeClass(minute.type)}`}>
                                {t(minute.type) || '-'}
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
                        <p className="mt-1 text-sm font-medium text-gray-900">{minute.meeting?.title || '-'}</p>
                        {minute.meeting?.meeting_date && (
                            <p className="text-xs text-gray-500">{window.appSettings?.formatDateTimeSimple(minute.meeting.meeting_date, false) || minute.meeting.meeting_date}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Recorded By')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{minute.recorder?.name || '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {t('Recorded At')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {minute.recorded_at ? (window.appSettings?.formatDateTimeSimple(minute.recorded_at, false) || minute.recorded_at) : '-'}
                        </p>
                    </div>
                </div>
                {minute.content && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Content')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{minute.content}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
