import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { LogOut, User, Calendar, Clock, FileText, Eye } from 'lucide-react';
import { useInitials } from '@/hooks/use-initials';
import { getImagePath } from '@/utils/helpers';
interface ViewResignationProps {
    resignation: any;
}
export default function View({ resignation }: ViewResignationProps) {
    const { t } = useTranslation();
    const getInitials = useInitials();
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            case 'rejected': return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20';
            case 'completed': return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20';
            default: return 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20';
        }
    };
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <LogOut className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Resignation Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Employee Info */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white overflow-hidden shrink-0">
                            {resignation.employee?.avatar ? (
                                <img src={resignation.employee.avatar} alt={resignation.employee?.name} className="h-full w-full object-cover" />
                            ) : (
                                getInitials(resignation.employee?.name || '')
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">{t('Employee')}</p>
                            <p className="text-sm font-semibold text-gray-900">{resignation.employee?.name || '-'}</p>
                        </div>
                    </div>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ${getStatusClass(resignation.status)}`}>
                        {resignation.status || '-'}
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Resignation Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{resignation.resignation_date ? (window.appSettings?.formatDateTimeSimple(resignation.resignation_date, false) || resignation.resignation_date) : '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Last Working Day')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{resignation.last_working_day ? (window.appSettings?.formatDateTimeSimple(resignation.last_working_day, false) || resignation.last_working_day) : '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {t('Notice Period')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{resignation.notice_period || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Reason')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{resignation.reason || '-'}</p>
                    </div>
                </div>
                {resignation.documents && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                {t('Documents')}
                            </label>
                            <a href={getImagePath(resignation.documents)} target="_blank" rel="noreferrer" className="mt-2 group block relative overflow-hidden rounded-lg border bg-gray-50 hover:border-primary transition-colors">
                                <img
                                    src={getImagePath(resignation.documents)}
                                    alt={t('Document')}
                                    className="w-full h-36 object-cover group-hover:opacity-90 transition-opacity"
                                    onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                                    <Eye className="h-6 w-6 text-white" />
                                </div>
                            </a>
                        </div>
                    </div>
                )}
                {resignation.description && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Description')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{resignation.description}</p>
                    </div>
                )}
                {resignation.exit_feedback && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Exit Feedback')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{resignation.exit_feedback}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
