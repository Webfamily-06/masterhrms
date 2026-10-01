import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { User, Mail, BookOpen, Calendar, MessageSquare, Tag } from 'lucide-react';

interface ViewProps {
    record: any;
}

const STATUS_COLORS: Record<string, string> = {
    'New':       'bg-blue-50 text-blue-700 ring-blue-700/10',
    'Contacted': 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
    'Qualified': 'bg-green-50 text-green-700 ring-green-600/20',
    'Converted': 'bg-purple-50 text-purple-700 ring-purple-700/10',
    'Closed':    'bg-gray-50 text-gray-700 ring-gray-600/20',
};

export default function View({ record }: ViewProps) {
    const { t } = useTranslation();

    const status = record.status || 'New';

    return (
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Contact Details')}</DialogTitle>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Name & Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Name')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {t('Email')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.email || '-'}</p>
                    </div>
                </div>

                {/* Subject */}
                <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        {t('Subject')}
                    </label>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.subject || '-'}</p>
                </div>

                {/* Status & Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_COLORS[status] || 'bg-gray-50 text-gray-700 ring-gray-600/20'}`}>
                                {status}
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {record.created_at
                                ? (window.appSettings?.formatDateTimeSimple(record.created_at, true) || new Date(record.created_at).toLocaleString())
                                : '-'}
                        </p>
                    </div>
                </div>

                {/* Message */}
                <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        {t('Message')}
                    </label>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {record.message || '-'}
                    </p>
                </div>
            </div>
        </DialogContent>
    );
}
