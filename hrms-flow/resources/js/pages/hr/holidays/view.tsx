import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { CalendarDays, Tag, Calendar, FileText, GitBranch } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
interface ViewHolidayProps {
    holiday: any;
}
export default function View({ holiday }: ViewHolidayProps) {
    const { t } = useTranslation();
    const getCategoryClass = (category: string) => {
        switch (category) {
            case 'national': return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20';
            case 'religious': return 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20';
            case 'company-specific': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            case 'regional': return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20';
            default: return 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20';
        }
    };
    const isMultiDay = holiday.end_date && holiday.start_date !== holiday.end_date;
    const dayCount = isMultiDay ? differenceInDays(new Date(holiday.end_date), new Date(holiday.start_date)) + 1 : 1;
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Holiday Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            {t('Holiday Name')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{holiday.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Category')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ${getCategoryClass(holiday.category)}`}>
                                {holiday.category || '-'}
                            </span>
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Start Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{holiday.start_date ? (window.appSettings?.formatDateTimeSimple(holiday.start_date, false) || holiday.start_date) : '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('End Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {isMultiDay ? (window.appSettings?.formatDateTimeSimple(holiday.end_date, false) || holiday.end_date) : '-'}
                            {isMultiDay && <span className="ml-2 text-xs text-gray-500">({dayCount} {t('days')})</span>}
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Type')}
                        </label>
                        <div className="mt-1 flex flex-wrap gap-1">
                            {holiday.is_recurring && (
                                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50">{t('Recurring')}</Badge>
                            )}
                            {holiday.is_half_day && (
                                <Badge variant="secondary" className="bg-orange-50 text-orange-700 hover:bg-orange-50">{t('Half Day')}</Badge>
                            )}
                            <Badge variant="secondary" className={holiday.is_paid ? 'bg-green-50 text-green-700 hover:bg-green-50' : 'bg-red-50 text-red-700 hover:bg-red-50'}>
                                {holiday.is_paid ? t('Paid') : t('Unpaid')}
                            </Badge>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <GitBranch className="h-4 w-4" />
                            {t('Branches')}
                        </label>
                        <div className="mt-1 flex flex-wrap gap-1">
                            {holiday.branches?.length > 0 ? holiday.branches.map((branch: any) => (
                                <Badge key={branch.id} variant="outline">{branch.name}</Badge>
                            )) : <p className="text-sm font-medium text-gray-900">-</p>}
                        </div>
                    </div>
                </div>
                {holiday.description && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Description')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{holiday.description}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
